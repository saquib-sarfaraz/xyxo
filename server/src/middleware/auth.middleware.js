import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Access token required',
      error: 'NoTokenProvided' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired',
          error: 'TokenExpiredError'
        });
      }
      console.error('[AUTH] Token verification error:', err);
      return res.status(401).json({ 
        message: 'Invalid token',
        error: err.message
      });
    }
    // Provide .id for backward compatibility with existing controllers
    req.user = {
      id: decoded.sub,
      ...decoded
    };
    next();
  });
};