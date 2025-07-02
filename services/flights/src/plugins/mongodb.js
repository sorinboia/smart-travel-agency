module.exports = {
  forceClose: true,
  url: process.env.MONGODB_URI,
  database: process.env.MONGODB_DB || 'sta'
};