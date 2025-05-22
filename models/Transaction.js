const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cryptoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cryptocurrency', required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

// Authentication Middleware
const auth = (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwtSecret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (err) {
    res.status(403).json({ msg: 'Forbidden' });
  }
};
