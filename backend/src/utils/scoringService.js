// backend utils/scoringService.js
/**
 * scoringService.js — Dịch vụ tính điểm & đánh giá nhân viên
 * Tính điểm dự án → cập nhật điểm tích lũy + cấp độ nhân viên → ghi lịch sử
 */
const NhanVien      = require('../models/NhanVien.model');
const CapDoNhanVien = require('../models/CapDoNhanVien.model');
const PhanCongDuAn  = require('../models/PhanCongDuAn.model');
const DuAn          = require('../models/DuAn.model');
const LichSuDiem    = require('../models/LichSuDiem.model');
// const { tinhDiemDuAn: calcDiem, apDungDiem } = require('./scoringEngine');
const { tinhDiemDuAn: _tinhDiem, apDungDiem } = require('./scoringEngine');
const { getSystemSettings } = require('../services/systemSettings.service');

/**
 * Tính điểm + lưu DB cho toàn bộ nhân viên trong 1 dự án
 * @param {string} duAnId
 * @param {Object} opts
 * @param {number} opts.soSao          - 0..5
 * @param {number} opts.soNgayTre      - số ngày trễ deadline
 * @param {number} opts.soLanSua       - số lần sửa thực tế
 * @param {Array}  opts.tyLeDongGopMap - [{ ma_nhan_vien, ty_le }]
 */
async function tinhDiemDuAn(duAnId, { soSao, soNgayTre = 0, soLanSua = 0, tyLeDongGopMap = [] }) {
  const duAn = await DuAn.findOne({ _id: duAnId, deleted_at: null });
  if (!duAn) throw new Error('Khong tim thay du an');

  const existingHistory = await LichSuDiem.find({ ma_du_an: duAnId })
    .populate('ma_nhan_vien', 'ho_ten')
    .sort({ createdAt: 1 });

  if (existingHistory.length > 0) {
    return {
      already_scored: true,
      message: 'Du an da duoc tinh diem truoc do',
      employees: existingHistory.map(item => ({
        ma_nhan_vien: item.ma_nhan_vien?._id?.toString?.() || item.ma_nhan_vien?.toString?.(),
        ho_ten: item.ma_nhan_vien?.ho_ten,
        diem_nhan: item.diem_cong,
        ty_le_dong_gop: item.ty_le_dong_gop,
        cap_do_truoc: item.cap_do_truoc,
        cap_do_sau: item.cap_do_sau,
      })),
    };
  }

  // Lấy danh sách phân công
  const phanCongs = await PhanCongDuAn.find({ ma_du_an: duAnId });
  if (!phanCongs.length) return { employees: [], message: 'Không có nhân viên phân công' };

  // Gộp ty_le từ map vào phanCong
  const phanCongData = phanCongs.map(pc => {
    const override = tyLeDongGopMap.find(t =>
      t.ma_nhan_vien?.toString() === pc.ma_nhan_vien?.toString()
    );
    return {
      ma_nhan_vien:   pc.ma_nhan_vien,
      ty_le_dong_gop: override ? override.ty_le : (pc.ty_le_dong_gop || null),
    };
  });

  // Tính bonus/penalty từ thực tế
  const bonus   = { dung_deadline: soNgayTre === 0, khong_bi_sua: soLanSua === 0 };
  const penalty = { tre_deadline: soNgayTre > 0,   bi_sua_nhieu: soLanSua >= 3  };

  // Chạy engine
  const systemSettings = await getSystemSettings();
  const ketQua = _tinhDiem({ so_sao: soSao, phanCongs: phanCongData, bonus, penalty, rules: systemSettings });

  // Cập nhật ty_le_dong_gop ngược lại vào DB
  for (const pc of phanCongs) {
    const found = ketQua.employees.find(
      e => e.ma_nhan_vien.toString() === pc.ma_nhan_vien.toString()
    );
    if (found) {
      await PhanCongDuAn.findByIdAndUpdate(pc._id, { ty_le_dong_gop: found.ty_le_dong_gop });
    }
  }

  // Lấy bảng capDo để map tên → _id
  const allCapDo = await CapDoNhanVien.find();
  const capDoMap = {};
  allCapDo.forEach(c => { capDoMap[c.ten_cap_do] = c._id; });

  // Cập nhật điểm từng nhân viên + ghi lịch sử
  const results = [];
  for (const emp of ketQua.employees) {
    const nv = await NhanVien.findById(emp.ma_nhan_vien).populate('ma_cap_do');
    if (!nv) continue;

    nv._capDoTen = nv.ma_cap_do?.ten_cap_do || 'junior';
    const { upgraded, downgraded, cap_do_truoc, cap_do_sau } =
      apDungDiem(nv, emp.diem_nhan, soSao, capDoMap, systemSettings);

    // Lưu nhân viên
    await NhanVien.findByIdAndUpdate(emp.ma_nhan_vien, {
      diem_tich_luy:   nv.diem_tich_luy,
      so_lan_0_sao:    nv.so_lan_0_sao,
      tong_du_an:      nv.tong_du_an,
      diem_trung_binh: nv.diem_trung_binh,
      ma_cap_do:       nv.ma_cap_do,
    });

    // Ghi lịch sử
    const loai  = emp.diem_nhan >= 0 ? 'reward' : 'penalty';
    let   ly_do = `Dự án hoàn thành — ${soSao} sao — đóng góp ${Math.round(emp.ty_le_dong_gop * 100)}%`;
    if (soNgayTre === 0)   ly_do += ' +bonus đúng deadline';
    if (soLanSua  === 0)   ly_do += ' +bonus không sửa';
    if (soNgayTre > 0)     ly_do += ` -penalty trễ ${soNgayTre}d`;
    if (soLanSua  >= 3)    ly_do += ` -penalty sửa ${soLanSua} lần`;
    if (upgraded)          ly_do += ` 🎉 Lên cấp → ${cap_do_sau}`;
    if (downgraded)        ly_do += ` ⚠️ Hạ cấp → ${cap_do_sau}`;

    await LichSuDiem.create({
      ma_nhan_vien:   emp.ma_nhan_vien,
      ma_du_an:       duAnId,
      diem_cong:      emp.diem_nhan,
      loai,
      ly_do,
      so_sao_du_an:   soSao,
      ty_le_dong_gop: emp.ty_le_dong_gop,
      cap_do_truoc,
      cap_do_sau,
    });

    results.push({
      ma_nhan_vien: emp.ma_nhan_vien.toString(),
      ho_ten:       nv.ho_ten,
      diem_nhan:    emp.diem_nhan,
      diem_tich_luy: nv.diem_tich_luy,
      so_lan_0_sao:  nv.so_lan_0_sao,
      cap_do_truoc,
      cap_do_sau,
      da_len_cap:   upgraded,
      da_ha_cap:    downgraded,
    });
  }

  return {
    project_score: ketQua.project_score,
    so_sao:        soSao,
    bonus_diem:    ketQua.bonus_diem,
    employees:     results,
  };
}

module.exports = { tinhDiemDuAn };
