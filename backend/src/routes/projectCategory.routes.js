/**
 * Routes: projectCategory.routes.js
 *
 * GET    /api/loai-du-an            — Danh sách active  (mọi user đã đăng nhập)
 * GET    /api/loai-du-an/all        — Tất cả             (admin only)
 * POST   /api/loai-du-an            — Thêm               (admin only)
 * PUT    /api/loai-du-an/:id        — Sửa                (admin only)
 * PATCH  /api/loai-du-an/:id/toggle — Bật/tắt            (admin only)
 * DELETE /api/loai-du-an/:id        — Soft delete        (admin only)
 */
const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/auth.middleware');
const {
  validateCategoryBody,
  validateObjectIdParam,
} = require('../middlewares/validate.middleware');
const { createDataLimiter } = require('../middlewares/rateLimiter.middleware');
const ctrl = require('../controllers/projectCategory.controller');

// Public sau đăng nhập — dùng trong form tạo dự án
router.get('/',         auth, ctrl.getActive);

// Admin only
router.get('/all',      ...requireAdmin,  ctrl.getAll);

router.post('/',
  ...requireAdmin,
  createDataLimiter,
  validateCategoryBody,
  ctrl.create
);

router.put('/:id',
  ...requireAdmin,
  validateObjectIdParam('id'),
  validateCategoryBody,
  ctrl.update
);

router.patch('/:id/toggle',
  ...requireAdmin,
  validateObjectIdParam('id'),
  ctrl.toggleActive
);

router.delete('/:id',
  ...requireAdmin,
  validateObjectIdParam('id'),
  ctrl.remove
);

module.exports = router;
