const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const { requireManagerOrAdmin } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/kyNang.controller');

router.get('/', auth, ctrl.getAll);
router.post('/', ...requireManagerOrAdmin, ctrl.create);
router.delete('/:id', ...requireManagerOrAdmin, ctrl.remove);

module.exports = router;
