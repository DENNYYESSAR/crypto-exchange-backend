const User = require('../models/User');
const UserWallet = require('../models/UserWallet');
const CryptoTransaction = require('../models/CryptoTransaction');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, phone, address, country } = req.body;

  // Build profile object
  const profileFields = {};
  if (name) profileFields.name = name;
  if (email) profileFields.email = email;
  if (phone) profileFields.phone = phone;
  if (address) profileFields.address = address;
  if (country) profileFields.country = country;

  try {
    // Check if email is already in use
    if (email) {
      const emailUser = await User.findOne({ email });
      if (emailUser && emailUser._id.toString() !== req.user.id) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
    }
    
    // Update user
    let user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: profileFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    // Get user
    const user = await User.findById(req.user.id);
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update account settings
// @route   PUT /api/users/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  const { emailNotifications, twoFactorAuth, defaultCurrency } = req.body;

  // Build settings object
  const settingsFields = {};
  if (emailNotifications !== undefined) settingsFields['settings.emailNotifications'] = emailNotifications;
  if (twoFactorAuth !== undefined) settingsFields['settings.twoFactorAuth'] = twoFactorAuth;
  if (defaultCurrency) settingsFields['settings.defaultCurrency'] = defaultCurrency;

  try {
    // Update user settings
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: settingsFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get user account summary
// @route   GET /api/users/summary
// @access  Private
exports.getAccountSummary = async (req, res) => {
  try {
    // Get user
    const user = await User.findById(req.user.id).select('-password');
    
    // Get wallets
    const wallets = await UserWallet.find({ user: req.user.id });
    
    // Get recent transactions
    const recentTransactions = await CryptoTransaction.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(5);
      
    // Get transaction counts
    const transactionCounts = await CryptoTransaction.aggregate([
      { $match: { user: req.user.id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Format transaction counts
    const counts = {};
    transactionCounts.forEach(item => {
      counts[item._id] = item.count;
    });
    
    res.json({
      user,
      walletCount: wallets.length,
      recentTransactions,
      transactionCounts: counts
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete user account
// @route   DELETE /api/users
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    // Check if user has any wallets with balance
    const wallets = await UserWallet.find({ user: req.user.id });
    
    if (wallets.length > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete account with active crypto wallets. Please sell all assets first.' 
      });
    }
    
    // Delete user transactions
    await CryptoTransaction.deleteMany({ user: req.user.id });
    
    // Delete user wallets (should be empty based on check above)
    await UserWallet.deleteMany({ user: req.user.id });
    
    // Delete user
    await User.findByIdAndDelete(req.user.id);
    
    res.json({ msg: 'User account deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
