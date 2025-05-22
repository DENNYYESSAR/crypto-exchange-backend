const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

/**
 * Admin authentication middleware
 * Verifies JWT token and checks admin role
 */
module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.get('jwtSecret'));

    // Check if user exists and is an admin
    const user = await User.findById(decoded.user.id);
    
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin privileges required' });
    }

    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    
    console.error('Admin auth error:', err.message);
    res.status(500).send('Server Error');
  }
};
