const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  wallet: {
    balance: { type: Number, default: 1000 }, // Starting with $1000 for demo
    cryptoHoldings: [{
      cryptoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cryptocurrency' },
      amount: { type: Number, default: 0 }
    }]
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
