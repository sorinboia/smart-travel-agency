export default {
  secret: process.env.JWT_SECRET,
  sign: { expiresIn: '1h' }
};