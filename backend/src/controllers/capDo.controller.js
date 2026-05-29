// controllers/capDo.controller.js
const CapDoNhanVien = require('../models/CapDoNhanVien.model');

exports.getAll = async (req, res) => {
  try {
    res.json(await CapDoNhanVien.find().sort({ luong_mac_dinh_theo_gio: 1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    res.status(201).json(await CapDoNhanVien.create(req.body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    res.json(await CapDoNhanVien.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) { res.status(400).json({ message: err.message }); }
};
