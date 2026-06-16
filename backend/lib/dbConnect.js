// backend/lib/dbConnect.js
// Mongoose connection singleton for serverless and Express

const { connectMongo } = require('./mongoConnection');

async function dbConnect() {
  return connectMongo();
}

module.exports = dbConnect;
