const mongoose = require('mongoose')

const PhanCongDuAnSchema = new mongoose.Schema({
  ma_du_an:            { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn',     required: true },
  ma_nhan_vien:        { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true },
  vai_tro_trong_du_an: { type: String, required: true },
  gio_du_kien:         { type: Number, required: true },
  gio_thuc_te:         { type: Number, default: 0 },
  ty_le_dong_gop:      { type: Number, default: null, min: 0, max: 1 },
}, { timestamps: true, collection: 'phan_cong_du_an' })

PhanCongDuAnSchema.index({ ma_du_an: 1, ma_nhan_vien: 1, vai_tro_trong_du_an: 1 });

module.exports = mongoose.models.PhanCongDuAn || mongoose.model('PhanCongDuAn', PhanCongDuAnSchema);
