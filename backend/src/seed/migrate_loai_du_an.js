/**
 * migrate_loai_du_an.js
 *
 * Chạy 1 lần duy nhất để chuyển đổi:
 *   du_an.loai_du_an: "thiet_ke_logo" (string slug)
 *   → du_an.loai_du_an: ObjectId("...") (ref ProjectCategory)
 *
 * Sau khi chạy xong, tất cả dự án cũ sẽ tương thích với logic mới.
 *
 * Cách chạy:
 *   cd backend
 *   node src/migrate_loai_du_an.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Map slug cũ → slug mới (phòng trường hợp tên khác nhau)
// Nếu slug trong DB trùng với slug trong project_categories thì không cần map này
const SLUG_ALIAS = {
  // 'ten_cu': 'ten_moi',  // thêm vào đây nếu cần
};

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/estipro_db';
  console.log('🔗 Kết nối:', uri);
  await mongoose.connect(uri);

  const db     = mongoose.connection.db;
  const duAnCol = db.collection('du_an');
  const catCol  = db.collection('project_categories');

  // ── Bước 1: Load tất cả categories → build map slug → _id ────────────────
  const cats = await catCol.find({}).toArray();
  if (cats.length === 0) {
    console.error('❌ Không tìm thấy category nào trong project_categories!');
    console.error('   Hãy tạo loại dự án trước trong trang Cài đặt → Loại dự án');
    process.exit(1);
  }

  const slugToId = {};
  cats.forEach(c => {
    slugToId[c.slug] = c._id;
    // alias nếu có
    if (SLUG_ALIAS[c.slug]) slugToId[SLUG_ALIAS[c.slug]] = c._id;
  });

  console.log('\n📋 Categories tìm được:');
  cats.forEach(c => console.log(`   - ${c.slug} → ${c._id} (${c.ten_hien_thi})`));

  // ── Bước 2: Tìm tất cả dự án ─────────────────────────────────────────────
  const duAns = await duAnCol.find({}).toArray();
  console.log(`\n🔍 Tổng số dự án cần kiểm tra: ${duAns.length}`);

  let updated  = 0;
  let skipped  = 0;
  let failed   = 0;
  const errors = [];

  for (const da of duAns) {
    const val = da.loai_du_an;

    // Kiểm tra đã là ObjectId chưa (24 hex chars)
    const isObjectId = val instanceof mongoose.Types.ObjectId
      || (typeof val === 'object' && val?._bsontype === 'ObjectId');

    if (isObjectId) {
      // Đã migrate rồi, bỏ qua
      skipped++;
      continue;
    }

    // Là string slug → tìm ObjectId tương ứng
    const slugStr = String(val || '').trim();
    const catId   = slugToId[slugStr];

    if (!catId) {
      console.warn(`   ⚠️  Không tìm thấy category cho slug: "${slugStr}" — DA: "${da.ten_du_an}" (${da._id})`);
      errors.push({ id: da._id, ten: da.ten_du_an, slug: slugStr });
      failed++;
      continue;
    }

    await duAnCol.updateOne(
      { _id: da._id },
      { $set: { loai_du_an: catId } }
    );
    console.log(`   ✅ "${da.ten_du_an}": "${slugStr}" → ${catId}`);
    updated++;
  }

  // ── Kết quả ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Đã migrate: ${updated} dự án`);
  console.log(`⏭️  Bỏ qua (đã là ObjectId): ${skipped} dự án`);
  console.log(`❌ Thất bại (slug không tìm thấy): ${failed} dự án`);

  if (errors.length > 0) {
    console.log('\n⚠️  Các dự án cần xử lý thủ công:');
    errors.forEach(e => console.log(`   - [${e.id}] "${e.ten}" (slug: "${e.slug}")`));
    console.log('\n   → Tạo category với slug tương ứng rồi chạy lại script này.');
  }

  console.log('═══════════════════════════════════════\n');
  await mongoose.disconnect();
  console.log('✅ Migrate hoàn tất.');
}

migrate().catch(err => {
  console.error('❌ Lỗi migrate:', err.message);
  process.exit(1);
});