const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role };
  const secret = process.env.JWT_SECRET || 'change_this_secret';
  const expiresIn = process.env.JWT_EXPIRES || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

module.exports = generateToken;
