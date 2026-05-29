/**
 * Model: DuAn — ĐÃ CẬP NHẬT
 *
 * Thay đổi so với bản cũ:
 *   - loai_du_an: String enum  →  loai_du_an: ObjectId ref 'ProjectCategory'
 *   - Thêm soft delete (deleted_at / deleted_by)
 *   - Thêm updated_by để audit
 */
const mongoose = require('mongoose')
const { TRANG_THAI_DU_AN } = require('../config/constants')

const DuAnSchema = new mongoose.Schema(
  {
    ma_khach_hang: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KhachHang',
      required: true,
    },
    ten_du_an: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Tên dự án tối đa 200 ký tự'],
    },

    // ── THAY ĐỔI CHÍNH: ref tới ProjectCategory thay vì enum string ──
    loai_du_an: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectCategory',
      required: true,
    },

    mo_ta: { type: String, default: '', maxlength: [2000, 'Mô tả tối đa 2000 ký tự'] },
    trang_thai: {
      type: String,
      default: 'draft',
      enum: TRANG_THAI_DU_AN,
    },
    deadline: { type: Date, required: true },
    yeu_cau: { type: mongoose.Schema.Types.Mixed, default: {} },
    so_sao: { type: Number, min: 0, max: 5, default: null },
    ngay_danh_gia: { type: Date, default: null },

    // ── Audit / Soft delete ──
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deleted_at: { type: Date, default: null },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, collection: 'du_an' }
)

// Index phổ biến
DuAnSchema.index({ ma_khach_hang: 1 })
DuAnSchema.index({ loai_du_an: 1 })
DuAnSchema.index({ trang_thai: 1 })
DuAnSchema.index({ deleted_at: 1 })

// Scope helper: chỉ lấy bản chưa bị soft-delete
DuAnSchema.statics.findNotDeleted = function (filter = {}) {
  return this.find({ ...filter, deleted_at: null })
}

module.exports = mongoose.models.DuAn || mongoose.model('DuAn', DuAnSchema);