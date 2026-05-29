/**
 * Seed: seedCategories.js
 * Nạp dữ liệu ProjectCategory — bao gồm base_hours, tech_cost_base, required_roles
 * Idempotent: chạy nhiều lần vẫn an toàn (upsert theo slug)
 *
 * Sử dụng:
 *   node src/seed/seedCategories.js
 */
require('dotenv').config();
const mongoose        = require('mongoose');
const ProjectCategory = require('../models/ProjectCategory.model');

const CATEGORIES = [
  {
    slug: 'thiet_ke_banner', ten_hien_thi: 'Thiết kế Banner', icon: '🎨', thu_tu: 1,
    base_hours: 4, tech_cost_base: 30000,
    required_roles: [{ vai_tro: 'designer', phan_tram: 100 }],
  },
  {
    slug: 'thiet_ke_logo', ten_hien_thi: 'Thiết kế Logo', icon: '✏️', thu_tu: 2,
    base_hours: 16, tech_cost_base: 50000,
    required_roles: [{ vai_tro: 'designer', phan_tram: 100 }],
  },
  {
    slug: 'chinh_sua_anh', ten_hien_thi: 'Chỉnh sửa ảnh', icon: '🖼️', thu_tu: 3,
    base_hours: 8, tech_cost_base: 20000,
    required_roles: [{ vai_tro: 'designer', phan_tram: 60 }, { vai_tro: 'photographer', phan_tram: 40 }],
  },
  {
    slug: 'video_quang_cao', ten_hien_thi: 'Video Quảng cáo', icon: '📹', thu_tu: 4,
    base_hours: 16, tech_cost_base: 300000,
    required_roles: [{ vai_tro: 'video_editor', phan_tram: 50 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 25 }],
  },
  {
    slug: 'motion_graphics', ten_hien_thi: 'Motion Graphics', icon: '🎬', thu_tu: 5,
    base_hours: 12, tech_cost_base: 250000,
    required_roles: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }],
  },
  {
    slug: 'animation_2d', ten_hien_thi: 'Animation 2D', icon: '🎭', thu_tu: 6,
    base_hours: 20, tech_cost_base: 400000,
    required_roles: [{ vai_tro: 'animator', phan_tram: 60 }, { vai_tro: 'motion_designer', phan_tram: 25 }, { vai_tro: 'designer', phan_tram: 15 }],
  },
  {
    slug: 'animation_3d', ten_hien_thi: 'Animation 3D', icon: '🎲', thu_tu: 7,
    base_hours: 30, tech_cost_base: 800000,
    required_roles: [{ vai_tro: 'animator', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 20 }, { vai_tro: 'designer', phan_tram: 10 }],
  },
  {
    slug: 'vfx', ten_hien_thi: 'VFX', icon: '✨', thu_tu: 8,
    base_hours: 20, tech_cost_base: 1000000,
    required_roles: [{ vai_tro: 'vfx_artist', phan_tram: 70 }, { vai_tro: 'animator', phan_tram: 30 }],
  },
  {
    slug: 'video_san_xuat', ten_hien_thi: 'Video Sản xuất', icon: '🎥', thu_tu: 9,
    base_hours: 24, tech_cost_base: 500000,
    required_roles: [{ vai_tro: 'video_editor', phan_tram: 60 }, { vai_tro: 'designer', phan_tram: 20 }, { vai_tro: 'photographer', phan_tram: 20 }],
  },
  {
    slug: 'intro_animation', ten_hien_thi: 'Intro Animation', icon: '🎞️', thu_tu: 10,
    base_hours: 8, tech_cost_base: 200000,
    required_roles: [{ vai_tro: 'motion_designer', phan_tram: 70 }, { vai_tro: 'designer', phan_tram: 30 }],
  },
  {
    slug: 'social_media', ten_hien_thi: 'Social Media', icon: '📱', thu_tu: 11,
    base_hours: 8, tech_cost_base: 50000,
    required_roles: [{ vai_tro: 'designer', phan_tram: 70 }, { vai_tro: 'motion_designer', phan_tram: 30 }],
  },
  {
    slug: 'khac', ten_hien_thi: 'Khác', icon: '📦', thu_tu: 99,
    base_hours: 8, tech_cost_base: 100000,
    required_roles: [{ vai_tro: 'designer', phan_tram: 50 }, { vai_tro: 'animator', phan_tram: 50 }],
  },
];

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/estipro_db';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  let created = 0, updated = 0;

  for (const data of CATEGORIES) {
    const result = await ProjectCategory.findOneAndUpdate(
      { slug: data.slug },
      { $set: { ...data, active: true } },
      { upsert: true, new: true }
    );
    const isNew = result.createdAt?.getTime() === result.updatedAt?.getTime();
    if (isNew) { console.log(`✅ Tạo:    ${data.slug} — ${data.ten_hien_thi}`); created++; }
    else       { console.log(`🔄 Cập nhật: ${data.slug} — ${data.ten_hien_thi}`); updated++; }
  }

  console.log(`\n📊 Kết quả: ${created} tạo mới, ${updated} cập nhật`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('❌ Lỗi seed:', err.message); process.exit(1); });