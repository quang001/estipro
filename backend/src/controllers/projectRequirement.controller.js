/**
 * controllers/projectRequirement.controller.js
 * CRUD + render form + đánh giá độ khó cho "Yêu cầu nhỏ theo loại dự án"
 */
const ProjectRequirementField = require('../models/ProjectRequirementField.model');
const ProjectCategory         = require('../models/ProjectCategory.model');
const { danhGiaDuAn }         = require('../utils/difficultyEngine');

// ─── helpers ─────────────────────────────────────────────────────────────────
const ok  = (res, data, status = 200) => res.status(status).json(data);
const err = (res, msg, status = 400) => res.status(status).json({ message: msg });

// ─── GET /api/project-requirements/:categoryId ───────────────────────────────
// Lấy tất cả field của 1 loại dự án (admin — kể cả inactive)
exports.getByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const fields = await ProjectRequirementField
      .find({ ma_loai_du_an: categoryId })
      .sort({ thu_tu: 1, createdAt: 1 });
    ok(res, fields);
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── GET /api/project-requirements/render/:categoryId ───────────────────────
// Lấy form fields để frontend render (chỉ lấy active)
exports.renderForm = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Hỗ trợ cả ObjectId lẫn slug
    let category = null;
    if (/^[a-f\d]{24}$/i.test(categoryId)) {
      category = await ProjectCategory.findOne({ _id: categoryId, deleted_at: null });
    }
    if (!category) {
      category = await ProjectCategory.findOne({ slug: categoryId, deleted_at: null });
    }
    if (!category) return err(res, 'Không tìm thấy loại dự án', 404);

    const fields = await ProjectRequirementField
      .find({ ma_loai_du_an: category._id, active: true })
      .sort({ thu_tu: 1, createdAt: 1 })
      .select('field_key label hint type required default_value min_value max_value options multiselect_rule');

    ok(res, { category, fields });
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── POST /api/project-requirements ─────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const body = req.body;

    // Validate loại dự án tồn tại
    const category = await ProjectCategory.findOne({ _id: body.ma_loai_du_an, deleted_at: null });
    if (!category) return err(res, 'Loại dự án không tồn tại');

    // Kiểm tra trùng field_key trong cùng loại dự án
    const exists = await ProjectRequirementField.findOne({
      ma_loai_du_an: body.ma_loai_du_an,
      field_key:     body.field_key,
    });
    if (exists) return err(res, `field_key "${body.field_key}" đã tồn tại trong loại dự án này`, 409);

    // Tự động gán thu_tu nếu không truyền
    if (body.thu_tu === undefined) {
      const last = await ProjectRequirementField
        .findOne({ ma_loai_du_an: body.ma_loai_du_an })
        .sort({ thu_tu: -1 });
      body.thu_tu = last ? last.thu_tu + 1 : 0;
    }

    const field = await ProjectRequirementField.create(body);
    ok(res, field, 201);
  } catch (e) {
    if (e.code === 11000) return err(res, 'field_key đã tồn tại trong loại dự án này', 409);
    err(res, e.message, 500);
  }
};

// ─── PUT /api/project-requirements/:id ──────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const body   = req.body;

    // Không cho đổi ma_loai_du_an
    delete body.ma_loai_du_an;

    // Nếu đổi field_key → kiểm tra trùng
    if (body.field_key) {
      const field = await ProjectRequirementField.findById(id);
      if (!field) return err(res, 'Không tìm thấy field', 404);

      const exists = await ProjectRequirementField.findOne({
        ma_loai_du_an: field.ma_loai_du_an,
        field_key:     body.field_key,
        _id:           { $ne: id },
      });
      if (exists) return err(res, `field_key "${body.field_key}" đã tồn tại trong loại dự án này`, 409);
    }

    const updated = await ProjectRequirementField.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return err(res, 'Không tìm thấy field', 404);
    ok(res, updated);
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── DELETE /api/project-requirements/:id ───────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const deleted = await ProjectRequirementField.findByIdAndDelete(req.params.id);
    if (!deleted) return err(res, 'Không tìm thấy field', 404);
    ok(res, { message: 'Đã xóa field' });
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── PATCH /api/project-requirements/:id/toggle ─────────────────────────────
exports.toggle = async (req, res) => {
  try {
    const field = await ProjectRequirementField.findById(req.params.id);
    if (!field) return err(res, 'Không tìm thấy field', 404);
    field.active = !field.active;
    await field.save();
    ok(res, field);
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── PATCH /api/project-requirements/:id/sort ───────────────────────────────
exports.sort = async (req, res) => {
  try {
    const { thu_tu } = req.body;
    if (thu_tu === undefined) return err(res, 'Thiếu thu_tu');

    const updated = await ProjectRequirementField.findByIdAndUpdate(
      req.params.id,
      { thu_tu },
      { new: true }
    );
    if (!updated) return err(res, 'Không tìm thấy field', 404);
    ok(res, updated);
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── POST /api/project-requirements/evaluate ────────────────────────────────
// Đánh giá độ khó một bộ yêu cầu
exports.evaluate = async (req, res) => {
  try {
    const { ma_loai_du_an, yeu_cau } = req.body;
    if (!ma_loai_du_an || !yeu_cau) return err(res, 'Thiếu ma_loai_du_an hoặc yeu_cau');

    const fields = await ProjectRequirementField.find({
      ma_loai_du_an,
      active: true,
    }).sort({ thu_tu: 1 });

    const result = danhGiaDuAn(yeu_cau, fields);
    ok(res, result);
  } catch (e) {
    err(res, e.message, 500);
  }
};

// ─── GET /api/project-requirements/all-categories ───────────────────────────
// Lấy tất cả loại dự án kèm số lượng field để hiển thị tổng quan trong admin
exports.allCategoriesSummary = async (req, res) => {
  try {
    const categories = await ProjectCategory.findAll();
    const counts = await ProjectRequirementField.aggregate([
      { $group: { _id: '$ma_loai_du_an', total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[String(c._id)] = { total: c.total, active: c.active }; });

    const result = categories.map(cat => ({
      ...cat.toObject(),
      so_field:        countMap[String(cat._id)]?.total  || 0,
      so_field_active: countMap[String(cat._id)]?.active || 0,
    }));
    ok(res, result);
  } catch (e) {
    err(res, e.message, 500);
  }
};
