export default {
  forceClose: true,
  url:
    process.env.MONGODB_URI ||
    'mongodb://admin:admin@localhost:30427/sta?authSource=admin',
  database: process.env.MONGODB_DB || 'sta',
};