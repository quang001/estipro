const DuAn = require('../models/DuAn.model');
const KhachHang = require('../models/KhachHang.model');
const NhanVien = require('../models/NhanVien.model');
const PhanCongDuAn = require('../models/PhanCongDuAn.model');
const LichSuDiem = require('../models/LichSuDiem.model');
const ProjectCategory = require('../models/ProjectCategory.model');
const ProjectRequirementField = require('../models/ProjectRequirementField.model');
const {
  DanhGiaHieuSuat,
  ChiPhiKyThuat,
  UocTinhChiPhi,
  ChiPhiThucTe,
  DuLieuHocMay,
} = require('../models/index');
const { TRANG_THAI_DU_AN } = require('../config/constants');
const { tinhChiPhiKyThuat, tinhRuiRo, goiYPhanCong } = require('../utils/estimationEngine');
const { danhGiaDuAn, tinhGiaDynamic, HE_SO_DO_KHO } = require('../utils/difficultyEngine');
const { tinhDiemDuAn } = require('../utils/scoringService');
const { getSystemSettings } = require('../services/systemSettings.service');
const {
  analyzeAiEstimation,
  buildConfirmedRequirements,
  mergeAiReviewedDifficulty,
} = require('../utils/aiService');

const MANAGER_ROLES = new Set(['admin', 'manager']);

