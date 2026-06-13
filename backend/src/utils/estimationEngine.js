// utils/estimationEngine.js
//
// VAI TRÒ SAU KHI THỐNG NHẤT:
//
//   tinhChiPhiKyThuat(category, yeuCau, chiPhiManual)
//     → Chi phí phần mềm/render/lưu trữ
//     → Dùng category.tech_cost_base từ DB (không còn RATE_CARD)
//
//   tinhRuiRo(category, yeuCau, diemDoKho)
//     → Buffer rủi ro theo khách hàng + deadline + loại DA
//     → Dùng category.slug để nhận diện loại DA kỹ thuật cao
//
//   goiYPhanCong(category, tongGioCong, danhSachNV)
//     → Gợi ý nhân viên theo vai trò
//     → Dùng category.required_roles từ DB (không còn RATE_CARD)
//
//   RATE_CARD giữ lại làm FALLBACK khi category chưa có field mới
//   (dữ liệu cũ chưa migrate hoặc category tạo trước khi có schema mới)
//
//   uocTinh() — legacy, không dùng trong _autoUocTinh nữa

// ─── RATE_CARD: chỉ dùng làm fallback ───────────────────────────────────────
const RATE_CARD_FALLBACK = {
  intro_animation:  { base_hours: 8,  tech_cost_base: 200000, required_roles: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }] },
  video_quang_cao:  { base_hours: 16, tech_cost_base: 300000, required_roles: [{ vai_tro: 'video_editor', phan_tram: 50 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 25 }] },
  video_san_xuat:   { base_hours: 24, tech_cost_base: 500000, required_roles: [{ vai_tro: 'video_editor', phan_tram: 60 }, { vai_tro: 'designer', phan_tram: 20 }, { vai_tro: 'photographer', phan_tram: 20 }] },
  motion_graphics:  { base_hours: 12, tech_cost_base: 250000, required_roles: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }] },
  animation_2d:     { base_hours: 20, tech_cost_base: 400000, required_roles: [{ vai_tro: 'animator', phan_tram: 60 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 15 }] },
  animation_3d:     { base_hours: 30, tech_cost_base: 800000, required_roles: [{ vai_tro: 'animator', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 20 }, { vai_tro: 'designer', phan_tram: 10 }] },
  vfx:              { base_hours: 20, tech_cost_base: 1000000,required_roles: [{ vai_tro: 'vfx_artist', phan_tram: 70 }, { vai_tro: 'animator', phan_tram: 30 }] },
  thiet_ke_logo:    { base_hours: 16, tech_cost_base: 50000,  required_roles: [{ vai_tro: 'designer', phan_tram: 100 }] },
  thiet_ke_banner:  { base_hours: 4,  tech_cost_base: 30000,  required_roles: [{ vai_tro: 'designer', phan_tram: 100 }] },
  chinh_sua_anh:    { base_hours: 1,  tech_cost_base: 20000,  required_roles: [{ vai_tro: 'designer', phan_tram: 60 }, { vai_tro: 'photographer', phan_tram: 40 }] },
  social_media:     { base_hours: 2,  tech_cost_base: 50000,  required_roles: [{ vai_tro: 'designer', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 30 }] },
  khac:             { base_hours: 8,  tech_cost_base: 100000, required_roles: [{ vai_tro: 'designer', phan_tram: 50 }, { vai_tro: 'animator', phan_tram: 50 }] },
};

// ─── Helper: lấy fallback theo slug ─────────────────────────────────────────
function _fallback(slug) {
  return RATE_CARD_FALLBACK[slug] || RATE_CARD_FALLBACK.khac;
}

// ─── tinhChiPhiKyThuat ────────────────────────────────────────────────────────
// Nhận category object từ DB (có tech_cost_base)
// Fallback về RATE_CARD nếu category chưa có field này
function sumManualTechnicalCost(chiPhiKyThuatManual = null) {
  if (!chiPhiKyThuatManual) return null;
  const {
    chi_phi_phan_mem   = 0,
    chi_phi_render     = 0,
    chi_phi_luu_tru    = 0,
    chi_phi_tai_nguyen = 0,
  } = chiPhiKyThuatManual;
  const total = [chi_phi_phan_mem, chi_phi_render, chi_phi_luu_tru, chi_phi_tai_nguyen]
    .reduce((sum, value) => sum + (Number(value) || 0), 0);
  return total > 0 ? total : null;
}

function tinhChiPhiKyThuat(category, yeuCau, chiPhiKyThuatManual = null) {
  // Nếu đã nhập thủ công → dùng luôn
  const manualTotal = sumManualTechnicalCost(chiPhiKyThuatManual);
  if (manualTotal !== null) return manualTotal;

  const slug = category?.slug || 'khac';
  // Ưu tiên lấy từ DB, fallback về RATE_CARD
  let base = category?.tech_cost_base ?? _fallback(slug).tech_cost_base ?? 100000;

  // Điều chỉnh theo chất lượng output
  if (yeuCau?.do_phan_giai === '4K')      base *= 2;
  else if (yeuCau?.do_phan_giai === '2K') base *= 1.4;

  // Loại DA nặng về render → tính thêm theo thời lượng
  if (['animation_3d', 'vfx', 'animation_2d'].includes(slug)) {
    base += (yeuCau?.thoi_luong_giay || 30) * 5000;
  }

  return Math.round(base);
}

