// backend utils/difficultyEngine.js

// ── Map độ khó sang điểm số ─────────────────────────────────────────────────
const MUC_DO_DIEM = {
  de:          1,
  trung_binh:  2,
  kho:         3,
  rat_kho:     4,
};

// ── Map điểm trung bình sang mức độ ─────────────────────────────────────────
function diemSangMucDo(avg) {
  if (avg < 1.5) return 'de';
  if (avg < 2.5) return 'trung_binh';
  if (avg < 3.5) return 'kho';
  return 'rat_kho';
}

// ── Đánh giá 1 field NUMBER ─────────────────────────────────────────────────
function danhGiaNumber(value, cau_hinh_do_kho_number) {
  if (!cau_hinh_do_kho_number || cau_hinh_do_kho_number.length === 0) return null;
  const num = Number(value);
  if (isNaN(num)) return null;

  for (const range of cau_hinh_do_kho_number) {
    if (num >= range.min && num <= range.max) {
      return { muc_do: range.muc_do, diem: range.diem };
    }
  }
  // Ngoài khoảng — lấy khoảng cuối cùng
  const last = cau_hinh_do_kho_number[cau_hinh_do_kho_number.length - 1];
  return { muc_do: last.muc_do, diem: last.diem };
}

// ── Đánh giá 1 field SELECT ─────────────────────────────────────────────────
function danhGiaSelect(value, options) {
  if (!options || options.length === 0) return null;
  const opt = options.find(o => String(o.value) === String(value));
  if (!opt) return null;
  return { muc_do: opt.muc_do, diem: opt.diem };
}

// ── Đánh giá 1 field BOOLEAN ─────────────────────────────────────────────────
function danhGiaBoolean(value, options) {
  return danhGiaSelect(String(value), options);
}

// ── Đánh giá 1 field MULTISELECT ─────────────────────────────────────────────
function danhGiaMultiselect(values, options, rule = 'max') {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (!options || options.length === 0) return null;

  const matched = values
    .map(v => options.find(o => String(o.value) === String(v)))
    .filter(Boolean);

  if (matched.length === 0) return null;

  const diems = matched.map(o => o.diem);

  let diem;
  if (rule === 'max') {
    diem = Math.max(...diems);
  } else if (rule === 'sum') {
    diem = diems.reduce((a, b) => a + b, 0);
  } else { // average
    diem = diems.reduce((a, b) => a + b, 0) / diems.length;
  }

  diem = Math.min(Math.round(diem), 4);
  const muc_do = Object.entries(MUC_DO_DIEM).find(([, d]) => d === diem)?.[0] || 'kho';
  return { muc_do, diem };
}

// ── Đánh giá toàn bộ yêu cầu của 1 dự án ────────────────────────────────────
/**
 * @param {Object} yeuCauData  - { field_key: value, ... }
 * @param {Array}  fieldConfigs - mảng ProjectRequirementField documents
 * @returns {Object} { chi_tiet_do_kho, muc_do_tong_the, diem_do_kho_tong }
 */
function danhGiaDuAn(yeuCauData, fieldConfigs) {
  const chi_tiet = [];
  let tongDiem = 0;
  let soField  = 0;

  for (const field of fieldConfigs) {
    if (!field.active) continue;
    const gia_tri = yeuCauData[field.field_key];
    if (gia_tri === undefined || gia_tri === null || gia_tri === '') continue;

    let ketQua = null;

    switch (field.type) {
      case 'number':
        ketQua = danhGiaNumber(gia_tri, field.cau_hinh_do_kho_number);
        break;
      case 'select':
        ketQua = danhGiaSelect(gia_tri, field.options);
        break;
      case 'boolean':
        ketQua = danhGiaBoolean(gia_tri, field.options);
        break;
      case 'multiselect':
        ketQua = danhGiaMultiselect(gia_tri, field.options, field.multiselect_rule);
        break;
      default:
        break;
    }

    if (ketQua) {
      chi_tiet.push({
        field_key:   field.field_key,
        label:       field.label,
        gia_tri,
        muc_do:      ketQua.muc_do,
        diem_do_kho: ketQua.diem,
      });
      tongDiem += ketQua.diem;
      soField  += 1;
    }
  }

  const diem_trung_binh = soField > 0 ? tongDiem / soField : 1;
  const muc_do_tong_the = diemSangMucDo(diem_trung_binh);

  return {
    chi_tiet_do_kho:  chi_tiet,
    muc_do_tong_the,
    diem_do_kho_tong: Math.round(diem_trung_binh * 100) / 100,
  };
}

// ── Hệ số tính giá theo độ khó tổng ─────────────────────────────────────────
const HE_SO_DO_KHO = {
  de:          1.0,
  trung_binh:  1.3,
  kho:         1.7,
  rat_kho:     2.2,
};

const HE_SO_DEADLINE = {
  binh_thuong: 1.0,
  gap:         1.2,
  sieu_gap:    1.5,
};

/**
 * Tính giá đơn giản theo công thức mới:
 *   tong_gio = gio_co_ban * he_so_do_kho * he_so_deadline
 *   chi_phi_nhan_su = SUM(luong_nhan_vien * gio_du_kien)
 *   tong = chi_phi_nhan_su + chi_phi_ky_thuat + loi_nhuan
 */
function tinhGiaDynamic({ gio_co_ban, muc_do_tong_the, muc_do_gap, phanCong, chi_phi_ky_thuat_base, ty_le_loi_nhuan = 25 }) {
  const hesoDoKho    = HE_SO_DO_KHO[muc_do_tong_the]   || 1.0;
  const hesoDeadline = HE_SO_DEADLINE[muc_do_gap]       || 1.0;
  const tong_gio     = Math.max(gio_co_ban * hesoDoKho * hesoDeadline, 1);

  const chi_phi_nhan_su = (phanCong || []).reduce(
    (s, pc) => s + (pc.luong_theo_gio || 0) * (pc.gio_du_kien || tong_gio),
    0
  );
  const chi_phi_ky_thuat = chi_phi_ky_thuat_base || 0;
  const tong_co_ban      = chi_phi_nhan_su + chi_phi_ky_thuat;
  const gia_de_xuat      = Math.round(tong_co_ban * (1 + ty_le_loi_nhuan / 100));

  return {
    tong_gio_cong:        Math.round(tong_gio),
    he_so_do_kho:         hesoDoKho,
    he_so_deadline:       hesoDeadline,
    chi_phi_nhan_su:      Math.round(chi_phi_nhan_su),
    chi_phi_ky_thuat:     Math.round(chi_phi_ky_thuat),
    tong_chi_phi_du_kien: Math.round(tong_co_ban),
    ty_le_loi_nhuan,
    gia_de_xuat,
  };
}

module.exports = {
  danhGiaDuAn,
  tinhGiaDynamic,
  HE_SO_DO_KHO,
  HE_SO_DEADLINE,
  MUC_DO_DIEM,
  diemSangMucDo,
};
