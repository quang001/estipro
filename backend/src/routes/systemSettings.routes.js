const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/systemSettings.controller');

router.get('/', auth, ctrl.getSettings);
router.put('/', ...requireAdmin, ctrl.updateSettings);

module.exports = router;
