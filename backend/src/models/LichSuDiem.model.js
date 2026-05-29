const mongoose = require('mongoose')

const LichSuDiemSchema = new mongoose.Schema({
  ma_nhan_vien:   { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true },
  ma_du_an:       { type: mongoose.Schema.Types.ObjectId, ref: 'DuAn',     required: true },
  diem_cong:      { type: Number, required: true },           // có thể âm (penalty)
  loai:           { type: String, enum: ['reward', 'penalty'], required: true },
  ly_do:          { type: String, required: true },
  so_sao_du_an:   { type: Number, min: 0, max: 5 },          // snapshot sao lúc tính
  ty_le_dong_gop: { type: Number, min: 0, max: 1 },          // snapshot tỉ lệ
  cap_do_truoc:   { type: String },
  cap_do_sau:     { type: String },
}, { timestamps: true, collection: 'lich_su_diem' })

LichSuDiemSchema.index({ ma_nhan_vien: 1, createdAt: -1 })
LichSuDiemSchema.index({ ma_du_an: 1 })

module.exports = mongoose.models.LichSuDiem || mongoose.model('LichSuDiem', LichSuDiemSchema);