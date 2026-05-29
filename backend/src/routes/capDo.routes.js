const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/capDo.controller');

router.get('/', auth, ctrl.getAll);
router.post('/', ...requireManagerOrAdmin, ctrl.create);
router.put('/:id', ...requireManagerOrAdmin, ctrl.update);

module.exports = router;
