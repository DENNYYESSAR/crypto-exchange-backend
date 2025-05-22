// Get all cryptocurrencies
app.get('/api/cryptocurrencies', async (req, res) => {
  try {
    const cryptocurrencies = await Cryptocurrency.find();
    res.json(cryptocurrencies);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a single cryptocurrency
app.get('/api/cryptocurrencies/:id', async (req, res) => {
  try {
    const cryptocurrency = await Cryptocurrency.findById(req.params.id);
    if (!cryptocurrency) {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    res.json(cryptocurrency);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    res.status(500).send('Server error');
  }
});

// Admin: Create a cryptocurrency
app.post('/api/cryptocurrencies', [auth, adminAuth], async (req, res) => {
  try {
    const { name, symbol, currentPrice, availableSupply, description, imageUrl } = req.body;
    
    const cryptocurrency = new Cryptocurrency({
      name,
      symbol,
      currentPrice,
      availableSupply,
      description,
      imageUrl
    });
    
    await cryptocurrency.save();
    res.json(cryptocurrency);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin: Update cryptocurrency price
app.put('/api/cryptocurrencies/:id/price', [auth, adminAuth], async (req, res) => {
  try {
    const { currentPrice } = req.body;
    
    const cryptocurrency = await Cryptocurrency.findById(req.params.id);
    if (!cryptocurrency) {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    
    cryptocurrency.currentPrice = currentPrice;
    cryptocurrency.lastUpdated = Date.now();
    
    await cryptocurrency.save();
    res.json(cryptocurrency);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    res.status(500).send('Server error');
  }
});

// Admin: Update cryptocurrency info
app.put('/api/cryptocurrencies/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { name, symbol, currentPrice, availableSupply, description, imageUrl } = req.body;
    
    const cryptocurrency = await Cryptocurrency.findById(req.params.id);
    if (!cryptocurrency) {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    
    if (name) cryptocurrency.name = name;
    if (symbol) cryptocurrency.symbol = symbol;
    if (currentPrice) cryptocurrency.currentPrice = currentPrice;
    if (availableSupply) cryptocurrency.availableSupply = availableSupply;
    if (description) cryptocurrency.description = description;
    if (imageUrl) cryptocurrency.imageUrl = imageUrl;
    
    cryptocurrency.lastUpdated = Date.now();
    
    await cryptocurrency.save();
    res.json(cryptocurrency);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Cryptocurrency not found' });
    }
    res.status(500).send('Server error');
  }
});
