const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/baoCao.controller');

router.get('/dashboard', auth, ctrl.dashboard);
router.get('/doanh-thu', ...requireManagerOrAdmin, ctrl.doanhThu);
router.get('/hieu-suat', ...requireManagerOrAdmin, ctrl.hieuSuat);
router.get('/ai-insights', ...requireManagerOrAdmin, ctrl.aiInsights);

module.exports = router;
