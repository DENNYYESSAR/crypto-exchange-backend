const CryptocurrencySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  symbol: { type: String, required: true, unique: true },
  currentPrice: { type: Number, required: true },
  availableSupply: { type: Number, required: true },
  description: { type: String },
  imageUrl: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const Cryptocurrency = mongoose.model('Cryptocurrency', CryptocurrencySchema);
