const SystemSettings = require('../models/SystemSettings.model');

const DEFAULT_SYSTEM_SETTINGS = {
  profitMargin: 25,
  renderCostPerHour: 15,
  softwareLicense: 45,
  payrollCoeff: 1.5,
  bonusDeltaUp: 2,
  bonusDeltaDown: 2,
  promotionThreshold: 200,
  demotionZeroStar: 5,
};

const NUMERIC_FIELDS = Object.keys(DEFAULT_SYSTEM_SETTINGS);

function normalizeSettings(doc = {}) {
  const source = doc.toObject?.() || doc || {};
  return NUMERIC_FIELDS.reduce((acc, field) => {
    const value = Number(source[field]);
    acc[field] = Number.isFinite(value) ? value : DEFAULT_SYSTEM_SETTINGS[field];
    return acc;
  }, {});
}

function sanitizeSettings(payload = {}) {
  const next = {};
  for (const field of NUMERIC_FIELDS) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') continue;
    const value = Number(payload[field]);
    if (Number.isFinite(value)) next[field] = value;
  }

  if (next.profitMargin !== undefined) next.profitMargin = Math.min(Math.max(next.profitMargin, 0), 200);
  if (next.promotionThreshold !== undefined) next.promotionThreshold = Math.max(next.promotionThreshold, 1);
  if (next.demotionZeroStar !== undefined) next.demotionZeroStar = Math.max(Math.round(next.demotionZeroStar), 1);

  ['renderCostPerHour', 'softwareLicense', 'payrollCoeff', 'bonusDeltaUp', 'bonusDeltaDown'].forEach((field) => {
    if (next[field] !== undefined) next[field] = Math.max(next[field], 0);
  });

  return next;
}

async function getSystemSettings() {
  const doc = await SystemSettings.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default', ...DEFAULT_SYSTEM_SETTINGS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeSettings(doc);
}

async function updateSystemSettings(payload, userId = null) {
  const update = sanitizeSettings(payload);
  const doc = await SystemSettings.findOneAndUpdate(
    { key: 'default' },
    { $set: { ...update, updated_by: userId || null }, $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeSettings(doc);
}

module.exports = {
  DEFAULT_SYSTEM_SETTINGS,
  getSystemSettings,
  updateSystemSettings,
  normalizeSettings,
};
