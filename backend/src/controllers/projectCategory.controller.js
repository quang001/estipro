/**
 * Controller: projectCategory.controller.js
 * CRUD đầy đủ cho Loại dự án (ProjectCategory)
 *
 * Endpoints:
 *   GET    /api/loai-du-an          — Danh sách (public sau auth)
 *   GET    /api/loai-du-an/all      — Tất cả (kể cả inactive) — admin only
 *   POST   /api/loai-du-an          — Thêm mới              — admin only
 *   PUT    /api/loai-du-an/:id      — Cập nhật              — admin only
 *   PATCH  /api/loai-du-an/:id/toggle — Bật/tắt active      — admin only
 *   DELETE /api/loai-du-an/:id      — Soft delete           — admin only
 */
const ProjectCategory = require('../models/ProjectCategory.model');
const DuAn            = require('../models/DuAn.model');
const { log }         = require('../utils/activityLogger');

// ─── GET /api/loai-du-an ─────────────────────────────────────────────────────
// Trả về danh sách active (dùng cho dropdown tạo dự án)
exports.getActive = async (req, res) => {
  try {
    const cats = await ProjectCategory.findActive();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/loai-du-an/all ─────────────────────────────────────────────────
// Trả về tất cả (kể cả inactive, chưa xóa) — dùng cho trang quản lý admin
exports.getAll = async (req, res) => {
  try {
    const cats = await ProjectCategory.findAll();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/loai-du-an ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { slug, ten_hien_thi, mo_ta, icon, thu_tu, active, base_hours, tech_cost_base, required_roles } = req.body;

    // Chống trùng lặp slug
    const existing = await ProjectCategory.findOne({ slug, deleted_at: null });
    if (existing) {
      return res.status(409).json({ message: `Loại dự án với slug "${slug}" đã tồn tại` });
    }

    const cat = await ProjectCategory.create({
      slug,
      ten_hien_thi,
      mo_ta,
      icon,
      thu_tu: thu_tu ?? 0,
      active: active !== false,
      base_hours: base_hours ?? 8,
      tech_cost_base: tech_cost_base ?? 100000,
      required_roles: required_roles || [],
      created_by: req.user._id,
      updated_by: req.user._id,
    });

    await log({ req, action: 'CREATE_PROJECT_CATEGORY', resource_type: 'ProjectCategory', resource_id: cat._id, meta: { slug } });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slug đã tồn tại' });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/loai-du-an/:id ─────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { slug, ten_hien_thi, mo_ta, icon, thu_tu, active, base_hours, tech_cost_base, required_roles } = req.body;

    // Nếu đổi slug thì kiểm tra trùng (loại trừ bản thân)
    if (slug) {
      const dup = await ProjectCategory.findOne({
        slug,
        deleted_at: null,
        _id: { $ne: req.params.id },
      });
      if (dup) return res.status(409).json({ message: `Slug "${slug}" đã được dùng bởi loại dự án khác` });
    }

    const cat = await ProjectCategory.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { slug, ten_hien_thi, mo_ta, icon, thu_tu, active, base_hours, tech_cost_base, required_roles, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy loại dự án' });

    await log({ req, action: 'UPDATE_PROJECT_CATEGORY', resource_type: 'ProjectCategory', resource_id: cat._id });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Slug đã tồn tại' });
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/loai-du-an/:id/toggle ────────────────────────────────────────
// Bật / tắt active mà không xóa
exports.toggleActive = async (req, res) => {
  try {
    const cat = await ProjectCategory.findOne({ _id: req.params.id, deleted_at: null });
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy loại dự án' });

    cat.active     = !cat.active;
    cat.updated_by = req.user._id;
    await cat.save();

    await log({
      req,
      action: cat.active ? 'ENABLE_PROJECT_CATEGORY' : 'DISABLE_PROJECT_CATEGORY',
      resource_type: 'ProjectCategory',
      resource_id: cat._id,
    });
    res.json({ message: `Đã ${cat.active ? 'bật' : 'tắt'} loại dự án "${cat.ten_hien_thi}"`, cat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/loai-du-an/:id ── (Soft delete) ─────────────────────────────
exports.remove = async (req, res) => {
  try {
    const cat = await ProjectCategory.findOne({ _id: req.params.id, deleted_at: null });
    if (!cat) return res.status(404).json({ message: 'Không tìm thấy loại dự án' });

    // Kiểm tra xem có dự án nào đang dùng loại này không
    const usedCount = await DuAn.countDocuments({ loai_du_an: cat._id, deleted_at: null });
    if (usedCount > 0) {
      return res.status(409).json({
        message: `Không thể xóa — có ${usedCount} dự án đang dùng loại này. Hãy tắt (inactive) thay vì xóa.`,
      });
    }

    cat.deleted_at = new Date();
    cat.deleted_by = req.user._id;
    await cat.save();

    await log({ req, action: 'DELETE_PROJECT_CATEGORY', resource_type: 'ProjectCategory', resource_id: cat._id, meta: { slug: cat.slug } });
    res.json({ message: `Đã xóa loại dự án "${cat.ten_hien_thi}"` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