const STATUS_TRANSITIONS = {
  draft: ['quoted', 'cancelled'],
  quoted: ['approved', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  in_progress: ['review', 'cancelled'],
  review: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const EMPLOYEE_STATUS_TRANSITIONS = {
  approved: ['in_progress'],
  in_progress: ['review'],
};

function isManagerOrAdmin(req) {
  return MANAGER_ROLES.has(req.user?.vai_tro);
}

function activeProjectFilter(filter = {}) {
  return { ...filter, deleted_at: null };
}

function objectIdString(value) {
  return value?._id?.toString?.() || value?.toString?.();
}

async function findActiveProject(id) {
  return DuAn.findOne(activeProjectFilter({ _id: id }));
}

async function getEmployeeForUser(user) {
  if (!user?.email) return null;
  return NhanVien.findOne({ email: user.email });
}

async function ensureAssignedEmployee(req, projectId, assignment = null) {
  const nv = await getEmployeeForUser(req.user);
  if (!nv) {
    return { ok: false, status: 403, message: 'Tai khoan chua lien ket voi nhan vien' };
  }

  if (assignment) {
    const assignmentEmployeeId = objectIdString(assignment.ma_nhan_vien);
    if (assignmentEmployeeId !== objectIdString(nv._id)) {
      return { ok: false, status: 403, message: 'Chi nhan vien duoc phan cong moi duoc cap nhat muc nay' };
    }
    return { ok: true, nhanVien: nv };
  }

  const count = await PhanCongDuAn.countDocuments({ ma_du_an: projectId, ma_nhan_vien: nv._id });
  if (count === 0) {
    return { ok: false, status: 403, message: 'Chi nhan vien duoc phan cong moi duoc cap nhat du an nay' };
  }
  return { ok: true, nhanVien: nv };
}

function parseNumberField(value, field, options = {}) {
  const {
    required = false,
    defaultValue = 0,
    min = 0,
    max = Number.POSITIVE_INFINITY,
  } = options;

  if (value === undefined || value === null || value === '') {
    if (required) return { ok: false, message: `${field} la bat buoc` };
    return { ok: true, value: defaultValue };
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    return { ok: false, message: `${field} phai la so tu ${min} den ${max}` };
  }
  return { ok: true, value: num };
}

function validateContributionRatios(list) {
  if (list === undefined || list === null) return { ok: true, value: [] };
  if (!Array.isArray(list)) {
    return { ok: false, message: 'ty_le_dong_gop phai la mang' };
  }
  if (list.length === 0) return { ok: true, value: [] };

  let total = 0;
  const normalized = [];
  for (const item of list) {
    const ratio = Number(item.ty_le);
    if (!item.ma_nhan_vien || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      return { ok: false, message: 'Moi ty_le_dong_gop phai co ma_nhan_vien va ty_le trong khoang 0..1' };
    }
    total += ratio;
    normalized.push({ ma_nhan_vien: item.ma_nhan_vien, ty_le: ratio });
  }

  if (Math.abs(total - 1) > 0.01) {
    return { ok: false, message: `Tong ty le dong gop phai = 1 (hien tai: ${total.toFixed(2)})` };
  }
  return { ok: true, value: normalized };
}

function validateTransition(currentStatus, targetStatus, transitions = STATUS_TRANSITIONS) {
  if (!TRANG_THAI_DU_AN.includes(targetStatus)) {
    return 'trang_thai khong hop le';
  }
  if (currentStatus === targetStatus) return null;

  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return `Khong the chuyen trang thai tu ${currentStatus} sang ${targetStatus}`;
  }
  return null;
}

async function transitionProject(req, targetStatus, { allowEmployee = false, allowCompleted = false } = {}) {
  if (targetStatus === 'completed' && !allowCompleted) {
    return { ok: false, status: 400, message: 'Hay dung API hoan-thanh de dong du an va tinh diem' };
  }

  const duAn = await findActiveProject(req.params.id);
  if (!duAn) return { ok: false, status: 404, message: 'Khong tim thay du an' };
  if (duAn.trang_thai === targetStatus) return { ok: true, duAn };

  if (isManagerOrAdmin(req)) {
    const error = validateTransition(duAn.trang_thai, targetStatus);
    if (error) return { ok: false, status: 400, message: error };
  } else if (allowEmployee) {
    const assigned = await ensureAssignedEmployee(req, req.params.id);
    if (!assigned.ok) return assigned;

    const error = validateTransition(duAn.trang_thai, targetStatus, EMPLOYEE_STATUS_TRANSITIONS);
    if (error) return { ok: false, status: 403, message: error };
  } else {
    return { ok: false, status: 403, message: 'Khong co quyen cap nhat trang thai' };
  }

  const updated = await DuAn.findOneAndUpdate(
    activeProjectFilter({ _id: req.params.id }),
    { trang_thai: targetStatus, updated_by: req.user?._id || null },
    { new: true, runValidators: true }
  );

  return { ok: true, duAn: updated };
}

async function _getDuAnFull(id) {
  const duAn = await DuAn.findOne(activeProjectFilter({ _id: id }))
    .populate('ma_khach_hang')
    .populate('loai_du_an');
  if (!duAn) return null;

  const [phanCong, chiPhiKT, uocTinhDoc, chiPhiTT] = await Promise.all([
    PhanCongDuAn.find({ ma_du_an: id }).populate('ma_nhan_vien'),
    ChiPhiKyThuat.findOne({ ma_du_an: id }),
    UocTinhChiPhi.findOne({ ma_du_an: id }),
    ChiPhiThucTe.findOne({ ma_du_an: id }),
  ]);

  return {
    ...duAn.toObject(),
    phan_cong: phanCong.map(pc => ({
      ...pc.toObject(),
      luong_theo_gio: pc.ma_nhan_vien?.luong_theo_gio || 0,
      ho_ten: pc.ma_nhan_vien?.ho_ten,
      vai_tro: pc.ma_nhan_vien?.vai_tro,
    })),
    chi_phi_ky_thuat: chiPhiKT,
    uoc_tinh: uocTinhDoc,
    chi_phi_thuc_te: chiPhiTT,
  };
}

async function loadAiEstimationContext(project = null) {
  const categories = await ProjectCategory.find({ deleted_at: null, active: true })
    .sort({ thu_tu: 1, ten_hien_thi: 1 });
  const categoryIds = categories.map(category => category._id);
  const fields = await ProjectRequirementField.find({
    ma_loai_du_an: { $in: categoryIds },
    active: true,
  }).sort({ thu_tu: 1, createdAt: 1 });

  return {
    project: project?.toObject?.() || project || {},
    categories,
    fields,
  };
}

async function _autoUocTinh(duAnId, duAn, tyLeLoiNhuan = null, options = {}) {
  try {
    if (!duAn) return null;
    const { includeAiReviewed = true } = options;

    const [khachHang, allNV, phanCong, chiPhiKTDoc, category, systemSettings] = await Promise.all([
      KhachHang.findById(duAn.ma_khach_hang),
      NhanVien.find({ trang_thai_lam_viec: 'available' }),
      PhanCongDuAn.find({ ma_du_an: duAnId }).populate('ma_nhan_vien'),
      ChiPhiKyThuat.findOne({ ma_du_an: duAnId }),
      ProjectCategory.findOne({ _id: duAn.loai_du_an, deleted_at: null }),
      getSystemSettings(),
    ]);
    const profitMargin = tyLeLoiNhuan === null || tyLeLoiNhuan === undefined
      ? systemSettings.profitMargin
      : tyLeLoiNhuan;

    const yeuCau = duAn.yeu_cau || {};
    const diemDoKho = khachHang?.diem_do_kho || 3;
    const fieldConfigs = await ProjectRequirementField.find({
      ma_loai_du_an: duAn.loai_du_an,
      active: true,
    }).sort({ thu_tu: 1 });

    const systemDoKhoResult = danhGiaDuAn(yeuCau, fieldConfigs);
    const doKhoResult = includeAiReviewed
      ? mergeAiReviewedDifficulty(systemDoKhoResult, yeuCau)
      : systemDoKhoResult;
    const gioCoBan = category?.base_hours ?? category?.gio_co_ban ?? 8;
    const tongKT = tinhChiPhiKyThuat(category, yeuCau, chiPhiKTDoc?.toObject?.() || null);
    const { pct: pctRuiRo, reasons } = tinhRuiRo(category, yeuCau, diemDoKho);

    const phanCongData = phanCong.map(pc => ({
      gio_du_kien: Number(pc.gio_du_kien) || 0,
      luong_theo_gio: pc.ma_nhan_vien?.luong_theo_gio || 0,
    }));

    const pricingInput = {
      gio_co_ban: gioCoBan,
      muc_do_tong_the: doKhoResult.muc_do_tong_the,
      muc_do_gap: yeuCau.muc_do_gap || 'binh_thuong',
      phanCong: phanCongData,
      chi_phi_ky_thuat_base: tongKT,
      ty_le_loi_nhuan: profitMargin,
    };

    let dynResult = tinhGiaDynamic(pricingInput);
    let phanCongGoiY = [];

    if (phanCongData.length === 0) {
      phanCongGoiY = goiYPhanCong(category, dynResult.tong_gio_cong, allNV);
      const suggestedPricingData = phanCongGoiY.map(pc => ({
        gio_du_kien: Number(pc.gio_du_kien) || 0,
        luong_theo_gio: Number(pc.luong_theo_gio) || 0,
      }));

      if (suggestedPricingData.length > 0) {
        dynResult = tinhGiaDynamic({ ...pricingInput, phanCong: suggestedPricingData });
      }
    }

    const chiPhiRuiRo = Math.round(dynResult.tong_chi_phi_du_kien * pctRuiRo);
    const tongDuKien = dynResult.tong_chi_phi_du_kien + chiPhiRuiRo;
    const giaDexuat = Math.round(tongDuKien * (1 + profitMargin / 100));

    await UocTinhChiPhi.findOneAndUpdate(
      { ma_du_an: duAnId },
      {
        ma_du_an: duAnId,
        chi_phi_nhan_su: dynResult.chi_phi_nhan_su,
        chi_phi_ky_thuat: dynResult.chi_phi_ky_thuat,
        chi_phi_rui_ro: chiPhiRuiRo,
        tong_chi_phi_du_kien: tongDuKien,
        ty_le_loi_nhuan: profitMargin,
        gia_de_xuat: giaDexuat,
        he_so_deadline: dynResult.he_so_deadline,
        phan_tram_rui_ro: Math.round(pctRuiRo * 100),
        ly_do_rui_ro: reasons.join('; ') || 'Rui ro co ban',
        tong_gio_cong: dynResult.tong_gio_cong,
        phan_cong_goi_y: phanCongGoiY,
        do_kho: {
          muc_do: doKhoResult.muc_do_tong_the,
          diem: doKhoResult.diem_do_kho_tong,
          chi_tiet: doKhoResult.chi_tiet_do_kho,
          he_so_do_kho: dynResult.he_so_do_kho,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return {
      ...dynResult,
      chi_phi_rui_ro: chiPhiRuiRo,
      tong_chi_phi_du_kien: tongDuKien,
      gia_de_xuat: giaDexuat,
      phan_tram_rui_ro: Math.round(pctRuiRo * 100),
      ly_do_rui_ro: reasons.join('; ') || 'Rui ro co ban',
      phan_cong_goi_y: phanCongGoiY,
      do_kho: doKhoResult,
    };
  } catch (err) {
    console.error('[AutoUocTinh]', err.message);
    return null;
  }
}

exports.getAll = async (req, res) => {
  try {
    const { search, trang_thai, loai_du_an } = req.query;
    const q = activeProjectFilter();
    if (search) q.ten_du_an = { $regex: search, $options: 'i' };
    if (trang_thai) q.trang_thai = trang_thai;
    if (loai_du_an) q.loai_du_an = loai_du_an;

    const duAns = await DuAn.find(q)
      .populate('ma_khach_hang')
      .populate('loai_du_an')
      .sort({ createdAt: -1 });

    const ids = duAns.map(d => d._id);
    const uocTinhs = await UocTinhChiPhi.find({ ma_du_an: { $in: ids } });
    const utMap = {};
    uocTinhs.forEach(ut => { utMap[ut.ma_du_an.toString()] = ut; });

    res.json(duAns.map(d => ({
      ...d.toObject(),
      uoc_tinh: utMap[d._id.toString()] || null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const data = await _getDuAnFull(req.params.id);
    if (!data) return res.status(404).json({ message: 'Khong tim thay du an' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { ten_du_an, ma_khach_hang, loai_du_an, mo_ta, deadline, trang_thai, yeu_cau } = req.body;
    if (!ten_du_an || !ma_khach_hang || !loai_du_an || !deadline) {
      return res.status(400).json({ message: 'Thieu thong tin bat buoc' });
    }

    const targetStatus = trang_thai || 'draft';
    if (!TRANG_THAI_DU_AN.includes(targetStatus) || ['completed', 'cancelled'].includes(targetStatus)) {
      return res.status(400).json({ message: 'trang_thai tao moi khong hop le' });
    }

    const [khachHang, category] = await Promise.all([
      KhachHang.findById(ma_khach_hang),
      ProjectCategory.findOne({ _id: loai_du_an, deleted_at: null }),
    ]);
    if (!khachHang) return res.status(404).json({ message: 'Khong tim thay khach hang' });
    if (!category) return res.status(404).json({ message: 'Khong tim thay loai du an' });
    if (category.active === false) return res.status(400).json({ message: 'Loai du an dang bi tat' });

    const duAn = await DuAn.create({
      ten_du_an,
      ma_khach_hang,
      loai_du_an,
      mo_ta,
      deadline,
      trang_thai: targetStatus,
      yeu_cau: yeu_cau || {},
      created_by: req.user?._id || null,
      updated_by: req.user?._id || null,
    });

    await _autoUocTinh(duAn._id, duAn);
    res.status(201).json(await _getDuAnFull(duAn._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const { ten_du_an, ma_khach_hang, loai_du_an, mo_ta, deadline, trang_thai, yeu_cau } = req.body;
    const payload = {};

    if (ten_du_an !== undefined) payload.ten_du_an = ten_du_an;
    if (mo_ta !== undefined) payload.mo_ta = mo_ta;
    if (deadline !== undefined) payload.deadline = deadline;
    if (yeu_cau !== undefined) payload.yeu_cau = yeu_cau;

    if (ma_khach_hang !== undefined) {
      const khachHang = await KhachHang.findById(ma_khach_hang);
      if (!khachHang) return res.status(404).json({ message: 'Khong tim thay khach hang' });
      payload.ma_khach_hang = ma_khach_hang;
    }

    if (loai_du_an !== undefined) {
      const category = await ProjectCategory.findOne({ _id: loai_du_an, deleted_at: null });
      if (!category) return res.status(404).json({ message: 'Khong tim thay loai du an' });
      if (category.active === false) return res.status(400).json({ message: 'Loai du an dang bi tat' });
      payload.loai_du_an = loai_du_an;
    }

    if (trang_thai !== undefined && trang_thai !== duAn.trang_thai) {
      if (trang_thai === 'completed') {
        return res.status(400).json({ message: 'Hay dung API hoan-thanh de dong du an va tinh diem' });
      }
      const error = validateTransition(duAn.trang_thai, trang_thai);
      if (error) return res.status(400).json({ message: error });
      payload.trang_thai = trang_thai;
    }

    payload.updated_by = req.user?._id || null;

    const updated = await DuAn.findOneAndUpdate(
      activeProjectFilter({ _id: req.params.id }),
      payload,
      { new: true, runValidators: true }
    );

    await _autoUocTinh(updated._id, updated);
    res.json(await _getDuAnFull(updated._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const duAn = await DuAn.findOneAndUpdate(
      activeProjectFilter({ _id: req.params.id }),
      {
        deleted_at: new Date(),
        deleted_by: req.user?._id || null,
        updated_by: req.user?._id || null,
      },
      { new: true }
    );
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });
    res.json({ message: 'Da xoa mem du an' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeTrangThai = async (req, res) => {
  try {
    const result = await transitionProject(req, req.body.trang_thai, { allowEmployee: true });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.duAn);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uocTinhManual = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const margin = parseNumberField(req.body.ty_le_loi_nhuan, 'ty_le_loi_nhuan', {
      defaultValue: null,
      min: 0,
      max: 1000,
    });
    if (!margin.ok) return res.status(400).json({ message: margin.message });

    const result = await _autoUocTinh(req.params.id, duAn, margin.value, { includeAiReviewed: false });
    if (!result) return res.status(500).json({ message: 'Loi tinh uoc tinh' });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.aiEstimateAnalyze = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const context = await loadAiEstimationContext(duAn);
    const proposal = await analyzeAiEstimation(context, {
      sourceText: req.body?.source_text || '',
    });
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.aiEstimateConfirm = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const conditions = Array.isArray(req.body?.conditions) ? req.body.conditions : [];
    if (conditions.length === 0) {
      return res.status(400).json({ message: 'Can co it nhat mot dieu kien da xac nhan' });
    }

    const context = await loadAiEstimationContext(duAn);
    const projectPayload = req.body?.project || {};
    const requestedCategoryId = objectIdString(projectPayload.ma_loai_du_an || projectPayload.category_id || duAn.loai_du_an);
    const selectedCategory = context.categories.find(category => objectIdString(category._id) === requestedCategoryId);
    if (!selectedCategory) {
      return res.status(400).json({ message: 'Loai du an AI de xuat khong hop le hoac dang bi tat' });
    }

    const targetFields = context.fields.filter(field => objectIdString(field.ma_loai_du_an) === objectIdString(selectedCategory._id));
    const nextRequirements = buildConfirmedRequirements({
      existingYeuCau: duAn.yeu_cau || {},
      conditions,
      fields: targetFields,
      project: projectPayload,
    });

    const payload = {
      loai_du_an: selectedCategory._id,
      yeu_cau: nextRequirements,
      updated_by: req.user?._id || null,
    };

    if (typeof projectPayload.ten_du_an === 'string' && projectPayload.ten_du_an.trim()) {
      payload.ten_du_an = projectPayload.ten_du_an.trim();
    }
    if (typeof projectPayload.mo_ta === 'string') {
      payload.mo_ta = projectPayload.mo_ta.trim();
    }
    if (projectPayload.deadline) {
      if (Number.isNaN(Date.parse(projectPayload.deadline))) {
        return res.status(400).json({ message: 'deadline AI xac nhan khong hop le' });
      }
      payload.deadline = projectPayload.deadline;
    }

    let marginValue = 25;
    if (req.body?.ty_le_loi_nhuan !== undefined) {
      const margin = parseNumberField(req.body.ty_le_loi_nhuan, 'ty_le_loi_nhuan', {
        defaultValue: 25,
        min: 0,
        max: 1000,
      });
      if (!margin.ok) return res.status(400).json({ message: margin.message });
      marginValue = margin.value;
    } else {
      const currentEstimate = await UocTinhChiPhi.findOne({ ma_du_an: req.params.id }).select('ty_le_loi_nhuan');
      marginValue = currentEstimate?.ty_le_loi_nhuan ?? 25;
    }

    const updated = await DuAn.findOneAndUpdate(
      activeProjectFilter({ _id: req.params.id }),
      payload,
      { new: true, runValidators: true }
    );

    await _autoUocTinh(updated._id, updated, marginValue);
    res.json(await _getDuAnFull(updated._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.aiBriefOcr = async (req, res) => {
  try {
    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    if (!fileBuffer.length) {
      return res.status(400).json({ message: 'Can upload anh hoac PDF brief' });
    }

    const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
    if (!allowed.has(mimeType)) {
      return res.status(400).json({ message: 'Chi ho tro PNG, JPG, WEBP hoac PDF' });
    }

    const context = await loadAiEstimationContext({});
    const proposal = await analyzeAiEstimation(context, {
      media: {
        mime_type: mimeType,
        data: fileBuffer.toString('base64'),
      },
    });
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.goiYPhanCong = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const [category, fieldConfigs, allNV] = await Promise.all([
      ProjectCategory.findOne({ _id: duAn.loai_du_an, deleted_at: null }),
      ProjectRequirementField.find({ ma_loai_du_an: duAn.loai_du_an, active: true }).sort({ thu_tu: 1 }),
      NhanVien.find({ trang_thai_lam_viec: 'available' }),
    ]);

    const yeuCau = duAn.yeu_cau || {};
    const doKhoResult = mergeAiReviewedDifficulty(danhGiaDuAn(yeuCau, fieldConfigs), yeuCau);
    const gioCoBan = category?.base_hours ?? category?.gio_co_ban ?? 8;
    const hesoDoKho = HE_SO_DO_KHO[doKhoResult.muc_do_tong_the] || 1.0;
    const hesoDeadline = { binh_thuong: 1.0, gap: 1.2, sieu_gap: 1.5 }[yeuCau.muc_do_gap] || 1.0;
    const tongGio = Math.max(Math.round(gioCoBan * hesoDoKho * hesoDeadline), 1);

    res.json({
      tong_gio_cong: tongGio,
      do_kho: doKhoResult.muc_do_tong_the,
      goi_y: goiYPhanCong(category, tongGio, allNV),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.themPhanCong = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const { ma_nhan_vien, vai_tro_trong_du_an, gio_du_kien } = req.body;
    const nv = await NhanVien.findById(ma_nhan_vien);
    if (!nv) return res.status(404).json({ message: 'Khong tim thay nhan vien' });

    const role = String(vai_tro_trong_du_an || '').trim();
    if (!role) return res.status(400).json({ message: 'vai_tro_trong_du_an la bat buoc' });

    const hours = parseNumberField(gio_du_kien, 'gio_du_kien', { required: true, min: 0.1 });
    if (!hours.ok) return res.status(400).json({ message: hours.message });

    const pc = await PhanCongDuAn.findOneAndUpdate(
      { ma_du_an: req.params.id, ma_nhan_vien, vai_tro_trong_du_an: role },
      {
        ma_du_an: req.params.id,
        ma_nhan_vien,
        vai_tro_trong_du_an: role,
        gio_du_kien: hours.value,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await _autoUocTinh(req.params.id, duAn);
    res.status(201).json(pc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePhanCong = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const current = await PhanCongDuAn.findOne({
      _id: req.params.pcId,
      ma_du_an: req.params.id,
    }).populate('ma_nhan_vien');
    if (!current) return res.status(404).json({ message: 'Khong tim thay phan cong' });

    const payload = {};

    if (!isManagerOrAdmin(req)) {
      const assigned = await ensureAssignedEmployee(req, req.params.id, current);
      if (!assigned.ok) return res.status(assigned.status).json({ message: assigned.message });

      const fields = Object.keys(req.body || {});
      if (fields.length === 0) return res.status(400).json({ message: 'Khong co du lieu cap nhat' });
      if (fields.some(field => field !== 'gio_thuc_te')) {
        return res.status(403).json({ message: 'Nhan vien chi duoc cap nhat gio_thuc_te cua chinh minh' });
      }

      const actualHours = parseNumberField(req.body.gio_thuc_te, 'gio_thuc_te', { required: true, min: 0 });
      if (!actualHours.ok) return res.status(400).json({ message: actualHours.message });
      payload.gio_thuc_te = actualHours.value;
    } else {
      const { ma_nhan_vien, vai_tro_trong_du_an, gio_du_kien, gio_thuc_te, ty_le_dong_gop } = req.body;

      if (ma_nhan_vien !== undefined) {
        const nv = await NhanVien.findById(ma_nhan_vien);
        if (!nv) return res.status(404).json({ message: 'Khong tim thay nhan vien' });
        payload.ma_nhan_vien = ma_nhan_vien;
      }
      if (vai_tro_trong_du_an !== undefined) {
        const role = String(vai_tro_trong_du_an || '').trim();
        if (!role) return res.status(400).json({ message: 'vai_tro_trong_du_an khong duoc rong' });
        payload.vai_tro_trong_du_an = role;
      }
      if (gio_du_kien !== undefined) {
        const plannedHours = parseNumberField(gio_du_kien, 'gio_du_kien', { required: true, min: 0.1 });
        if (!plannedHours.ok) return res.status(400).json({ message: plannedHours.message });
        payload.gio_du_kien = plannedHours.value;
      }
      if (gio_thuc_te !== undefined) {
        const actualHours = parseNumberField(gio_thuc_te, 'gio_thuc_te', { required: true, min: 0 });
        if (!actualHours.ok) return res.status(400).json({ message: actualHours.message });
        payload.gio_thuc_te = actualHours.value;
      }
      if (ty_le_dong_gop !== undefined) {
        if (ty_le_dong_gop === null) {
          payload.ty_le_dong_gop = null;
        } else {
          const ratio = parseNumberField(ty_le_dong_gop, 'ty_le_dong_gop', { required: true, min: 0, max: 1 });
          if (!ratio.ok) return res.status(400).json({ message: ratio.message });
          payload.ty_le_dong_gop = ratio.value;
        }
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ message: 'Khong co du lieu cap nhat' });
      }
    }

    const pc = await PhanCongDuAn.findOneAndUpdate(
      { _id: req.params.pcId, ma_du_an: req.params.id },
      payload,
      { new: true, runValidators: true }
    ).populate('ma_nhan_vien');

    await _autoUocTinh(req.params.id, duAn);

    res.json({
      ...pc.toObject(),
      ho_ten: pc.ma_nhan_vien?.ho_ten,
      vai_tro: pc.ma_nhan_vien?.vai_tro,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.xoaPhanCong = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const deleted = await PhanCongDuAn.findOneAndDelete({
      _id: req.params.pcId,
      ma_du_an: req.params.id,
    });
    if (!deleted) return res.status(404).json({ message: 'Khong tim thay phan cong' });

    await _autoUocTinh(req.params.id, duAn);
    res.json({ message: 'Da xoa phan cong' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateChiPhiKyThuat = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const allowedFields = ['chi_phi_phan_mem', 'chi_phi_render', 'chi_phi_luu_tru', 'chi_phi_tai_nguyen'];
    const payload = { ma_du_an: req.params.id };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const parsed = parseNumberField(req.body[field], field, { required: true, min: 0 });
        if (!parsed.ok) return res.status(400).json({ message: parsed.message });
        payload[field] = parsed.value;
      }
    }

    if (Object.keys(payload).length === 1) {
      return res.status(400).json({ message: 'Khong co chi phi ky thuat can cap nhat' });
    }

    const doc = await ChiPhiKyThuat.findOneAndUpdate(
      { ma_du_an: req.params.id },
      payload,
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await _autoUocTinh(req.params.id, duAn);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function transitionAndRespond(req, res, targetStatus, message) {
  const result = await transitionProject(req, targetStatus);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  return res.json({ message, duAn: result.duAn });
}

exports.guiBaoGia = async (req, res) => {
  try {
    return await transitionAndRespond(req, res, 'quoted', 'Da gui bao gia');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.khachDuyet = async (req, res) => {
  try {
    return await transitionAndRespond(req, res, 'approved', 'Khach hang da duyet');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.batDau = async (req, res) => {
  try {
    return await transitionAndRespond(req, res, 'in_progress', 'Du an dang thuc hien');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.chuyenReview = async (req, res) => {
  try {
    return await transitionAndRespond(req, res, 'review', 'Da chuyen sang review');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.huy = async (req, res) => {
  try {
    return await transitionAndRespond(req, res, 'cancelled', 'Da huy du an');
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.hoanThanh = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });
    const alreadyScored = await LichSuDiem.exists({ ma_du_an: req.params.id });

    if (duAn.trang_thai === 'completed' && alreadyScored) {
      return res.status(409).json({ message: 'Du an da hoan thanh truoc do' });
    }
    if (!['review', 'completed'].includes(duAn.trang_thai)) {
      return res.status(400).json({ message: 'Chi co the hoan thanh du an dang review hoac completed chua tinh diem' });
    }

    const assignmentCount = await PhanCongDuAn.countDocuments({ ma_du_an: req.params.id });
    if (assignmentCount === 0) {
      return res.status(400).json({ message: 'Can phan cong nhan vien truoc khi hoan thanh du an' });
    }

    if (alreadyScored) {
      return res.status(409).json({ message: 'Du an da duoc tinh diem truoc do' });
    }

    const {
      tong_chi_phi_thuc_te,
      gia_ban_thuc_te,
      so_lan_sua_thuc_te,
      so_ngay_tre_deadline,
      danh_gia,
      so_sao,
      ty_le_dong_gop,
    } = req.body;

    const soSao = parseNumberField(so_sao, 'so_sao', { required: true, min: 0, max: 5 });
    if (!soSao.ok) return res.status(400).json({ message: soSao.message });

    const actualCost = parseNumberField(tong_chi_phi_thuc_te, 'tong_chi_phi_thuc_te', { required: true, min: 0 });
    if (!actualCost.ok) return res.status(400).json({ message: actualCost.message });

    const salePrice = parseNumberField(gia_ban_thuc_te, 'gia_ban_thuc_te', { required: true, min: 0 });
    if (!salePrice.ok) return res.status(400).json({ message: salePrice.message });

    const revisions = parseNumberField(so_lan_sua_thuc_te, 'so_lan_sua_thuc_te', { defaultValue: 0, min: 0 });
    if (!revisions.ok) return res.status(400).json({ message: revisions.message });

    const lateDays = parseNumberField(so_ngay_tre_deadline, 'so_ngay_tre_deadline', { defaultValue: 0, min: 0 });
    if (!lateDays.ok) return res.status(400).json({ message: lateDays.message });

    const ratios = validateContributionRatios(ty_le_dong_gop);
    if (!ratios.ok) return res.status(400).json({ message: ratios.message });

    if (danh_gia !== undefined && !Array.isArray(danh_gia)) {
      return res.status(400).json({ message: 'danh_gia phai la mang' });
    }

    await DuAn.findOneAndUpdate(
      activeProjectFilter({ _id: req.params.id }),
      {
        trang_thai: 'completed',
        so_sao: soSao.value,
        ngay_danh_gia: new Date(),
        updated_by: req.user?._id || null,
      },
      { new: true, runValidators: true }
    );

    const uocTinhDoc = await UocTinhChiPhi.findOne({ ma_du_an: req.params.id });
    const loiNhuanThucTe = salePrice.value - actualCost.value;

    await ChiPhiThucTe.findOneAndUpdate(
      { ma_du_an: req.params.id },
      {
        ma_du_an: req.params.id,
        tong_chi_phi_thuc_te: actualCost.value,
        gia_ban_thuc_te: salePrice.value,
        loi_nhuan_thuc_te: loiNhuanThucTe,
        so_lan_sua_thuc_te: revisions.value,
        so_ngay_tre_deadline: lateDays.value,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (uocTinhDoc && salePrice.value > 0) {
      const doChinhXac = uocTinhDoc.gia_de_xuat > 0
        ? Math.round((1 - Math.abs(salePrice.value - uocTinhDoc.gia_de_xuat) / uocTinhDoc.gia_de_xuat) * 100)
        : 0;

      await DuLieuHocMay.findOneAndUpdate(
        { ma_du_an: req.params.id },
        {
          ma_du_an: req.params.id,
          chi_phi_du_doan: uocTinhDoc.gia_de_xuat,
          chi_phi_thuc_te: salePrice.value,
          do_chinh_xac_du_doan: Math.max(0, doChinhXac),
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }

    if (danh_gia?.length > 0) {
      await DanhGiaHieuSuat.deleteMany({ ma_du_an: req.params.id });
      await DanhGiaHieuSuat.insertMany(danh_gia.map(d => ({
        ma_nhan_vien: d.ma_nhan_vien,
        ma_du_an: req.params.id,
        diem_chat_luong: d.diem_chat_luong,
        so_ngay_tre: d.so_ngay_tre,
        so_lan_sua: d.so_lan_sua,
        nhan_xet_quan_ly: d.nhan_xet_quan_ly,
      })));
    }

    const scoringResult = await tinhDiemDuAn(req.params.id, {
      soSao: soSao.value,
      soNgayTre: lateDays.value,
      soLanSua: revisions.value,
      tyLeDongGopMap: ratios.value,
    });

    res.json({
      message: 'Du an hoan thanh, diem nhan vien da duoc cap nhat',
      scoring: scoringResult,
    });
  } catch (err) {
    console.error('[HoanThanh]', err.stack);
    res.status(500).json({ message: err.message });
  }
};

exports.tinhDiem = async (req, res) => {
  try {
    const duAn = await findActiveProject(req.params.id);
    if (!duAn) return res.status(404).json({ message: 'Khong tim thay du an' });

    const { so_sao, so_ngay_tre, so_lan_sua, ty_le_dong_gop } = req.body;
    const soSao = parseNumberField(so_sao, 'so_sao', { required: true, min: 0, max: 5 });
    if (!soSao.ok) return res.status(400).json({ message: soSao.message });

    const lateDays = parseNumberField(so_ngay_tre, 'so_ngay_tre', { defaultValue: 0, min: 0 });
    if (!lateDays.ok) return res.status(400).json({ message: lateDays.message });

    const revisions = parseNumberField(so_lan_sua, 'so_lan_sua', { defaultValue: 0, min: 0 });
    if (!revisions.ok) return res.status(400).json({ message: revisions.message });

    const ratios = validateContributionRatios(ty_le_dong_gop);
    if (!ratios.ok) return res.status(400).json({ message: ratios.message });

    const result = await tinhDiemDuAn(req.params.id, {
      soSao: soSao.value,
      soNgayTre: lateDays.value,
      soLanSua: revisions.value,
      tyLeDongGopMap: ratios.value,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLichSuDiem = async (req, res) => {
  try {
    const history = await LichSuDiem.find({ ma_du_an: req.params.id })
      .populate('ma_nhan_vien', 'ho_ten')
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
