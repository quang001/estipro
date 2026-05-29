const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/khachHang.controller');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getOne);
router.post('/', ...requireManagerOrAdmin, ctrl.create);
router.put('/:id', ...requireManagerOrAdmin, ctrl.update);
router.delete('/:id', ...requireManagerOrAdmin, ctrl.remove);

module.exports = router;
