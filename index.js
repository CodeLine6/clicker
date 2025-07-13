const express = require("express");
const connectToMongo = require("./db");
const { clicker } = require("./clicker");

const app = express();
const PORT = 3000;
let breakLoop = false;
let isClickerRunning = false;

app.use(express.static("public"));
app.use(express.json());
app.use('/api/analytics', require('./routes/analytics'));
// Endpoint to start the clicker

app.post('/start-clicker', (req, res) => {
  try {
    const result = clicker();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start clicker', error: error.message });
  }
});

// Endpoint to stop the clicker
app.post('/stop-clicker', (req, res) => {
  if (!isClickerRunning) {
    return res.json({ success: false, message: 'No clicker is currently running' });
  }
  
  breakLoop = true;
  res.json({ success: true, message: 'Stop signal sent to clicker' });
});

// Optional: Status endpoint
app.get('/clicker-status', (req, res) => {
  res.json({ 
    isRunning: isClickerRunning,
    breakLoop: breakLoop 
  });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

connectToMongo();