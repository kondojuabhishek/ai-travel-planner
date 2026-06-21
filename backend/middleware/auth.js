const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Expect header format: "Authorization: Bearer <token>"
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // now any route using this middleware can access req.user.id
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};