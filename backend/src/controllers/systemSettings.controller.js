const { getSystemSettings, updateSystemSettings } = require('../services/systemSettings.service');

exports.getSettings = async (req, res) => {
  try {
    res.json(await getSystemSettings());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await updateSystemSettings(req.body, req.user?._id);
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
