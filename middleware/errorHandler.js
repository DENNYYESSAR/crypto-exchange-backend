/**
 * Global error handling middleware
 * Logs errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  
  // Different error types handling
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.errors
      }
    });
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    // Duplicate key error
    return res.status(400).json({
      error: {
        message: 'Duplicate field value entered',
        field: err.keyValue
      }
    });
  }
  
  if (err.name === 'CastError') {
    // Invalid MongoDB ObjectId
    return res.status(400).json({
      error: {
        message: 'Resource not found',
        details: `Invalid ${err.path}: ${err.value}`
      }
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    // JWT validation error
    return res.status(401).json({
      error: {
        message: 'Invalid token',
        details: err.message
      }
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    // JWT expiration error
    return res.status(401).json({
      error: {
        message: 'Token expired',
        details: 'Please log in again'
      }
    });
  }
  
  // For API errors from external services
  if (err.response) {
    return res.status(err.response.status || 500).json({
      error: {
        message: 'External API Error',
        details: err.response.data
      }
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    error: {
      message: 'Server Error',
      details: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    }
  });
};

module.exports = errorHandler;
