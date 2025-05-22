const { check, validationResult } = require('express-validator');

/**
 * Validation rules for various endpoints
 */
const validators = {
  // User registration validation
  registerValidation: [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],

  // Login validation
  loginValidation: [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],

  // Profile update validation
  profileValidation: [
    check('name', 'Name cannot be empty').optional().not().isEmpty(),
    check('email', 'Please include a valid email').optional().isEmail(),
    check('phone', 'Please provide a valid phone number').optional().isMobilePhone()
  ],

  // Password change validation
  passwordValidation: [
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => value === req.body.newPassword)
  ],

  // Crypto purchase validation
  cryptoPurchaseValidation: [
    check('symbol', 'Cryptocurrency symbol is required').not().isEmpty(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.000001 }),
    check('paymentMethod', 'Payment method is required').isIn(['credit_card', 'bank_transfer', 'balance'])
  ],

  // Crypto sell validation
  cryptoSellValidation: [
    check('symbol', 'Cryptocurrency symbol is required').not().isEmpty(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.000001 })
  ],

  // Deposit validation
  depositValidation: [
    check('amount', 'Amount must be a positive number').isFloat({ min: 1 }),
    check('paymentMethod', 'Payment method is required').isIn(['credit_card', 'bank_transfer', 'paypal'])
  ],

  // Withdrawal validation
  withdrawValidation: [
    check('amount', 'Amount must be a positive number').isFloat({ min: 1 }),
    check('withdrawMethod', 'Withdrawal method is required').isIn(['bank_transfer', 'paypal', 'crypto']),
    check('accountDetails', 'Account details are required').not().isEmpty()
  ],

  // Reset password validation
  resetPasswordValidation: [
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('confirmPassword', 'Passwords do not match').custom((value, { req }) => value === req.body.password)
  ],

  // Email validation
  emailValidation: [
    check('email', 'Please include a valid email').isEmail()
  ],

  // Two-factor authentication validation
  twoFactorValidation: [
    check('code', 'Please enter a valid 6-digit code').isLength({ min: 6, max: 6 }).isNumeric()
  ]
};

/**
 * Helper function to validate request
 * Returns any validation errors or null if validation passes
 */
const validateRequest = (req) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array();
};

/**
 * Helper function to sanitize error messages
 * Removes any sensitive information from error messages
 */
const sanitizeErrors = (errors) => {
  if (!errors) return null;
  
  return errors.map(error => {
    // Remove any potential sensitive data from error messages
    return {
      param: error.param,
      msg: error.msg
    };
  });
};

/**
 * Helper function to validate cryptocurrency amounts
 * Ensures amount is within valid range for the specific cryptocurrency
 */
const validateCryptoAmount = (symbol, amount) => {
  // Different cryptos have different minimum amounts
  const minimums = {
    'BTC': 0.00001,
    'ETH': 0.0001,
    'XRP': 1,
    'ADA': 1,
    'DOGE': 1,
    // Add more cryptocurrencies as needed
    'DEFAULT': 0.000001
  };
  
  const minAmount = minimums[symbol] || minimums.DEFAULT;
  
  return amount >= minAmount;
};

/**
 * Helper function to validate wallet addresses for various cryptocurrencies
 */
const validateWalletAddress = (symbol, address) => {
  // Basic validation patterns for common cryptocurrencies
  const patterns = {
    'BTC': /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{39,59}$/,
    'ETH': /^0x[a-fA-F0-9]{40}$/,
    'XRP': /^r[0-9a-zA-Z]{24,34}$/,
    'LTC': /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    'BCH': /^[qp][a-z0-9]{41}$/,
    'DOGE': /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/
    // Add more as needed
  };
  
  // If we don't have a specific pattern, return true
  if (!patterns[symbol]) return true;
  
  return patterns[symbol].test(address);
};

/**
 * Helper function to validate transaction inputs
 * Ensures transaction details are valid and meet security requirements
 */
const validateTransaction = (transactionDetails) => {
  const { type, amount, symbol, address } = transactionDetails;
  
  // Validate transaction type
  if (!['buy', 'sell', 'transfer', 'deposit', 'withdraw'].includes(type)) {
    return { valid: false, error: 'Invalid transaction type' };
  }
  
  // Validate amount
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  // Additional validations for crypto transactions
  if (['buy', 'sell', 'transfer'].includes(type) && symbol) {
    // Validate crypto amount
    if (!validateCryptoAmount(symbol, amount)) {
      return { 
        valid: false, 
        error: `Amount is below minimum for ${symbol}` 
      };
    }
    
    // Validate wallet address for transfers
    if (type === 'transfer' && address && !validateWalletAddress(symbol, address)) {
      return { 
        valid: false, 
        error: `Invalid ${symbol} wallet address` 
      };
    }
  }
  
  return { valid: true };
};

module.exports = {
  validators,
  validateRequest,
  sanitizeErrors,
  validateCryptoAmount,
  validateWalletAddress,
  validateTransaction
};
