/**
 * Utils: activityLogger.js
 * Tiện ích ghi ActivityLog — dùng trong controllers.
 * Fire-and-forget: không throw, không làm chậm response.
 */
const ActivityLog = require('../models/ActivityLog.model');

/**
 * @param {object} opts
 * @param {import('express').Request} opts.req    - Express request (lấy IP, user)
 * @param {string}  opts.action                  - Tên action viết HOA, VD: 'CREATE_PROJECT'
 * @param {string}  [opts.resource_type]         - Tên model, VD: 'DuAn'
 * @param {*}       [opts.resource_id]           - ObjectId của document liên quan
 * @param {object}  [opts.meta]                  - Dữ liệu bổ sung tuỳ ý
 */
async function log({ req, action, resource_type, resource_id, meta = {} }) {
  try {
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null;
    await ActivityLog.create({
      user_id:       req?.user?._id || null,
      action,
      resource_type: resource_type || null,
      resource_id:   resource_id   || null,
      meta,
      ip,
      user_agent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    // Không để lỗi log làm gián đoạn luồng chính
    console.error('[ActivityLog Error]', err.message);
  }
}

module.exports = { log };
