const axios = require('axios');
const config = require('config');
const User = require('../models/User');
const UserWallet = require('../models/UserWallet');
const CryptoTransaction = require('../models/CryptoTransaction');

// @desc    Get crypto market data
// @route   GET /api/crypto/market
// @access  Public
exports.getMarketData = async (req, res) => {
  try {
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.get('apiKeys.coinMarketCap'),
        },
        params: {
          start: 1,
          limit: 100,
          convert: 'USD',
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get crypto coin details
// @route   GET /api/crypto/coin/:symbol
// @access  Public
exports.getCoinDetails = async (req, res) => {
  try {
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.get('apiKeys.coinMarketCap'),
        },
        params: {
          symbol: req.params.symbol.toUpperCase(),
          convert: 'USD',
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user crypto portfolio
// @route   GET /api/crypto/portfolio
// @access  Private
exports.getUserPortfolio = async (req, res) => {
  try {
    const userWallets = await UserWallet.find({ user: req.user.id });
    
    if (!userWallets.length) {
      return res.json({ portfolio: [] });
    }

    // Get current prices for all coins in wallet
    const symbols = userWallets.map(wallet => wallet.symbol).join(',');
    
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.get('apiKeys.coinMarketCap'),
        },
        params: {
          symbol: symbols,
          convert: 'USD',
        },
      }
    );

    // Calculate portfolio value
    const portfolio = userWallets.map(wallet => {
      const coinData = response.data.data[wallet.symbol];
      const currentPrice = coinData.quote.USD.price;
      const value = wallet.amount * currentPrice;
      
      return {
        coin: wallet.symbol,
        name: coinData.name,
        amount: wallet.amount,
        currentPrice,
        value,
        purchaseValue: wallet.purchaseValue,
        profit: value - wallet.purchaseValue,
        profitPercentage: ((value - wallet.purchaseValue) / wallet.purchaseValue) * 100
      };
    });

    res.json({ portfolio });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Buy cryptocurrency
// @route   POST /api/crypto/buy
// @access  Private
exports.buyCrypto = async (req, res) => {
  try {
    const { symbol, amount, paymentMethod } = req.body;
    
    // Get current price
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.get('apiKeys.coinMarketCap'),
        },
        params: {
          symbol: symbol.toUpperCase(),
          convert: 'USD',
        },
      }
    );
    
    const coinData = response.data.data[symbol.toUpperCase()];
    const price = coinData.quote.USD.price;
    const totalCost = price * amount;
    
    // Get user
    const user = await User.findById(req.user.id);
    
    // Check if user has enough balance (if using account balance)
    if (paymentMethod === 'balance' && user.accountBalance < totalCost) {
      return res.status(400).json({ msg: 'Insufficient funds' });
    }
    
    // Update user wallet
    let wallet = await UserWallet.findOne({ 
      user: req.user.id,
      symbol: symbol.toUpperCase()
    });
    
    if (wallet) {
      // Update existing wallet
      const newTotalCost = wallet.purchaseValue + totalCost;
      const newTotalAmount = wallet.amount + parseFloat(amount);
      
      wallet.amount = newTotalAmount;
      wallet.purchaseValue = newTotalCost;
      wallet.averagePrice = newTotalCost / newTotalAmount;
    } else {
      // Create new wallet entry
      wallet = new UserWallet({
        user: req.user.id,
        symbol: symbol.toUpperCase(),
        name: coinData.name,
        amount: parseFloat(amount),
        purchaseValue: totalCost,
        averagePrice: price
      });
    }
    
    // If using account balance, update user balance
    if (paymentMethod === 'balance') {
      user.accountBalance -= totalCost;
      await user.save();
    }
    
    // Save wallet
    await wallet.save();
    
    // Create transaction record
    const transaction = new CryptoTransaction({
      user: req.user.id,
      type: 'buy',
      symbol: symbol.toUpperCase(),
      amount: parseFloat(amount),
      price,
      totalValue: totalCost,
      paymentMethod
    });
    
    await transaction.save();
    
    res.json({ 
      msg: 'Purchase successful',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Sell cryptocurrency
// @route   POST /api/crypto/sell
// @access  Private
exports.sellCrypto = async (req, res) => {
  try {
    const { symbol, amount } = req.body;
    
    // Check if user has enough of the coin
    const wallet = await UserWallet.findOne({ 
      user: req.user.id,
      symbol: symbol.toUpperCase()
    });
    
    if (!wallet || wallet.amount < amount) {
      return res.status(400).json({ msg: 'Insufficient crypto balance' });
    }
    
    // Get current price
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': config.get('apiKeys.coinMarketCap'),
        },
        params: {
          symbol: symbol.toUpperCase(),
          convert: 'USD',
        },
      }
    );
    
    const price = response.data.data[symbol.toUpperCase()].quote.USD.price;
    const totalValue = price * amount;
    
    // Update wallet
    wallet.amount -= parseFloat(amount);
    
    // If selling all, calculate realized profit/loss
    if (wallet.amount <= 0) {
      // Remove wallet if amount is 0
      await UserWallet.findByIdAndDelete(wallet._id);
    } else {
      // Update wallet with new amount
      await wallet.save();
    }
    
    // Add to user balance
    const user = await User.findById(req.user.id);
    user.accountBalance += totalValue;
    await user.save();
    
    // Create transaction record
    const transaction = new CryptoTransaction({
      user: req.user.id,
      type: 'sell',
      symbol: symbol.toUpperCase(),
      amount: parseFloat(amount),
      price,
      totalValue
    });
    
    await transaction.save();
    
    res.json({ 
      msg: 'Sale successful',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
