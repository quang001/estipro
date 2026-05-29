/**
 * recalc_uoc_tinh.js
 * Tính lại ước tính chi phí cho tất cả dự án theo logic mới.
 * Chạy SAU migrate_loai_du_an.js và seedCategories.js.
 *
 *   node src/recalc_uoc_tinh.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

require('./models/DuAn.model');
require('./models/NhanVien.model');
require('./models/KhachHang.model');
require('./models/ProjectCategory.model');
require('./models/ProjectRequirementField.model');
require('./models/PhanCongDuAn.model');
require('./models/index');

const DuAn                   = require('./models/DuAn.model');
const KhachHang              = require('./models/KhachHang.model');
const ProjectCategory        = require('./models/ProjectCategory.model');
const ProjectRequirementField = require('./models/ProjectRequirementField.model');
const PhanCongDuAn           = require('./models/PhanCongDuAn.model');
const { ChiPhiKyThuat, UocTinhChiPhi } = require('./models/index');

const { tinhChiPhiKyThuat, tinhRuiRo } = require('./utils/estimationEngine');
const { danhGiaDuAn, tinhGiaDynamic }  = require('./utils/difficultyEngine');

async function recalcOne(duAn) {
  try {
    const [khachHang, phanCong, chiPhiKTDoc, category] = await Promise.all([
      KhachHang.findById(duAn.ma_khach_hang),
      PhanCongDuAn.find({ ma_du_an: duAn._id }).populate('ma_nhan_vien'),
      ChiPhiKyThuat.findOne({ ma_du_an: duAn._id }),
      ProjectCategory.findById(duAn.loai_du_an),
    ]);

    if (!category) {
      return { ok: false, reason: 'Không tìm thấy category — chạy migrate_loai_du_an.js trước' };
    }

    const yeuCau    = duAn.yeu_cau || {};
    const diemDoKho = khachHang?.diem_do_kho || 3;

    const fieldConfigs = await ProjectRequirementField.find({
      ma_loai_du_an: duAn.loai_du_an,
      active:        true,
    }).sort({ thu_tu: 1 });

    const doKhoResult  = danhGiaDuAn(yeuCau, fieldConfigs);
    const gioCoBan     = category.base_hours || 8;
    const tongKT       = tinhChiPhiKyThuat(category, chiPhiKTDoc?.toObject?.() || null);
    const { pct: pctRuiRo, reasons } = tinhRuiRo(category, yeuCau, diemDoKho);

    const phanCongData = phanCong.map(pc => ({
      gio_du_kien:    pc.gio_du_kien,
      luong_theo_gio: pc.ma_nhan_vien?.luong_theo_gio || 0,
    }));

    const dynResult = tinhGiaDynamic({
      gio_co_ban:            gioCoBan,
      muc_do_tong_the:       doKhoResult.muc_do_tong_the,
      muc_do_gap:            yeuCau.muc_do_gap || 'binh_thuong',
      phanCong:              phanCongData,
      chi_phi_ky_thuat_base: tongKT,
      ty_le_loi_nhuan:       25,
    });

    const chiPhiRuiRo = Math.round(dynResult.tong_chi_phi_du_kien * pctRuiRo);
    const tongDuKien  = dynResult.tong_chi_phi_du_kien + chiPhiRuiRo;
    const giaDexuat   = Math.round(tongDuKien * 1.25);

    await UocTinhChiPhi.findOneAndUpdate(
      { ma_du_an: duAn._id },
      {
        ma_du_an:             duAn._id,
        chi_phi_nhan_su:      dynResult.chi_phi_nhan_su,
        chi_phi_ky_thuat:     dynResult.chi_phi_ky_thuat,
        chi_phi_rui_ro:       chiPhiRuiRo,
        tong_chi_phi_du_kien: tongDuKien,
        ty_le_loi_nhuan:      25,
        gia_de_xuat:          giaDexuat,
        he_so_deadline:       dynResult.he_so_deadline,
        phan_tram_rui_ro:     Math.round(pctRuiRo * 100),
        ly_do_rui_ro:         reasons.join('; ') || 'Rủi ro cơ bản',
        tong_gio_cong:        dynResult.tong_gio_cong,
        do_kho: {
          muc_do:       doKhoResult.muc_do_tong_the,
          diem:         doKhoResult.diem_do_kho_tong,
          chi_tiet:     doKhoResult.chi_tiet_do_kho,
          he_so_do_kho: dynResult.he_so_do_kho,
        },
      },
      { upsert: true, new: true }
    );

    return {
      ok:     true,
      slug:   category.slug,
      do_kho: doKhoResult.muc_do_tong_the,
      gia:    giaDexuat,
    };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/estipro_db';
  await mongoose.connect(uri);
  console.log('🔗 Kết nối:', uri);

  const duAns = await DuAn.find({}).lean();
  console.log(`\n🔄 Tính lại ước tính cho ${duAns.length} dự án...\n`);

  let ok = 0, fail = 0;
  for (const da of duAns) {
    process.stdout.write(`   "${da.ten_du_an}"... `);
    const result = await recalcOne(da);
    if (result.ok) {
      console.log(`✅ ${result.slug} | độ khó: ${result.do_kho} | giá: ${result.gia?.toLocaleString('vi-VN')}đ`);
      ok++;
    } else {
      console.log(`❌ ${result.reason}`);
      fail++;
    }
  }

  console.log(`\n✅ Thành công: ${ok} | ❌ Thất bại: ${fail}`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); });