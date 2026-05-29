/**
 * Model: ProjectCategory (Loại dự án)
 */
const mongoose = require('mongoose');

// Sub-schema cho vai trò yêu cầu trong loại DA
const RequiredRoleSchema = new mongoose.Schema({
  vai_tro:    { type: String, required: true },   // VD: 'motion_designer'
  phan_tram:  { type: Number, required: true, min: 0, max: 100 }, // % giờ công
}, { _id: false });

const ProjectCategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String, required: true, unique: true, trim: true, lowercase: true,
      match: [/^[a-z0-9_]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch dưới'],
      maxlength: [60, 'Slug tối đa 60 ký tự'],
    },
    ten_hien_thi: {
      type: String, required: true, trim: true,
      maxlength: [120, 'Tên tối đa 120 ký tự'],
    },
    mo_ta:  { type: String, default: '', maxlength: [500, 'Mô tả tối đa 500 ký tự'] },
    icon:   { type: String, default: '', maxlength: [50, 'Icon tối đa 50 ký tự'] },
    thu_tu: { type: Number, default: 0 },
    active: { type: Boolean, default: true },

    // ── Cấu hình ước tính — thay thế RATE_CARD hardcode ──────────────────
    // Giờ cơ bản của loại DA (trước khi nhân hệ số độ khó & deadline)
    base_hours: { type: Number, default: 8, min: 1 },

    // Chi phí kỹ thuật mặc định (fallback khi chưa nhập tay)
    tech_cost_base: { type: Number, default: 100000, min: 0 },

    // Vai trò nhân sự yêu cầu + % phân chia giờ công
    // Tổng phan_tram nên = 100
    required_roles: { type: [RequiredRoleSchema], default: [] },

    // Soft delete
    deleted_at: { type: Date, default: null },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'project_categories' }
);

ProjectCategorySchema.index({ slug: 1 });
ProjectCategorySchema.index({ active: 1, thu_tu: 1 });
ProjectCategorySchema.index({ deleted_at: 1 });

ProjectCategorySchema.statics.findActive = function () {
  return this.find({ deleted_at: null, active: true }).sort({ thu_tu: 1, ten_hien_thi: 1 });
};
ProjectCategorySchema.statics.findAll = function () {
  return this.find({ deleted_at: null }).sort({ thu_tu: 1, ten_hien_thi: 1 });
};

module.exports = mongoose.models.ProjectCategory
  || mongoose.model('ProjectCategory', ProjectCategorySchema);