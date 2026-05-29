/**
 * Middleware: validate.middleware.js
 * Tập trung validate + sanitize đầu vào cho toàn hệ thống.
 * Dùng thủ công (không cần express-validator) để giữ dependency nhỏ.
 */
const mongoose = require('mongoose');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Sanitize string: trim + loại bỏ ký tự HTML nguy hiểm (anti-XSS cơ bản)
 * Nên kết hợp với helmet() ở app-level.
 */
function sanitizeStr(val) {
  if (typeof val !== 'string') return val;
  return val
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Kiểm tra ObjectId hợp lệ của Mongoose.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─── Generic param validator ─────────────────────────────────────────────────

/**
 * validateObjectIdParam('id')
 * Dùng cho route /:id, /:pcId, v.v.
 */
exports.validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
  const val = req.params[paramName];
  if (!isValidObjectId(val)) {
    return res.status(400).json({ message: `${paramName} không hợp lệ` });
  }
  next();
};

// ─── ProjectCategory validators ──────────────────────────────────────────────

exports.validateCategoryBody = (req, res, next) => {
  let { slug, ten_hien_thi, mo_ta, icon, thu_tu, active, base_hours, tech_cost_base, required_roles } = req.body;

  // Bắt buộc
  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({ message: 'slug là bắt buộc' });
  }
  if (!ten_hien_thi || typeof ten_hien_thi !== 'string' || !ten_hien_thi.trim()) {
    return res.status(400).json({ message: 'ten_hien_thi là bắt buộc' });
  }

  // Sanitize
  slug         = slug.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  ten_hien_thi = sanitizeStr(ten_hien_thi);
  mo_ta        = mo_ta ? sanitizeStr(String(mo_ta)) : '';
  icon         = icon  ? sanitizeStr(String(icon))  : '';
  thu_tu       = thu_tu !== undefined ? parseInt(thu_tu, 10) : 0;
  active       = active !== undefined ? Boolean(active) : true;
  base_hours   = base_hours !== undefined ? Number(base_hours) : undefined;
  tech_cost_base = tech_cost_base !== undefined ? Number(tech_cost_base) : undefined;

  // Validate độ dài
  if (slug.length < 2 || slug.length > 60) {
    return res.status(400).json({ message: 'slug phải từ 2–60 ký tự (chữ thường, số, _)' });
  }
  if (ten_hien_thi.length < 2 || ten_hien_thi.length > 120) {
    return res.status(400).json({ message: 'ten_hien_thi phải từ 2–120 ký tự' });
  }
  if (mo_ta.length > 500) {
    return res.status(400).json({ message: 'mo_ta tối đa 500 ký tự' });
  }
  if (isNaN(thu_tu)) thu_tu = 0;
  if (base_hours !== undefined && (!Number.isFinite(base_hours) || base_hours < 1)) {
    return res.status(400).json({ message: 'base_hours phải là số >= 1' });
  }
  if (tech_cost_base !== undefined && (!Number.isFinite(tech_cost_base) || tech_cost_base < 0)) {
    return res.status(400).json({ message: 'tech_cost_base phải là số >= 0' });
  }
  if (required_roles !== undefined && !Array.isArray(required_roles)) {
    return res.status(400).json({ message: 'required_roles phải là mảng' });
  }

  // Gắn lại vào body đã được sanitize
  req.body = { slug, ten_hien_thi, mo_ta, icon, thu_tu, active };
  if (base_hours !== undefined) req.body.base_hours = base_hours;
  if (tech_cost_base !== undefined) req.body.tech_cost_base = tech_cost_base;
  if (required_roles !== undefined) {
    const normalizedRoles = required_roles.map(role => ({
      vai_tro: sanitizeStr(String(role.vai_tro || '')),
      phan_tram: Number(role.phan_tram),
    }));

    const invalidRole = normalizedRoles.find(role =>
      !role.vai_tro || !Number.isFinite(role.phan_tram) || role.phan_tram < 0 || role.phan_tram > 100
    );
    if (invalidRole) {
      return res.status(400).json({ message: 'required_roles khong hop le' });
    }

    const totalRolePercent = normalizedRoles.reduce((sum, role) => sum + role.phan_tram, 0);
    if (normalizedRoles.length > 0 && Math.abs(totalRolePercent - 100) > 0.01) {
      return res.status(400).json({ message: `Tong phan_tram required_roles phai = 100 (hien tai: ${totalRolePercent})` });
    }

    req.body.required_roles = normalizedRoles;
  }
  next();
};

// ─── DuAn validators ─────────────────────────────────────────────────────────

exports.validateDuAnBody = (req, res, next) => {
  let { ten_du_an, ma_khach_hang, loai_du_an, deadline } = req.body;

  if (!ten_du_an || typeof ten_du_an !== 'string' || !ten_du_an.trim()) {
    return res.status(400).json({ message: 'ten_du_an là bắt buộc' });
  }
  if (!isValidObjectId(ma_khach_hang)) {
    return res.status(400).json({ message: 'ma_khach_hang không hợp lệ' });
  }
  if (!isValidObjectId(loai_du_an)) {
    return res.status(400).json({ message: 'loai_du_an phải là ObjectId hợp lệ của ProjectCategory' });
  }
  if (!deadline || isNaN(Date.parse(deadline))) {
    return res.status(400).json({ message: 'deadline không hợp lệ' });
  }

  req.body.ten_du_an = sanitizeStr(ten_du_an);
  if (req.body.mo_ta) req.body.mo_ta = sanitizeStr(String(req.body.mo_ta));
  next();
};

// ─── Auth validators ─────────────────────────────────────────────────────────

exports.validateLoginBody = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ message: 'username không hợp lệ (tối thiểu 3 ký tự)' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password không hợp lệ (tối thiểu 6 ký tự)' });
  }
  req.body.username = username.trim().toLowerCase();
  next();
};

exports.validateChangePasswordBody = (req, res, next) => {
  const { current_password, new_password } = req.body;
  if (!current_password || typeof current_password !== 'string') {
    return res.status(400).json({ message: 'current_password là bắt buộc' });
  }
  if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
    return res.status(400).json({ message: 'new_password phải tối thiểu 8 ký tự' });
  }
  // Yêu cầu tối thiểu: có chữ + số
  if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
    return res.status(400).json({ message: 'new_password phải chứa cả chữ và số' });
  }
  next();
};

// ─── Generic string field sanitizer middleware ───────────────────────────────

/**
 * sanitizeBody(['ten', 'mo_ta'])
 * Sanitize các trường string nhất định trong req.body
 */
exports.sanitizeBody = (fields) => (req, res, next) => {
  for (const f of fields) {
    if (req.body[f] && typeof req.body[f] === 'string') {
      req.body[f] = sanitizeStr(req.body[f]);
    }
  }
  next();
};
