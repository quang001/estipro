/**
 * Migration: migrateLoaiDuAn.js
 * Chuyển đổi field loai_du_an từ String sang ObjectId (ref ProjectCategory).
 *
 * Chạy SAU khi seedCategories.js đã xong:
 *   node src/seed/migrateLoaiDuAn.js
 *
 * Idempotent: bỏ qua document nào đã có ObjectId.
 */
require('dotenv').config();
const mongoose        = require('mongoose');
const ProjectCategory = require('../models/ProjectCategory.model');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Tải bảng ánh xạ slug → ObjectId
  const cats = await ProjectCategory.find({});
  const slugToId = {};
  for (const c of cats) slugToId[c.slug] = c._id;

  // Lấy trực tiếp bằng collection (bỏ qua Mongoose model validation cũ)
  const col = mongoose.connection.collection('du_an');
  const docs = await col.find({}).toArray();

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  for (const doc of docs) {
    const val = doc.loai_du_an;

    // Đã là ObjectId (24-char hex) → bỏ qua
    if (val && typeof val === 'object') {
      skipped++;
      continue;
    }

    const catId = slugToId[val];
    if (!catId) {
      console.warn(`⚠️  Dự án ${doc._id}: slug "${val}" không tìm thấy trong ProjectCategory`);
      failed++;
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: { loai_du_an: catId } });
    updated++;
  }

  console.log(`\n📊 Migration kết quả:`);
  console.log(`   ✅ Đã cập nhật: ${updated}`);
  console.log(`   ⏭️  Bỏ qua:     ${skipped}`);
  console.log(`   ❌ Thất bại:    ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Lỗi migration:', err.message);
  process.exit(1);
});
