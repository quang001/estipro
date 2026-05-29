/**
 * models/index.js
 * Export tập trung các model phụ
 *
 * THAY ĐỔI: UocTinhChiPhiSchema thêm field do_kho
 * để lưu kết quả đánh giá độ khó từ difficultyEngine
 */
const mongoose = require('mongoose');

// ─── DanhGiaHieuSuat ────────────────────────────────────────────────────────
const DanhGiaHieuSuatSchema = new mongoose.Schema({
  ma_nhan_vien:     { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true },
  ma_du_an:         { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn',     required: true },
  diem_chat_luong:  { type: Number, min: 1, max: 10 },
  so_ngay_tre:      { type: Number, default: 0 },
  so_lan_sua:       { type: Number, default: 0 },
  nhan_xet_quan_ly: { type: String },
}, { timestamps: true, collection: 'danh_gia_hieu_suat' });

// ─── ChiPhiKyThuat ──────────────────────────────────────────────────────────
const ChiPhiKyThuatSchema = new mongoose.Schema({
  ma_du_an:           { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn', required: true, unique: true },
  chi_phi_phan_mem:   { type: Number, default: 0 },
  chi_phi_render:     { type: Number, default: 0 },
  chi_phi_luu_tru:    { type: Number, default: 0 },
  chi_phi_tai_nguyen: { type: Number, default: 0 },
}, { timestamps: true, collection: 'chi_phi_ky_thuat' });

// ─── PhanTichRuiRo ──────────────────────────────────────────────────────────
const PhanTichRuiRoSchema = new mongoose.Schema({
  ma_du_an:         { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn', required: true, unique: true },
  phan_tram_rui_ro: { type: Number, default: 10 },
  ly_do_rui_ro:     { type: String },
}, { timestamps: true, collection: 'phan_tich_rui_ro' });

// ─── UocTinhChiPhi ──────────────────────────────────────────────────────────
const UocTinhChiPhiSchema = new mongoose.Schema({
  ma_du_an:             { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn', required: true, unique: true },
  chi_phi_nhan_su:      { type: Number, default: 0 },
  chi_phi_ky_thuat:     { type: Number, default: 0 },
  chi_phi_rui_ro:       { type: Number, default: 0 },
  tong_chi_phi_du_kien: { type: Number, default: 0 },
  ty_le_loi_nhuan:      { type: Number, default: 25 },
  gia_de_xuat:          { type: Number, default: 0 },
  // Metadata từ difficultyEngine + estimationEngine
  he_so_deadline:   { type: Number },
  phan_tram_rui_ro: { type: Number },
  ly_do_rui_ro:     { type: String },
  tong_gio_cong:    { type: Number },
  phan_cong_goi_y:  { type: mongoose.Schema.Types.Mixed },
  // ── MỚI: Kết quả đánh giá độ khó từ difficultyEngine ───────────────────
  // Dùng để frontend hiển thị DifficultyBadge mà không cần tính lại
  do_kho: {
    muc_do:       { type: String, enum: ['de', 'trung_binh', 'kho', 'rat_kho'], default: null },
    diem:         { type: Number, default: null },    // điểm trung bình (1.0 - 4.0)
    he_so_do_kho: { type: Number, default: null },    // 1.0 / 1.3 / 1.7 / 2.2
    chi_tiet:     { type: mongoose.Schema.Types.Mixed, default: [] }, // mảng chi tiết từng field
  },
}, { timestamps: true, collection: 'uoc_tinh_chi_phi' });

// ─── ChiPhiThucTe ────────────────────────────────────────────────────────────
const ChiPhiThucTeSchema = new mongoose.Schema({
  ma_du_an:             { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn', required: true, unique: true },
  tong_chi_phi_thuc_te: { type: Number, default: 0 },
  gia_ban_thuc_te:      { type: Number, default: 0 },
  loi_nhuan_thuc_te:    { type: Number, default: 0 },
  so_lan_sua_thuc_te:   { type: Number, default: 0 },
  so_ngay_tre_deadline: { type: Number, default: 0 },
}, { timestamps: true, collection: 'chi_phi_thuc_te' });

// ─── DuLieuHocMay ────────────────────────────────────────────────────────────
const DuLieuHocMaySchema = new mongoose.Schema({
  ma_du_an:             { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn', required: true },
  chi_phi_du_doan:      { type: Number },
  chi_phi_thuc_te:      { type: Number },
  do_chinh_xac_du_doan: { type: Number },
}, { timestamps: true, collection: 'du_lieu_hoc_may' });

module.exports = {
  DanhGiaHieuSuat: mongoose.model('DanhGiaHieuSuat', DanhGiaHieuSuatSchema),
  ChiPhiKyThuat:   mongoose.model('ChiPhiKyThuat',   ChiPhiKyThuatSchema),
  PhanTichRuiRo:   mongoose.model('PhanTichRuiRo',   PhanTichRuiRoSchema),
  UocTinhChiPhi:   mongoose.model('UocTinhChiPhi',   UocTinhChiPhiSchema),
  ChiPhiThucTe:    mongoose.model('ChiPhiThucTe',    ChiPhiThucTeSchema),
  DuLieuHocMay:    mongoose.model('DuLieuHocMay',    DuLieuHocMaySchema),
};
