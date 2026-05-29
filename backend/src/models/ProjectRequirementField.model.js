// models/ProjectRequirementField.model.js
/**
 * Mô hình dữ liệu cho "Yêu cầu nhỏ theo loại dự án"
 * Dùng để frontend render form nhập yêu cầu dự án, đồng thời đánh giá độ khó
 */
const mongoose = require('mongoose')

// ─── Sub-schema cho cấu hình độ khó (dùng trong cau_hinh_do_kho) ───────────

// Dạng NUMBER: chia khoảng [min, max] → độ khó
const DoKhoNumberSchema = new mongoose.Schema({
  min:    { type: Number, required: true },
  max:    { type: Number, required: true },
  muc_do: { type: String, enum: ['de', 'trung_binh', 'kho', 'rat_kho'], required: true },
  diem:   { type: Number, enum: [1, 2, 3, 4], required: true },
}, { _id: false })

// Dạng SELECT / BOOLEAN: mỗi value → độ khó
const DoKhoOptionSchema = new mongoose.Schema({
  value:  { type: mongoose.Schema.Types.Mixed, required: true }, // string | boolean
  label:  { type: String, default: '' },
  muc_do: { type: String, enum: ['de', 'trung_binh', 'kho', 'rat_kho'], required: true },
  diem:   { type: Number, enum: [1, 2, 3, 4], required: true },
}, { _id: false })

// ─── Schema chính ────────────────────────────────────────────────────────────
const ProjectRequirementFieldSchema = new mongoose.Schema(
  {
    // Thuộc về loại dự án nào
    ma_loai_du_an: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectCategory',
      required: true,
    },

    // Key định danh nội bộ, dùng để map vào yeu_cau của DuAn
    field_key: {
      type: String,
      required: true,
      trim: true,
      match: [/^[a-z0-9_]+$/, 'field_key chỉ chứa chữ thường, số và dấu gạch dưới'],
      maxlength: [60, 'field_key tối đa 60 ký tự'],
    },

    // Tên hiển thị cho người dùng
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Label tối đa 200 ký tự'],
    },

    // Gợi ý / hướng dẫn nhập
    hint: {
      type: String,
      default: '',
      maxlength: [500, 'Hint tối đa 500 ký tự'],
    },

    // Loại input
    type: {
      type: String,
      required: true,
      enum: ['number', 'select', 'multiselect', 'boolean', 'text', 'textarea'],
    },

    // Bắt buộc hay không
    required: {
      type: Boolean,
      default: false,
    },

    // Thứ tự hiển thị trong form
    thu_tu: {
      type: Number,
      default: 0,
    },

    // Bật / tắt field
    active: {
      type: Boolean,
      default: true,
    },

    // ── Giá trị mặc định ─────────────────────────────────────────────────
    default_value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Cho type NUMBER ──────────────────────────────────────────────────
    min_value: { type: Number, default: null },
    max_value: { type: Number, default: null },

    // ── Cho type SELECT / MULTISELECT ────────────────────────────────────
    // Danh sách lựa chọn (value + label + độ khó)
    options: {
      type: [DoKhoOptionSchema],
      default: [],
    },

    // ── Cấu hình độ khó ──────────────────────────────────────────────────
    // Dùng cho type number → mảng khoảng giá trị
    cau_hinh_do_kho_number: {
      type: [DoKhoNumberSchema],
      default: [],
    },

    // Rule tổng hợp cho MULTISELECT: max | average | sum
    multiselect_rule: {
      type: String,
      enum: ['max', 'average', 'sum'],
      default: 'max',
    },
  },
  {
    timestamps: true,
    collection: 'project_requirement_fields',
  }
)

// ── Unique: mỗi loại dự án không được có 2 field cùng key ───────────────────
ProjectRequirementFieldSchema.index({ ma_loai_du_an: 1, field_key: 1 }, { unique: true })
ProjectRequirementFieldSchema.index({ ma_loai_du_an: 1, active: 1, thu_tu: 1 })

module.exports = mongoose.models.ProjectRequirementField || mongoose.model('ProjectRequirementField', ProjectRequirementFieldSchema);