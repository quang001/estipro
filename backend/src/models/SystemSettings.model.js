const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, immutable: true },

  profitMargin: { type: Number, default: 25, min: 0, max: 200 },
  renderCostPerHour: { type: Number, default: 15, min: 0 },
  softwareLicense: { type: Number, default: 45, min: 0 },

  payrollCoeff: { type: Number, default: 1.5, min: 0 },
  bonusDeltaUp: { type: Number, default: 2, min: 0 },
  bonusDeltaDown: { type: Number, default: 2, min: 0 },
  promotionThreshold: { type: Number, default: 200, min: 1 },
  demotionZeroStar: { type: Number, default: 5, min: 1 },

  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'system_settings' });

module.exports = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
