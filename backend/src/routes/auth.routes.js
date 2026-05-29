/**
 * Routes: auth.routes.js — ĐÃ CẬP NHẬT
 * Thêm: loginLimiter, validateLoginBody, validateChangePasswordBody
 */
const router = require('express').Router();
const express = require('express');
const auth   = require('../middlewares/auth.middleware');
const { loginLimiter }                                            = require('../middlewares/rateLimiter.middleware');
const { validateLoginBody, validateChangePasswordBody }          = require('../middlewares/validate.middleware');
const ctrl   = require('../controllers/auth.controller');

router.post('/login',           loginLimiter, validateLoginBody,          ctrl.login);
router.get('/me',               auth,                                      ctrl.me);
router.put('/profile',          auth,                                      ctrl.updateProfile);
router.post('/avatar',          auth, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '1mb' }), ctrl.uploadAvatar);
router.put('/change-password',  auth, validateChangePasswordBody,          ctrl.changePassword);

module.exports = router;
