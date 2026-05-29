const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const { createProjectLimiter } = require('../middlewares/rateLimiter.middleware');
const { validateDuAnBody, validateObjectIdParam } = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/duAn.controller');

// Read routes
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, validateObjectIdParam('id'), ctrl.getOne);

// Project CRUD
router.post(
  '/',
  ...requireManagerOrAdmin,
  createProjectLimiter,
  validateDuAnBody,
  ctrl.create
);

router.put(
  '/:id',
  ...requireManagerOrAdmin,
  validateObjectIdParam('id'),
  validateDuAnBody,
  ctrl.update
);

router.delete('/:id', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.remove);

// Task screen may call this as an assigned employee. Controller enforces scope.
router.patch('/:id/trang-thai', auth, validateObjectIdParam('id'), ctrl.changeTrangThai);

// Estimation and assignments
router.post(
  '/ai-estimation/ocr',
  ...requireManagerOrAdmin,
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'], limit: '10mb' }),
  ctrl.aiBriefOcr
);
router.post('/:id/ai-estimation/analyze', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.aiEstimateAnalyze);
router.post('/:id/ai-estimation/confirm', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.aiEstimateConfirm);
router.post('/:id/uoc-tinh', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.uocTinhManual);
router.get('/:id/goi-y-phan-cong', auth, validateObjectIdParam('id'), ctrl.goiYPhanCong);
router.post('/:id/phan-cong', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.themPhanCong);
router.put('/:id/phan-cong/:pcId', auth, validateObjectIdParam('id'), validateObjectIdParam('pcId'), ctrl.updatePhanCong);
router.delete('/:id/phan-cong/:pcId', ...requireManagerOrAdmin, validateObjectIdParam('id'), validateObjectIdParam('pcId'), ctrl.xoaPhanCong);
router.put('/:id/chi-phi-ky-thuat', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.updateChiPhiKyThuat);

// Workflow
router.post('/:id/gui-bao-gia', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.guiBaoGia);
router.post('/:id/khach-duyet', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.khachDuyet);
router.post('/:id/bat-dau', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.batDau);
router.post('/:id/chuyen-review', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.chuyenReview);
router.post('/:id/hoan-thanh', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.hoanThanh);
router.post('/:id/huy', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.huy);

// Scoring
router.post('/:id/tinh-diem', ...requireManagerOrAdmin, validateObjectIdParam('id'), ctrl.tinhDiem);
router.get('/:id/lich-su-diem', auth, validateObjectIdParam('id'), ctrl.getLichSuDiem);

module.exports = router;
