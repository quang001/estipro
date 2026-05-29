const mongoose = require('mongoose')
const { CAP_DO_NHAN_VIEN } = require('../config/constants')

const CapDoNhanVienSchema = new mongoose.Schema({
  ten_cap_do:              { type: String, required: true, unique: true, enum: CAP_DO_NHAN_VIEN },
  mo_ta:                   { type: String },
  luong_mac_dinh_theo_gio: { type: Number, required: true },
}, { timestamps: true, collection: 'cap_do_nhan_vien' })

module.exports = mongoose.models.CapDoNhanVien || mongoose.model('CapDoNhanVien', CapDoNhanVienSchema);