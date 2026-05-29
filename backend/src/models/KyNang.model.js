const mongoose = require('mongoose');

const KyNangSchema = new mongoose.Schema({
  ten_ky_nang: { type: String, required: true, unique: true },
}, { timestamps: true, collection: 'ky_nang' });

const KyNangNhanVienSchema = new mongoose.Schema({
  ma_nhan_vien:      { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true },
  ma_ky_nang:        { type: mongoose.Schema.Types.ObjectId, ref: 'KyNang',   required: true },
  muc_do_thanh_thao: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },
}, { timestamps: true, collection: 'ky_nang_nhan_vien' });

module.exports = {
  KyNang:         mongoose.model('KyNang', KyNangSchema),
  KyNangNhanVien: mongoose.model('KyNangNhanVien', KyNangNhanVienSchema),
};
