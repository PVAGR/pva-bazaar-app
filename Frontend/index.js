// Example of proper port configuration for Vercel
const express = require('express');
const app = express();

// Your middleware and routes setup

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});