// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Test route
app.get('/', (req, res) => {
  res.send('Aura backend is running!');
});

// Placeholder for AI scoring
app.post('/analyze', (req, res) => {
  const { input } = req.body;
  res.json({
    score: Math.floor(Math.random() * 20001) - 10000,
    reason: "This is just a placeholder funny reason!"
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
