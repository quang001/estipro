const mongoose = require('mongoose')
const { VAI_TRO_NHAN_VIEN, TRANG_THAI_LAM_VIEC } = require('../config/constants')

const NhanVienSchema = new mongoose.Schema({
  ma_cap_do:           { type: mongoose.Schema.Types.ObjectId, ref: 'CapDoNhanVien', required: true },
  ho_ten:              { type: String, required: true },
  email:               { type: String, required: true, unique: true },
  so_dien_thoai:       { type: String },
  vai_tro:             { type: String, required: true, enum: VAI_TRO_NHAN_VIEN },
  luong_theo_gio:      { type: Number, required: true },
  trang_thai_lam_viec: { type: String, default: 'available', enum: TRANG_THAI_LAM_VIEC },
  // ─── Scoring ─────────────────────────────────────────────────────────
  diem_tich_luy:   { type: Number, default: 0, min: 0 },
  so_lan_0_sao:    { type: Number, default: 0, min: 0 },
  tong_du_an:      { type: Number, default: 0, min: 0 },
  diem_trung_binh: { type: Number, default: 0 },
}, { timestamps: true, collection: 'nhan_vien' })

module.exports = mongoose.models.NhanVien || mongoose.model('NhanVien', NhanVienSchema);