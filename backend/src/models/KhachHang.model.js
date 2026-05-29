const mongoose = require('mongoose');

const KhachHangSchema = new mongoose.Schema({
  ten_cong_ty:   { type: String, required: true },
  nguoi_lien_he: { type: String, required: true },
  email:         { type: String, required: true },
  so_dien_thoai: { type: String },
  dia_chi:       { type: String },
  // Ảnh hưởng trực tiếp tới buffer rủi ro trong estimationEngine
  diem_do_kho:   { type: Number, default: 3, min: 1, max: 5 },
  ghi_chu:       { type: String },
}, { timestamps: true, collection: 'khach_hang' });

module.exports = mongoose.model('KhachHang', KhachHangSchema);
