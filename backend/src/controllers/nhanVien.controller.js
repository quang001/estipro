const NhanVien      = require('../models/NhanVien.model');
const { KyNang, KyNangNhanVien } = require('../models/KyNang.model');
const { DanhGiaHieuSuat }        = require('../models/index');
const LichSuDiem    = require('../models/LichSuDiem.model');

// GET /api/nhan-vien
exports.getAll = async (req, res) => {
  try {
    const { search, vai_tro, trang_thai } = req.query;
    const q = {};
    if (search)     q.ho_ten             = { $regex: search, $options: 'i' };
    if (vai_tro)    q.vai_tro            = vai_tro;
    if (trang_thai) q.trang_thai_lam_viec = trang_thai;

    const nvs = await NhanVien.find(q).populate('ma_cap_do').sort({ ho_ten: 1 });
    const ids = nvs.map(n => n._id);

    const [kyNangs, danhGias] = await Promise.all([
      KyNangNhanVien.find({ ma_nhan_vien: { $in: ids } }).populate('ma_ky_nang'),
      DanhGiaHieuSuat.find({ ma_nhan_vien: { $in: ids } }),
    ]);

    const knMap = {}, dgMap = {};
    kyNangs.forEach(kn => {
      const id = kn.ma_nhan_vien.toString();
      if (!knMap[id]) knMap[id] = [];
      knMap[id].push({ ten: kn.ma_ky_nang?.ten_ky_nang, muc_do: kn.muc_do_thanh_thao, id: kn._id });
    });
    danhGias.forEach(dg => {
      const id = dg.ma_nhan_vien.toString();
      if (!dgMap[id]) dgMap[id] = { count: 0, tong_diem: 0 };
      dgMap[id].count++;
      dgMap[id].tong_diem += dg.diem_chat_luong || 0;
    });

    res.json(nvs.map(nv => ({
      ...nv.toObject(),
      cap_do_ten: nv.ma_cap_do?.ten_cap_do,
      ky_nang:    knMap[nv._id.toString()] || [],
      so_du_an:   dgMap[nv._id.toString()]?.count || 0,
      diem_tb:    dgMap[nv._id.toString()]?.count > 0
        ? Math.round(dgMap[nv._id.toString()].tong_diem / dgMap[nv._id.toString()].count * 10) / 10
        : null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/nhan-vien/:id
exports.getOne = async (req, res) => {
  try {
    const nv = await NhanVien.findById(req.params.id).populate('ma_cap_do');
    if (!nv) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    const [kyNangs, danhGias] = await Promise.all([
      KyNangNhanVien.find({ ma_nhan_vien: req.params.id }).populate('ma_ky_nang'),
      DanhGiaHieuSuat.find({ ma_nhan_vien: req.params.id }).populate('ma_du_an'),
    ]);
    res.json({ ...nv.toObject(), ky_nang: kyNangs, danh_gia: danhGias });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/nhan-vien
exports.create = async (req, res) => {
  try {
    const nv = await NhanVien.create(req.body);
    res.status(201).json(nv);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/nhan-vien/:id
exports.update = async (req, res) => {
  try {
    const nv = await NhanVien.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('ma_cap_do');
    if (!nv) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
    res.json(nv);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/nhan-vien/:id
exports.remove = async (req, res) => {
  try {
    await NhanVien.findByIdAndDelete(req.params.id);
    await KyNangNhanVien.deleteMany({ ma_nhan_vien: req.params.id });
    res.json({ message: 'Đã xóa nhân viên' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/nhan-vien/:id/ky-nang
exports.addKyNang = async (req, res) => {
  try {
    const { ma_ky_nang, muc_do_thanh_thao } = req.body;
    const kn = await KyNangNhanVien.create({ ma_nhan_vien: req.params.id, ma_ky_nang, muc_do_thanh_thao });
    res.status(201).json(kn);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/nhan-vien/:id/ky-nang/:knId
exports.removeKyNang = async (req, res) => {
  try {
    await KyNangNhanVien.findByIdAndDelete(req.params.knId);
    res.json({ message: 'Đã xóa kỹ năng' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/nhan-vien/:id/lich-su-diem
exports.getLichSuDiem = async (req, res) => {
  try {
    const history = await LichSuDiem.find({ ma_nhan_vien: req.params.id })
      .populate('ma_du_an', 'ten_du_an')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
