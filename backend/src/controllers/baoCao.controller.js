const DuAn = require('../models/DuAn.model');
const NhanVien = require('../models/NhanVien.model');
const KhachHang = require('../models/KhachHang.model');
const { UocTinhChiPhi, ChiPhiThucTe, DuLieuHocMay, DanhGiaHieuSuat } = require('../models/index');
const { taoInsightsTongHop } = require('../utils/aiService');

const activeProjectFilter = (filter = {}) => ({ ...filter, deleted_at: null });

function getDoanhThuThucTe(tt, ut) {
  const salePrice = Number(tt?.gia_ban_thuc_te);
  if (Number.isFinite(salePrice) && salePrice > 0) return salePrice;
  return ut?.gia_de_xuat || 0;
}

exports.dashboard = async (req, res) => {
  try {
    const duAns = await DuAn.find(activeProjectFilter()).populate('ma_khach_hang');
    const projectIds = duAns.map(d => d._id);

    const [nhanViens, khachHangs, uocTinhs, thucTes, hocMays] = await Promise.all([
      NhanVien.find(),
      KhachHang.find(),
      UocTinhChiPhi.find({ ma_du_an: { $in: projectIds } }),
      ChiPhiThucTe.find({ ma_du_an: { $in: projectIds } }),
      DuLieuHocMay.find({ ma_du_an: { $in: projectIds } }),
    ]);

    const utMap = {};
    uocTinhs.forEach(ut => { utMap[ut.ma_du_an.toString()] = ut; });

    const tongDoanhThuDuKien = uocTinhs.reduce((s, ut) => s + (ut.gia_de_xuat || 0), 0);
    const tongLoiNhuan = thucTes.reduce((s, tt) => s + (tt.loi_nhuan_thuc_te || 0), 0);
    const doChinhXacTB = hocMays.length > 0
      ? Math.round(hocMays.reduce((s, h) => s + (h.do_chinh_xac_du_doan || 0), 0) / hocMays.length)
      : null;

    const theoTrangThai = {};
    const theoLoai = {};
    duAns.forEach(d => {
      theoTrangThai[d.trang_thai] = (theoTrangThai[d.trang_thai] || 0) + 1;
      const loaiKey = d.loai_du_an?.toString?.() || 'unknown';
      theoLoai[loaiKey] = (theoLoai[loaiKey] || 0) + 1;
    });

    const now = new Date();
    const sapDeadline = duAns.filter(d => {
      if (['completed', 'cancelled'].includes(d.trang_thai)) return false;
      const diff = (new Date(d.deadline) - now) / 86400000;
      return diff >= 0 && diff <= 7;
    });

    res.json({
      tong_du_an: duAns.length,
      tong_nhan_vien: nhanViens.length,
      tong_khach_hang: khachHangs.length,
      tong_doanh_thu_du_kien: tongDoanhThuDuKien,
      tong_loi_nhuan_thuc_te: tongLoiNhuan,
      do_chinh_xac_uoc_tinh: doChinhXacTB,
      theo_trang_thai: theoTrangThai,
      theo_loai: theoLoai,
      sap_deadline: sapDeadline.map(d => ({
        _id: d._id,
        ten_du_an: d.ten_du_an,
        deadline: d.deadline,
        trang_thai: d.trang_thai,
        khach_hang: d.ma_khach_hang?.ten_cong_ty,
        gia_de_xuat: utMap[d._id.toString()]?.gia_de_xuat,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.doanhThu = async (req, res) => {
  try {
    const duAns = await DuAn.find(activeProjectFilter({ trang_thai: 'completed' }));
    const ids = duAns.map(d => d._id);
    const [uocTinhs, thucTes] = await Promise.all([
      UocTinhChiPhi.find({ ma_du_an: { $in: ids } }),
      ChiPhiThucTe.find({ ma_du_an: { $in: ids } }),
    ]);

    const utMap = {};
    const ttMap = {};
    uocTinhs.forEach(ut => { utMap[ut.ma_du_an.toString()] = ut; });
    thucTes.forEach(tt => { ttMap[tt.ma_du_an.toString()] = tt; });

    const theoThang = {};
    duAns.forEach(d => {
      const thang = new Date(d.updatedAt).toISOString().slice(0, 7);
      if (!theoThang[thang]) theoThang[thang] = { thang, doanh_thu: 0, loi_nhuan: 0, so_du_an: 0 };

      const tt = ttMap[d._id.toString()];
      const ut = utMap[d._id.toString()];
      const doanhThu = getDoanhThuThucTe(tt, ut);

      theoThang[thang].doanh_thu += doanhThu;
      theoThang[thang].loi_nhuan += tt?.loi_nhuan_thuc_te || 0;
      theoThang[thang].so_du_an++;
    });

    res.json(Object.values(theoThang).sort((a, b) => a.thang.localeCompare(b.thang)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.hieuSuat = async (req, res) => {
  try {
    const activeProjects = await DuAn.find(activeProjectFilter()).select('_id');
    const activeProjectIds = activeProjects.map(project => project._id);

    const [nhanViens, danhGias] = await Promise.all([
      NhanVien.find().populate('ma_cap_do'),
      DanhGiaHieuSuat.find({ ma_du_an: { $in: activeProjectIds } }),
    ]);

    const dgMap = {};
    danhGias.forEach(dg => {
      const id = dg.ma_nhan_vien.toString();
      if (!dgMap[id]) dgMap[id] = { count: 0, tong_diem: 0, tong_tre: 0 };
      dgMap[id].count++;
      dgMap[id].tong_diem += dg.diem_chat_luong || 0;
      dgMap[id].tong_tre += dg.so_ngay_tre || 0;
    });

    res.json(nhanViens.map(nv => {
      const stats = dgMap[nv._id.toString()] || { count: 0, tong_diem: 0, tong_tre: 0 };
      return {
        _id: nv._id,
        ho_ten: nv.ho_ten,
        vai_tro: nv.vai_tro,
        luong_theo_gio: nv.luong_theo_gio,
        trang_thai: nv.trang_thai_lam_viec,
        cap_do: nv.ma_cap_do?.ten_cap_do,
        so_du_an: stats.count,
        diem_tb: stats.count > 0 ? Math.round((stats.tong_diem / stats.count) * 10) / 10 : null,
        trung_binh_ngay_tre: stats.count > 0 ? Math.round((stats.tong_tre / stats.count) * 10) / 10 : 0,
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.aiInsights = async (req, res) => {
  try {
    const duAns = await DuAn.find(activeProjectFilter({ trang_thai: 'completed' }))
      .populate('ma_khach_hang')
      .limit(15)
      .sort({ updatedAt: -1 });
    const ids = duAns.map(d => d._id);

    const [uocTinhs, thucTes, hocMays] = await Promise.all([
      UocTinhChiPhi.find({ ma_du_an: { $in: ids } }),
      ChiPhiThucTe.find({ ma_du_an: { $in: ids } }),
      DuLieuHocMay.find({ ma_du_an: { $in: ids } }).sort({ createdAt: -1 }).limit(20),
    ]);

    const utMap = {};
    const ttMap = {};
    uocTinhs.forEach(ut => { utMap[ut.ma_du_an.toString()] = ut; });
    thucTes.forEach(tt => { ttMap[tt.ma_du_an.toString()] = tt; });

    const lichSu = duAns.map(d => ({
      loai: d.loai_du_an,
      gia_du_doan: utMap[d._id.toString()]?.gia_de_xuat,
      gia_thuc_te: getDoanhThuThucTe(ttMap[d._id.toString()], utMap[d._id.toString()]),
      chi_phi_thuc_te: ttMap[d._id.toString()]?.tong_chi_phi_thuc_te,
      loi_nhuan: ttMap[d._id.toString()]?.loi_nhuan_thuc_te,
      so_lan_sua: ttMap[d._id.toString()]?.so_lan_sua_thuc_te,
      ngay_tre: ttMap[d._id.toString()]?.so_ngay_tre_deadline,
    }));

    const doChinhXacTB = hocMays.length > 0
      ? Math.round(hocMays.reduce((s, h) => s + (h.do_chinh_xac_du_doan || 0), 0) / hocMays.length)
      : null;

    const aiInsights = await taoInsightsTongHop(lichSu);
    res.json({ ...aiInsights, do_chinh_xac_tb: doChinhXacTB, tong_mau: hocMays.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
