const express = require('express');
const app = express();
const port = 3000;

app.get('/test', (req, res) => {
  res.json({ message: 'Test successful!' });
});

app.listen(port, () => {
  console.log(`Simple test server running on port ${port}`);
});