/**
 * Controller: auth.controller.js — ĐÃ CẬP NHẬT
 * Mô tả: Xử lý các yêu cầu liên quan đến xác thực người dùng (đăng nhập, thông tin cá nhân, đổi mật khẩu)
 * Các chức năng:
 * - POST /api/auth/login: Xác thực người dùng và trả về JWT token
 * - GET /api/auth/me: Lấy thông tin người dùng hiện tại (yêu cầu xác thực)
 * - PUT /api/auth/change-password: Đổi mật khẩu cho người dùng hiện tại (yêu cầu xác thực)
 * Các mô hình liên quan: User
 * Các middleware liên quan: authMiddleware (để bảo vệ các route yêu cầu xác thực)
 * Các thư viện sử dụng: jsonwebtoken (để tạo và xác thực JWT), bcrypt (để mã hóa mật khẩu)
 * Ghi chú: Đảm bảo rằng JWT_SECRET được đặt trong biến môi trường để bảo mật token
 */
const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const User = require('../models/User.model');
const { log } = require('../utils/activityLogger');

const AVATAR_DIR = path.join(__dirname, '../uploads/avatars');
const MAX_AVATAR_BYTES = 1024 * 1024;

function detectAvatarImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return { ext: 'png', mime: 'image/png' };
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

async function removeLocalAvatar(avatarPath) {
  if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarPath);
  const fullPath = path.join(AVATAR_DIR, filename);
  if (!fullPath.startsWith(AVATAR_DIR)) return;
  await fs.unlink(fullPath).catch(() => {});
}

function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    username: user.username,
    ho_ten: user.ho_ten,
    email: user.email,
    vai_tro: user.vai_tro,
    phone: user.phone || '',
    department: user.department || '',
    location: user.location || '',
    timezone: user.timezone || 'GMT+7',
    bio: user.bio || '',
    avatar: user.avatar || '',
    two_factor_enabled: Boolean(user.two_factor_enabled),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await user.matchPassword(password))) {
      await log({ req, action: 'LOGIN_FAIL', meta: { username } });
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }

    if (user.two_factor_enabled) {
      user.two_factor_enabled = false;
      await user.save();
      await log({ req, action: 'DISABLE_UNSUPPORTED_2FA', resource_type: 'User', resource_id: user._id });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await log({ req, action: 'LOGIN_SUCCESS', resource_type: 'User', resource_id: user._id });

    res.json({
      token,
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.me = (req, res) => res.json(publicUser(req.user));

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['ho_ten', 'email', 'phone', 'department', 'location', 'timezone', 'bio'];
    const updates = {};

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (req.body.two_factor_enabled !== undefined) {
      if (Boolean(req.body.two_factor_enabled)) {
        return res.status(400).json({ message: '2FA chua duoc ho tro, khong the bat tuy chon nay' });
      }
      updates.two_factor_enabled = false;
    }

    if (updates.ho_ten !== undefined && !String(updates.ho_ten).trim()) {
      return res.status(400).json({ message: 'Họ và tên là bắt buộc' });
    }
    if (updates.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(updates.email).trim())) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    Object.keys(updates).forEach((key) => {
      if (typeof updates[key] === 'string') updates[key] = updates[key].trim();
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');

    await log({ req, action: 'UPDATE_PROFILE', resource_type: 'User', resource_id: user._id, meta: updates });
    res.json(publicUser(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác' });
    }
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn file ảnh avatar' });
    }
    if (buffer.length > MAX_AVATAR_BYTES) {
      return res.status(413).json({ message: 'Avatar tối đa 1MB' });
    }

    const image = detectAvatarImage(buffer);
    if (!image) {
      return res.status(400).json({ message: 'Avatar chỉ hỗ trợ PNG, JPG hoặc WEBP' });
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });

    const currentUser = await User.findById(req.user._id);
    const filename = `${req.user._id}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${image.ext}`;
    const fullPath = path.join(AVATAR_DIR, filename);
    await fs.writeFile(fullPath, buffer, { flag: 'wx' });

    await removeLocalAvatar(currentUser.avatar);

    currentUser.avatar = `/uploads/avatars/${filename}`;
    await currentUser.save();

    await log({ req, action: 'UPLOAD_AVATAR', resource_type: 'User', resource_id: currentUser._id, meta: { size: buffer.length, mime: image.mime } });
    res.json(publicUser(currentUser));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.matchPassword(current_password))) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    user.password = new_password;
    await user.save();

    await log({ req, action: 'CHANGE_PASSWORD', resource_type: 'User', resource_id: user._id });
    res.json({ message: 'Đã đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
