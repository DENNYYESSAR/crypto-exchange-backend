// Buy cryptocurrency
app.post('/api/transactions/buy', auth, async (req, res) => {
  try {
    const { cryptoId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid amount' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const cryptocurrency = await Cryptocurrency.findById(cryptoId);
    if (!cryptocurrency) {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    
    const totalCost = amount * cryptocurrency.currentPrice;
    
    // Check if user has enough balance
    if (user.wallet.balance < totalCost) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }
    
    // Check if there's enough supply
    if (cryptocurrency.availableSupply < amount) {
      return res.status(400).json({ msg: 'Insufficient cryptocurrency supply' });
    }
    
    // Create transaction record
    const transaction = new Transaction({
      userId: user.id,
      cryptoId: cryptocurrency.id,
      type: 'buy',
      amount,
      price: cryptocurrency.currentPrice
    });
    
    await transaction.save();
    
    // Update user's wallet
    user.wallet.balance -= totalCost;
    
    const cryptoHoldingIndex = user.wallet.cryptoHoldings.findIndex(holding => 
      holding.cryptoId.toString() === cryptoId
    );
    
    if (cryptoHoldingIndex !== -1) {
      user.wallet.cryptoHoldings[cryptoHoldingIndex].amount += amount;
    } else {
      user.wallet.cryptoHoldings.push({
        cryptoId,
        amount
      });
    }
    
    await user.save();
    
    // Update cryptocurrency supply
    cryptocurrency.availableSupply -= amount;
    await cryptocurrency.save();
    
    res.json({
      transaction,
      wallet: user.wallet,
      cryptocurrency
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Sell cryptocurrency
app.post('/api/transactions/sell', auth, async (req, res) => {
  try {
    const { cryptoId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid amount' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const cryptocurrency = await Cryptocurrency.findById(cryptoId);
    if (!cryptocurrency) {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    
    // Check if user has enough of the cryptocurrency
    const cryptoHoldingIndex = user.wallet.cryptoHoldings.findIndex(holding => 
      holding.cryptoId.toString() === cryptoId
    );
    
    if (cryptoHoldingIndex === -1 || user.wallet.cryptoHoldings[cryptoHoldingIndex].amount < amount) {
      return res.status(400).json({ msg: 'Insufficient cryptocurrency balance' });
    }
    
    const totalEarnings = amount * cryptocurrency.currentPrice;
    
    // Create transaction record
    const transaction = new Transaction({
      userId: user.id,
      cryptoId: cryptocurrency.id,
      type: 'sell',
      amount,
      price: cryptocurrency.currentPrice
    });
    
    await transaction.save();
    
    // Update user's wallet
    user.wallet.balance += totalEarnings;
    user.wallet.cryptoHoldings[cryptoHoldingIndex].amount -= amount;
    
    // Remove holding if amount is zero
    if (user.wallet.cryptoHoldings[cryptoHoldingIndex].amount === 0) {
      user.wallet.cryptoHoldings.splice(cryptoHoldingIndex, 1);
    }
    
    await user.save();
    
    // Update cryptocurrency supply
    cryptocurrency.availableSupply += amount;
    await cryptocurrency.save();
    
    res.json({
      transaction,
      wallet: user.wallet,
      cryptocurrency
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user transactions
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('cryptoId', 'name symbol')
      .sort({ timestamp: -1 });
    
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});
