// middlewares/auth.middleware.js

const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

/**
 * Middleware xác thực JWT.
 * Gắn req.user cho các route được bảo vệ.
 */
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token — vui lòng đăng nhập' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Người dùng không tồn tại' });
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

/** Chỉ cho admin */
const requireAdmin = [auth, (req, res, next) => {
  if (req.user?.vai_tro !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền thực hiện hành động này' });
  }
  next();
}];

/** Admin hoặc manager */
const requireManagerOrAdmin = [auth, (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user?.vai_tro)) {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
}];

// Export default (giữ tương thích với code cũ) + named exports
module.exports = auth;
module.exports.auth                  = auth;
module.exports.requireAdmin          = requireAdmin;
module.exports.requireManagerOrAdmin = requireManagerOrAdmin;
