const { KyNang } = require('../models/KyNang.model');

exports.getAll = async (req, res) => {
  try {
    res.json(await KyNang.find().sort({ ten_ky_nang: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    res.status(201).json(await KyNang.create(req.body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await KyNang.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa kỹ năng' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
