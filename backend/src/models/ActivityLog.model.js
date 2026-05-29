/**
 * Model: ActivityLog — Ghi log hoạt động người dùng
 * Dùng để audit trail, debug, và phát hiện bất thường
 */
const mongoose = require('mongoose')

const ActivityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = anonymous (ví dụ: login attempt)
    },
    action: {
      type: String,
      required: true,
      // VD: 'LOGIN', 'LOGIN_FAIL', 'CREATE_PROJECT', 'DELETE_CATEGORY', ...
    },
    resource_type: {
      type: String,
      default: null, // VD: 'DuAn', 'ProjectCategory', 'NhanVien'
    },
    resource_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: { type: String, default: null },
    user_agent: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'activity_logs',
  }
)

ActivityLogSchema.index({ user_id: 1, createdAt: -1 })
ActivityLogSchema.index({ action: 1, createdAt: -1 })
ActivityLogSchema.index({ resource_type: 1, resource_id: 1 })
// TTL: tự động xóa log sau 90 ngày (tuỳ chỉnh)
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 })

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);