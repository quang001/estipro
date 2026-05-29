const KhachHang = require('../models/KhachHang.model');
const DuAn      = require('../models/DuAn.model');

// GET /api/khach-hang
exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const q = search
      ? { $or: [{ ten_cong_ty: { $regex: search, $options: 'i' } }, { nguoi_lien_he: { $regex: search, $options: 'i' } }] }
      : {};
    const khs = await KhachHang.find(q).sort({ createdAt: -1 });

    // Đính kèm số dự án theo từng khách hàng
    const ids    = khs.map(k => k._id);
    const counts = await DuAn.aggregate([
      { $match: { ma_khach_hang: { $in: ids } } },
      { $group: { _id: '$ma_khach_hang', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    res.json(khs.map(k => ({ ...k.toObject(), so_du_an: countMap[k._id.toString()] || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/khach-hang/:id
exports.getOne = async (req, res) => {
  try {
    const kh = await KhachHang.findById(req.params.id);
    if (!kh) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    const duAns = await DuAn.find({ ma_khach_hang: req.params.id }).sort({ createdAt: -1 });
    res.json({ ...kh.toObject(), du_ans: duAns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/khach-hang
exports.create = async (req, res) => {
  try {
    const kh = await KhachHang.create(req.body);
    res.status(201).json(kh);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/khach-hang/:id
exports.update = async (req, res) => {
  try {
    const kh = await KhachHang.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!kh) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    res.json(kh);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/khach-hang/:id
exports.remove = async (req, res) => {
  try {
    const count = await DuAn.countDocuments({ ma_khach_hang: req.params.id });
    if (count > 0)
      return res.status(400).json({ message: `Không thể xóa — khách hàng có ${count} dự án` });
    await KhachHang.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa khách hàng' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
