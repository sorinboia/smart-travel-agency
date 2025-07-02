module.exports = {
  secret: process.env.JWT_SECRET,
  sign: { expiresIn: '1h' }
};