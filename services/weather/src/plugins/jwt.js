export default {
  secret: process.env.JWT_SECRET || 'supersecret',
  sign: { expiresIn: '1d' }
};