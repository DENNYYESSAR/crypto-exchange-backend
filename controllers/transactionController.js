const CryptoTransaction = require('../models/CryptoTransaction');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get user's transaction history
// @route   GET /api/transactions
// @access  Private
exports.getUserTransactions = async (req, res) => {
  try {
    const transactions = await CryptoTransaction.find({ user: req.user.id })
      .sort({ date: -1 });
    
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get transaction details
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await CryptoTransaction.findById(req.params.id);
    
    // Check if transaction exists
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    // Check user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Deposit funds to account
// @route   POST /api/transactions/deposit
// @access  Private
exports.depositFunds = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, paymentMethod } = req.body;
    
    // Update user balance
    const user = await User.findById(req.user.id);
    user.accountBalance += parseFloat(amount);
    await user.save();
    
    // Create transaction record
    const transaction = new CryptoTransaction({
      user: req.user.id,
      type: 'deposit',
      amount: parseFloat(amount),
      paymentMethod,
      totalValue: parseFloat(amount)
    });
    
    await transaction.save();
    
    res.json({
      msg: 'Deposit successful',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Withdraw funds from account
// @route   POST /api/transactions/withdraw
// @access  Private
exports.withdrawFunds = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { amount, withdrawMethod, accountDetails } = req.body;
    
    // Get user and check balance
    const user = await User.findById(req.user.id);
    
    if (user.accountBalance < amount) {
      return res.status(400).json({ msg: 'Insufficient funds' });
    }
    
    // Update user balance
    user.accountBalance -= parseFloat(amount);
    await user.save();
    
    // Create transaction record
    const transaction = new CryptoTransaction({
      user: req.user.id,
      type: 'withdraw',
      amount: parseFloat(amount),
      paymentMethod: withdrawMethod,
      details: accountDetails,
      totalValue: parseFloat(amount)
    });
    
    await transaction.save();
    
    res.json({
      msg: 'Withdrawal initiated',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res) => {
  try {
    // Total deposits
    const deposits = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id, type: 'deposit' } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);
    
    // Total withdrawals
    const withdrawals = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id, type: 'withdraw' } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);
    
    // Crypto purchases
    const purchases = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id, type: 'buy' } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);
    
    // Crypto sales
    const sales = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id, type: 'sell' } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);
    
    // Transactions by month
    const monthlyTransactions = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id } },
      {
        $group: {
          _id: { 
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          value: { $sum: '$totalValue' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      totalDeposits: deposits.length > 0 ? deposits[0].total : 0,
      totalWithdrawals: withdrawals.length > 0 ? withdrawals[0].total : 0,
      totalPurchases: purchases.length > 0 ? purchases[0].total : 0,
      totalSales: sales.length > 0 ? sales[0].total : 0,
      monthlyTransactions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
