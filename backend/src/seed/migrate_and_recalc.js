/**
 * migrate_and_recalc.js
 *
 * Chạy 1 lần để:
 *   1. Chuyển du_an.loai_du_an từ slug string → ObjectId
 *   2. Cập nhật project_categories với gio_co_ban, tech_cost_base, vai_tro_mac_dinh
 *   3. Tính lại toàn bộ uoc_tinh_chi_phi theo logic mới (difficultyEngine)
 *
 * Cách chạy (từ thư mục seed):
 *   node migrate_and_recalc.js
 *
 * Hoặc từ thư mục backend:
 *   node src/seed/migrate_and_recalc.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const path     = require('path');

// ── Load models (đường dẫn từ seed/ lên src/) ────────────────────────────────
const DuAn                    = require(path.join(__dirname, '../models/DuAn.model'));
const KhachHang               = require(path.join(__dirname, '../models/KhachHang.model'));
const NhanVien                = require(path.join(__dirname, '../models/NhanVien.model'));
const ProjectCategory         = require(path.join(__dirname, '../models/ProjectCategory.model'));
const ProjectRequirementField = require(path.join(__dirname, '../models/ProjectRequirementField.model'));
const PhanCongDuAn            = require(path.join(__dirname, '../models/PhanCongDuAn.model'));
const { ChiPhiKyThuat, UocTinhChiPhi } = require(path.join(__dirname, '../models/index'));

// ── Load engines ─────────────────────────────────────────────────────────────
const { tinhChiPhiKyThuat, tinhRuiRo, goiYPhanCong, RATE_CARD_FALLBACK } =
  require(path.join(__dirname, '../utils/estimationEngine'));
const { danhGiaDuAn, tinhGiaDynamic } =
  require(path.join(__dirname, '../utils/difficultyEngine'));

// ── Bảng cấu hình mặc định theo slug ─────────────────────────────────────────
// Dùng để cập nhật project_categories với field mới
const CATEGORY_DEFAULTS = {
  intro_animation:  { gio_co_ban: 8,  tech_cost_base: 200000, vai_tro_mac_dinh: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }] },
  video_quang_cao:  { gio_co_ban: 16, tech_cost_base: 300000, vai_tro_mac_dinh: [{ vai_tro: 'video_editor', phan_tram: 50 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 25 }] },
  video_san_xuat:   { gio_co_ban: 24, tech_cost_base: 500000, vai_tro_mac_dinh: [{ vai_tro: 'video_editor', phan_tram: 60 }, { vai_tro: 'designer', phan_tram: 20 }, { vai_tro: 'photographer', phan_tram: 20 }] },
  motion_graphics:  { gio_co_ban: 12, tech_cost_base: 250000, vai_tro_mac_dinh: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }] },
  animation_2d:     { gio_co_ban: 20, tech_cost_base: 400000, vai_tro_mac_dinh: [{ vai_tro: 'animator', phan_tram: 60 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 15 }] },
  animation_3d:     { gio_co_ban: 30, tech_cost_base: 800000, vai_tro_mac_dinh: [{ vai_tro: 'animator', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 20 }, { vai_tro: 'designer', phan_tram: 10 }] },
  vfx:              { gio_co_ban: 20, tech_cost_base: 1000000,vai_tro_mac_dinh: [{ vai_tro: 'vfx_artist', phan_tram: 70 }, { vai_tro: 'animator', phan_tram: 30 }] },
  thiet_ke_logo:    { gio_co_ban: 16, tech_cost_base: 50000,  vai_tro_mac_dinh: [{ vai_tro: 'designer', phan_tram: 100 }] },
  thiet_ke_banner:  { gio_co_ban: 4,  tech_cost_base: 30000,  vai_tro_mac_dinh: [{ vai_tro: 'designer', phan_tram: 100 }] },
  chinh_sua_anh:    { gio_co_ban: 1,  tech_cost_base: 20000,  vai_tro_mac_dinh: [{ vai_tro: 'designer', phan_tram: 60 }, { vai_tro: 'photographer', phan_tram: 40 }] },
  social_media:     { gio_co_ban: 2,  tech_cost_base: 50000,  vai_tro_mac_dinh: [{ vai_tro: 'designer', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 30 }] },
  khac:             { gio_co_ban: 8,  tech_cost_base: 100000, vai_tro_mac_dinh: [{ vai_tro: 'designer', phan_tram: 50 }, { vai_tro: 'animator', phan_tram: 50 }] },
};

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 1: Cập nhật project_categories với field mới
// ─────────────────────────────────────────────────────────────────────────────
async function migrateCategories(db) {
  console.log('\n📦 BƯỚC 1: Cập nhật project_categories...');
  const catCol = db.collection('project_categories');
  const cats   = await catCol.find({}).toArray();

  let updated = 0;
  for (const cat of cats) {
    const defaults = CATEGORY_DEFAULTS[cat.slug];
    if (!defaults) {
      console.log(`   ⚠️  Slug không có config mặc định: "${cat.slug}" — bỏ qua`);
      continue;
    }
    // Chỉ set nếu chưa có (không ghi đè nếu admin đã tùy chỉnh)
    const toSet = {};
    if (cat.gio_co_ban      == null) toSet.gio_co_ban      = defaults.gio_co_ban;
    if (cat.tech_cost_base  == null) toSet.tech_cost_base  = defaults.tech_cost_base;
    if (!cat.vai_tro_mac_dinh?.length) toSet.vai_tro_mac_dinh = defaults.vai_tro_mac_dinh;

    if (Object.keys(toSet).length > 0) {
      await catCol.updateOne({ _id: cat._id }, { $set: toSet });
      console.log(`   ✅ "${cat.ten_hien_thi}" (${cat.slug}): +${Object.keys(toSet).join(', ')}`);
      updated++;
    } else {
      console.log(`   ⏭️  "${cat.ten_hien_thi}" — đã có đủ field, bỏ qua`);
    }
  }
  console.log(`   → ${updated} categories đã cập nhật\n`);
  return cats;
}

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2: Migrate du_an.loai_du_an slug → ObjectId
// ─────────────────────────────────────────────────────────────────────────────
async function migrateDuAn(db, cats) {
  console.log('🔄 BƯỚC 2: Migrate du_an.loai_du_an slug → ObjectId...');
  const duAnCol = db.collection('du_an');

  const slugToId = {};
  cats.forEach(c => { slugToId[c.slug] = c._id; });

  const duAns = await duAnCol.find({}).toArray();
  let updated = 0, skipped = 0, failed = 0;

  for (const da of duAns) {
    const val = da.loai_du_an;

    // Đã là ObjectId → bỏ qua
    if (val?._bsontype === 'ObjectId' || mongoose.Types.ObjectId.isValid(val) && String(val).length === 24 && !CATEGORY_DEFAULTS[String(val)]) {
      skipped++;
      continue;
    }

    const slugStr = String(val || '').trim();
    const catId   = slugToId[slugStr];

    if (!catId) {
      console.warn(`   ⚠️  Slug "${slugStr}" không tìm thấy — DA: "${da.ten_du_an}"`);
      failed++;
      continue;
    }

    await duAnCol.updateOne({ _id: da._id }, { $set: { loai_du_an: catId } });
    console.log(`   ✅ "${da.ten_du_an}": "${slugStr}" → ObjectId`);
    updated++;
  }

  console.log(`   → ${updated} dự án migrate, ${skipped} bỏ qua, ${failed} thất bại\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 3: Tính lại uoc_tinh_chi_phi cho tất cả dự án
// ─────────────────────────────────────────────────────────────────────────────
async function recalcOne(duAn) {
  try {
    const [khachHang, phanCong, chiPhiKTDoc, category] = await Promise.all([
      KhachHang.findById(duAn.ma_khach_hang),
      PhanCongDuAn.find({ ma_du_an: duAn._id }).populate('ma_nhan_vien'),
      ChiPhiKyThuat.findOne({ ma_du_an: duAn._id }),
      ProjectCategory.findById(duAn.loai_du_an),
    ]);

    if (!category) return { ok: false, reason: 'Không tìm thấy category' };

    const yeuCau    = duAn.yeu_cau || {};
    const diemDoKho = khachHang?.diem_do_kho || 3;

    const fieldConfigs = await ProjectRequirementField.find({
      ma_loai_du_an: duAn.loai_du_an,
      active:        true,
    }).sort({ thu_tu: 1 });

    const doKhoResult  = danhGiaDuAn(yeuCau, fieldConfigs);
    const gioCoBan     = category.gio_co_ban ?? 8;
    const tongKT       = tinhChiPhiKyThuat(category, yeuCau, chiPhiKTDoc?.toObject?.() || null);
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

async function recalcAll() {
  console.log('💰 BƯỚC 3: Tính lại ước tính chi phí...');
  const duAns = await DuAn.find({}).lean();
  let ok = 0, fail = 0;

  for (const da of duAns) {
    process.stdout.write(`   "${da.ten_du_an}"... `);
    const result = await recalcOne(da);
    if (result.ok) {
      console.log(`✅ ${result.slug} | ${result.do_kho} | ${result.gia?.toLocaleString('vi-VN')}đ`);
      ok++;
    } else {
      console.log(`❌ ${result.reason}`);
      fail++;
    }
  }

  console.log(`   → ${ok} thành công, ${fail} thất bại\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/estipro_db';
  console.log('🔗 Kết nối MongoDB:', uri);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  await migrateCategories(db);
  const cats = await db.collection('project_categories').find({}).toArray();
  await migrateDuAn(db, cats);
  await recalcAll();

  console.log('════════════════════════════════════');
  console.log('✅ Migration hoàn tất!');
  console.log('   Khởi động lại backend để áp dụng.');
  console.log('════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});