// ─── tinhRuiRo ────────────────────────────────────────────────────────────────
// Nhận category object từ DB để lấy slug nhận diện loại DA
function tinhRuiRo(category, yeuCau, diemDoKho = 3) {
  const slug = category?.slug || 'khac';
  let pct    = 0.05;
  const reasons = [];

  // Rủi ro từ phía khách hàng
  if (diemDoKho >= 5)      { pct += 0.15; reasons.push('Khách hàng rất khó tính (5/5)'); }
  else if (diemDoKho >= 4) { pct += 0.08; reasons.push('Khách hàng khó tính'); }

  // Rủi ro deadline
  if (yeuCau?.muc_do_gap === 'sieu_gap')     { pct += 0.12; reasons.push('Deadline siêu gấp'); }
  else if (yeuCau?.muc_do_gap === 'gap')     { pct += 0.06; reasons.push('Deadline gấp'); }

  // Rủi ro số lần sửa
  const soLanSua = yeuCau?.so_lan_chinh_sua || 2;
  if (soLanSua > 5)      { pct += 0.10; reasons.push(`Nhiều vòng sửa (${soLanSua} lần)`); }
  else if (soLanSua > 3) { pct += 0.05; reasons.push(`Vòng sửa cao (${soLanSua} lần)`); }

  // Rủi ro theo loại DA kỹ thuật cao
  if (['animation_3d', 'vfx'].includes(slug))                { pct += 0.10; reasons.push('Dự án kỹ thuật cao (3D/VFX)'); }
  else if (['animation_2d', 'motion_graphics'].includes(slug)) { pct += 0.06; reasons.push('Dự án animation'); }

  // Rủi ro chất lượng output
  if (yeuCau?.do_phan_giai === '4K') { pct += 0.05; reasons.push('Output 4K'); }
  if (yeuCau?.muc_do_phuc_tap?.includes('Phức tạp')) { pct += 0.12; reasons.push('VFX cực kỳ phức tạp'); }

  return { pct: Math.min(pct, 0.45), reasons };
}

// ─── goiYPhanCong ─────────────────────────────────────────────────────────────
// Nhận category object từ DB để lấy required_roles
// Fallback về RATE_CARD nếu category chưa có field này
function goiYPhanCong(category, tongGioCong, danhSachNV = []) {
  const slug = category?.slug || 'khac';

  // Ưu tiên schema mới required_roles, fallback schema cũ vai_tro_mac_dinh rồi RATE_CARD
  const roles = (category?.required_roles?.length > 0)
    ? category.required_roles
    : (category?.vai_tro_mac_dinh?.length > 0)
      ? category.vai_tro_mac_dinh
      : _fallback(slug).required_roles;

  const suggestions = [];
  for (const role of roles) {
    const gioRole  = Math.round(tongGioCong * role.phan_tram / 100);
    const nvPhuHop = danhSachNV
      .filter(nv => nv.vai_tro === role.vai_tro && nv.trang_thai_lam_viec === 'available')
      .sort((a, b) => b.luong_theo_gio - a.luong_theo_gio);

    if (nvPhuHop.length > 0) {
      const nv = nvPhuHop[0];
      suggestions.push({
        ma_nhan_vien:        nv._id,
        ho_ten:              nv.ho_ten,
        vai_tro:             role.vai_tro,
        vai_tro_trong_du_an: `${role.vai_tro} (${role.phan_tram}%)`,
        gio_du_kien:         gioRole,
        luong_theo_gio:      nv.luong_theo_gio,
        chi_phi_du_kien:     gioRole * nv.luong_theo_gio,
      });
    }
  }
  return suggestions;
}

// ─── uocTinh (legacy — giữ để không break nơi khác import) ──────────────────
// KHÔNG dùng trong _autoUocTinh nữa
const uocTinh = ({ loai_du_an, phanCong, chiPhiKT, yeuCau, diemDoKho, tyLeLoiNhuan = 20, danhSachNV = [] }) => {
  console.warn('[estimationEngine] uocTinh() legacy được gọi — nên dùng _autoUocTinh() thay thế');
  const fb = _fallback(loai_du_an || 'khac');
  const tongGioCong = fb.base_hours;
  let chiPhiNhanSu  = 0, phanCongGoiY = [];
  if (phanCong?.length > 0) {
    chiPhiNhanSu = phanCong.reduce((s, pc) => s + (pc.luong_theo_gio || 0) * (pc.gio_du_kien || 0), 0);
  }
  const tongKT       = fb.tech_cost_base;
  const tongCoBan    = chiPhiNhanSu + tongKT;
  const hesoDeadline = { binh_thuong: 1.0, gap: 1.3, sieu_gap: 1.7 }[yeuCau?.muc_do_gap] || 1.0;
  const pctRuiRo     = 0.05;
  const chiPhiRuiRo  = tongCoBan * hesoDeadline * pctRuiRo;
  const tongDuKien   = tongCoBan * hesoDeadline + chiPhiRuiRo;
  const giaDexuat    = tongDuKien * (1 + tyLeLoiNhuan / 100);
  return {
    chi_phi_nhan_su:      Math.round(chiPhiNhanSu),
    chi_phi_ky_thuat:     Math.round(tongKT),
    he_so_deadline:       hesoDeadline,
    phan_tram_rui_ro:     5,
    chi_phi_rui_ro:       Math.round(chiPhiRuiRo),
    tong_chi_phi_du_kien: Math.round(tongDuKien),
    ty_le_loi_nhuan:      tyLeLoiNhuan,
    gia_de_xuat:          Math.round(giaDexuat),
    ly_do_rui_ro:         'Rủi ro cơ bản (legacy)',
    tong_gio_cong:        Math.round(tongGioCong),
    phan_cong_goi_y:      phanCongGoiY,
  };
};

module.exports = {
  tinhChiPhiKyThuat,
  tinhRuiRo,
  goiYPhanCong,
  uocTinh,
  // Export fallback để script migrate có thể dùng
  RATE_CARD_FALLBACK,
};
