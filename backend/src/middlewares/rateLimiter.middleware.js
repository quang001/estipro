// rateLimiter.middleware.js
// Middleware giới hạn tốc độ (rate limiter) cho các endpoint quan trọng như login, tạo dự án, upload, v.v.

// ─── In-memory store (thay bằng Redis khi scale) ─────────────────────────────
const store = new Map(); // key => { count, resetAt }

function getKey(req, prefix) {
  // Lấy IP thực (hỗ trợ proxy/nginx)
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';
  return `${prefix}:${ip}`;
}

/**
 * Tạo rate limiter middleware.
 * @param {object} opts
 * @param {number}  opts.windowMs    - Thời gian cửa sổ (ms), default 60_000
 * @param {number}  opts.max         - Số request tối đa trong cửa sổ
 * @param {string}  opts.prefix      - Tên prefix để tách namespace (VD: 'login', 'create_project')
 * @param {string}  opts.message     - Thông báo lỗi
 */
function createRateLimiter({ windowMs = 60_000, max, prefix, message }) {
  return (req, res, next) => {
    const key = getKey(req, prefix);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    store.set(key, entry);

    // Header thông tin cho client
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({
        message: message || 'Quá nhiều yêu cầu — vui lòng thử lại sau',
        retry_after: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// Dọn dẹp entries đã hết hạn mỗi 5 phút (tránh memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000);

// ─── Xuất các preset phổ biến ─────────────────────────────────────────────────

/** Chống brute force login: 5 lần / 15 phút mỗi IP */
exports.loginLimiter = createRateLimiter({
  windowMs: 5 * 60_000,
  max: 5,
  prefix: 'login',
  message: 'Đăng nhập thất bại quá nhiều lần — vui lòng thử lại sau 15 phút',
});

/** Chống spam tạo dự án: 10 dự án / phút mỗi IP */
exports.createProjectLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  prefix: 'create_project',
  message: 'Tạo quá nhiều dự án trong thời gian ngắn — vui lòng thử lại sau',
});

/** Chống spam thêm loại dự án / skill / category: 20 / phút */
exports.createDataLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  prefix: 'create_data',
  message: 'Thêm dữ liệu quá nhanh — vui lòng thử lại sau',
});

/** Rate limit chung cho toàn bộ API: 300 / phút mỗi IP */
exports.globalLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 300,
  prefix: 'global',
  message: 'Quá nhiều yêu cầu đến server — vui lòng thử lại sau',
});

/** Chống spam upload: 5 lần / phút */
exports.uploadLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  prefix: 'upload',
  message: 'Upload quá nhiều lần trong thời gian ngắn',
});

/** Factory dùng khi cần config tuỳ chỉnh */
exports.createRateLimiter = createRateLimiter;
