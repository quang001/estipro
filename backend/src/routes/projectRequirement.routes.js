/**
 * routes/projectRequirement.routes.js
 */
const router = require('express').Router();
const ctrl   = require('../controllers/projectRequirement.controller');
const { auth } = require('../middlewares/auth.middleware');

// Kiểm tra xem middleware requireAdmin có tồn tại không — fallback nếu chưa patch
let requireAdmin;
try {
  ({ requireAdmin } = require('../middlewares/auth.middleware'));
} catch (_) {}
const adminGuard = requireAdmin ? requireAdmin : [auth];

// ── Public (cần đăng nhập) ──────────────────────────────────────────────────
router.get('/render/:categoryId',    auth,        ctrl.renderForm);
router.post('/evaluate',             auth,        ctrl.evaluate);

// ── Admin only ──────────────────────────────────────────────────────────────
router.get('/all-categories',        ...adminGuard, ctrl.allCategoriesSummary);
router.get('/:categoryId',           ...adminGuard, ctrl.getByCategory);
router.post('/',                     ...adminGuard, ctrl.create);
router.put('/:id',                   ...adminGuard, ctrl.update);
router.delete('/:id',                ...adminGuard, ctrl.remove);
router.patch('/:id/toggle',          ...adminGuard, ctrl.toggle);
router.patch('/:id/sort',            ...adminGuard, ctrl.sort);

module.exports = router;
