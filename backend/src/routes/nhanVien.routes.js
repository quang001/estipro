const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/nhanVien.controller');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getOne);
router.post('/', ...requireManagerOrAdmin, ctrl.create);
router.put('/:id', ...requireManagerOrAdmin, ctrl.update);
router.delete('/:id', ...requireManagerOrAdmin, ctrl.remove);

router.post('/:id/ky-nang', ...requireManagerOrAdmin, ctrl.addKyNang);
router.delete('/:id/ky-nang/:knId', ...requireManagerOrAdmin, ctrl.removeKyNang);

router.get('/:id/lich-su-diem', auth, ctrl.getLichSuDiem);

module.exports = router;
