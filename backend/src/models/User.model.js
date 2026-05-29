const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ho_ten:   { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  vai_tro:  { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  phone:    { type: String, default: '' },
  department: { type: String, default: '' },
  location: { type: String, default: '' },
  timezone: { type: String, default: 'GMT+7' },
  bio:      { type: String, default: '' },
  avatar:   { type: String, default: '' },
  two_factor_enabled: { type: Boolean, default: false },
}, { timestamps: true, collection: 'users' })

// Tự động hash password trước khi lưu
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

UserSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password)
}

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
