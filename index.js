const express = require("express");
const connectToMongo = require("./db");
let isClickerRunning = false;

const app = express();
app.use(express.json());
const PORT = 3000;

// Import the click function
const { clicker } = require("./clicker");

app.use(express.static("public"));
app.use(express.json());
app.use('/api/analytics', require('./routes/analytics'));

app.post('/start-clicker', (req, res) => {
  if(isClickerRunning) return res.json({ success: false, message: 'Clicker is already running' });

  const {searchTerm, searchEngine, target} = req.query;
  // check if the cliker is already running
  try {
    const result = clicker({searchTerm, searchEngine, target});
    isClickerRunning = result.success;
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start clicker', error: error.message });
  }
});

app.post('/stop-clicker', (req, res) => {
  process.emit('stopLoop');
  res.json({ success: true, message: 'Stop signal sent to clicker' });
});

app.get('/clicker-status', (req, res) => {
  res.json({isClickerRunning });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
connectToMongo();

process.on('loopStopped', () => {
  isClickerRunning = false;
});