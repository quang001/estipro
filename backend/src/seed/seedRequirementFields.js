/**
 * seed/seedRequirementFields.js
 * Tạo sẵn "yêu cầu nhỏ" mẫu cho các loại dự án phổ biến
 * Chạy: node src/seed/seedRequirementFields.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/estipro');
  console.log('✅ Connected to MongoDB');

  const ProjectCategory         = require('../models/ProjectCategory.model');
  const ProjectRequirementField = require('../models/ProjectRequirementField.model');

  // ── Định nghĩa fields mẫu theo slug ─────────────────────────────────────
  const SEED_DATA = {
    thiet_ke_banner: [
      {
        field_key: 'so_kich_thuoc', label: 'Số kích thước banner', type: 'number',
        required: true, thu_tu: 1, hint: 'Mỗi kích thước = 1 phiên bản thiết kế riêng',
        min_value: 1, default_value: 3,
        cau_hinh_do_kho_number: [
          { min: 1, max: 3, muc_do: 'de', diem: 1 },
          { min: 4, max: 6, muc_do: 'trung_binh', diem: 2 },
          { min: 7, max: 10, muc_do: 'kho', diem: 3 },
          { min: 11, max: 999, muc_do: 'rat_kho', diem: 4 },
        ],
      },
      {
        field_key: 'muc_dich_su_dung', label: 'Mục đích sử dụng', type: 'select',
        required: true, thu_tu: 2, default_value: 'Website',
        options: [
          { value: 'Website',         label: 'Website',          muc_do: 'de',         diem: 1 },
          { value: 'mang_xa_hoi',     label: 'Mạng xã hội',     muc_do: 'de',         diem: 1 },
          { value: 'email',           label: 'Email marketing',  muc_do: 'de',         diem: 1 },
          { value: 'quang_cao_online',label: 'Quảng cáo online', muc_do: 'trung_binh', diem: 2 },
          { value: 'in_an',           label: 'In ấn',            muc_do: 'trung_binh', diem: 2 },
          { value: 'billboard',       label: 'Billboard',        muc_do: 'kho',         diem: 3 },
        ],
      },
      {
        field_key: 'co_animation', label: 'Banner động (animated)?', type: 'boolean',
        required: false, thu_tu: 3, default_value: false,
        options: [
          { value: 'true',  label: 'Có — GIF / HTML5', muc_do: 'kho', diem: 3 },
          { value: 'false', label: 'Không — tĩnh',     muc_do: 'de',  diem: 1 },
        ],
      },
      {
        field_key: 'dinh_dang_xuat', label: 'Định dạng xuất file', type: 'multiselect',
        required: false, thu_tu: 4, multiselect_rule: 'max', default_value: ['PNG'],
        options: [
          { value: 'PNG',   label: 'PNG',   muc_do: 'de',         diem: 1 },
          { value: 'JPG',   label: 'JPG',   muc_do: 'de',         diem: 1 },
          { value: 'GIF',   label: 'GIF',   muc_do: 'trung_binh', diem: 2 },
          { value: 'HTML5', label: 'HTML5', muc_do: 'kho',         diem: 3 },
          { value: 'PDF',   label: 'PDF',   muc_do: 'trung_binh', diem: 2 },
        ],
      },
      {
        field_key: 'so_lan_chinh_sua', label: 'Số vòng chỉnh sửa', type: 'number',
        required: false, thu_tu: 5, default_value: 2,
        hint: 'Số vòng sửa được tính vào chi phí',
        cau_hinh_do_kho_number: [
          { min: 0, max: 2, muc_do: 'de',         diem: 1 },
          { min: 3, max: 4, muc_do: 'trung_binh', diem: 2 },
          { min: 5, max: 7, muc_do: 'kho',         diem: 3 },
          { min: 8, max: 999, muc_do: 'rat_kho',   diem: 4 },
        ],
      },
    ],

    thiet_ke_logo: [
      {
        field_key: 'phong_cach_logo', label: 'Phong cách logo', type: 'select',
        required: true, thu_tu: 1, default_value: 'Hiện đại (Modern)',
        options: [
          { value: 'Tối giản (Minimal)',  label: 'Tối giản (Minimal)',  muc_do: 'de',         diem: 1 },
          { value: 'Hiện đại (Modern)',   label: 'Hiện đại (Modern)',   muc_do: 'trung_binh', diem: 2 },
          { value: 'Cổ điển (Classic)',   label: 'Cổ điển (Classic)',   muc_do: 'trung_binh', diem: 2 },
          { value: 'Vui tươi (Playful)',  label: 'Vui tươi (Playful)',  muc_do: 'trung_binh', diem: 2 },
          { value: 'Sang trọng (Luxury)', label: 'Sang trọng (Luxury)', muc_do: 'kho',         diem: 3 },
          { value: 'Kỹ thuật số (Tech)',  label: 'Kỹ thuật số (Tech)',  muc_do: 'kho',         diem: 3 },
          { value: 'Thủ công (Handmade)', label: 'Thủ công (Handmade)', muc_do: 'kho',         diem: 3 },
        ],
      },
      {
        field_key: 'so_concept', label: 'Số concept thiết kế', type: 'number',
        required: true, thu_tu: 2, default_value: 3,
        hint: 'Mỗi concept thêm tăng thêm thời gian và chi phí',
        cau_hinh_do_kho_number: [
          { min: 1, max: 2, muc_do: 'de',         diem: 1 },
          { min: 3, max: 4, muc_do: 'trung_binh', diem: 2 },
          { min: 5, max: 999, muc_do: 'kho',       diem: 3 },
        ],
      },
      {
        field_key: 'co_mascot', label: 'Có mascot / linh vật?', type: 'boolean',
        required: false, thu_tu: 3, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'rat_kho', diem: 4 },
          { value: 'false', label: 'Không', muc_do: 'de',  diem: 1 },
        ],
      },
      {
        field_key: 'can_file_source', label: 'Cần file source (AI, PSD)?', type: 'boolean',
        required: false, thu_tu: 4, default_value: true,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'trung_binh', diem: 2 },
          { value: 'false', label: 'Không', muc_do: 'de',      diem: 1 },
        ],
      },
      {
        field_key: 'so_lan_chinh_sua', label: 'Số vòng chỉnh sửa', type: 'number',
        required: false, thu_tu: 5, default_value: 3,
        cau_hinh_do_kho_number: [
          { min: 0, max: 2, muc_do: 'de',         diem: 1 },
          { min: 3, max: 5, muc_do: 'trung_binh', diem: 2 },
          { min: 6, max: 999, muc_do: 'kho',       diem: 3 },
        ],
      },
    ],

    video_quang_cao: [
      {
        field_key: 'thoi_luong_giay', label: 'Thời lượng video (giây)', type: 'number',
        required: true, thu_tu: 1, default_value: 30, min_value: 5,
        cau_hinh_do_kho_number: [
          { min: 5,  max: 15,  muc_do: 'de',         diem: 1 },
          { min: 16, max: 30,  muc_do: 'trung_binh', diem: 2 },
          { min: 31, max: 60,  muc_do: 'kho',         diem: 3 },
          { min: 61, max: 999, muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'so_luong_video', label: 'Số lượng video', type: 'number',
        required: false, thu_tu: 2, default_value: 1, min_value: 1,
        cau_hinh_do_kho_number: [
          { min: 1, max: 1, muc_do: 'de',         diem: 1 },
          { min: 2, max: 3, muc_do: 'trung_binh', diem: 2 },
          { min: 4, max: 999, muc_do: 'kho',       diem: 3 },
        ],
      },
      {
        field_key: 'do_phan_giai', label: 'Độ phân giải', type: 'select',
        required: true, thu_tu: 3, default_value: 'FullHD',
        options: [
          { value: 'HD',     label: 'HD 720p',  muc_do: 'de',         diem: 1 },
          { value: 'FullHD', label: 'Full HD',  muc_do: 'trung_binh', diem: 2 },
          { value: '2K',     label: '2K',       muc_do: 'kho',         diem: 3 },
          { value: '4K',     label: '4K',       muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'co_subtitle', label: 'Có subtitle / phụ đề?', type: 'boolean',
        required: false, thu_tu: 4, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'trung_binh', diem: 2 },
          { value: 'false', label: 'Không', muc_do: 'de',      diem: 1 },
        ],
      },
      {
        field_key: 'co_voice_over', label: 'Có voice-over / lồng tiếng?', type: 'boolean',
        required: false, thu_tu: 5, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'trung_binh', diem: 2 },
          { value: 'false', label: 'Không', muc_do: 'de',      diem: 1 },
        ],
      },
      {
        field_key: 'co_motion_graphics', label: 'Có motion graphics?', type: 'boolean',
        required: false, thu_tu: 6, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'kho', diem: 3 },
          { value: 'false', label: 'Không', muc_do: 'de', diem: 1 },
        ],
      },
      {
        field_key: 'so_lan_chinh_sua', label: 'Số vòng chỉnh sửa', type: 'number',
        required: false, thu_tu: 7, default_value: 2,
        cau_hinh_do_kho_number: [
          { min: 0, max: 2, muc_do: 'de',         diem: 1 },
          { min: 3, max: 4, muc_do: 'trung_binh', diem: 2 },
          { min: 5, max: 999, muc_do: 'kho',       diem: 3 },
        ],
      },
    ],

    animation_2d: [
      {
        field_key: 'thoi_luong_giay', label: 'Thời lượng (giây)', type: 'number',
        required: true, thu_tu: 1, default_value: 60,
        cau_hinh_do_kho_number: [
          { min: 5,   max: 30,  muc_do: 'de',         diem: 1 },
          { min: 31,  max: 60,  muc_do: 'trung_binh', diem: 2 },
          { min: 61,  max: 120, muc_do: 'kho',         diem: 3 },
          { min: 121, max: 999, muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'so_canh', label: 'Số cảnh / scene', type: 'number',
        required: true, thu_tu: 2, default_value: 5,
        cau_hinh_do_kho_number: [
          { min: 1,  max: 5,   muc_do: 'de',         diem: 1 },
          { min: 6,  max: 10,  muc_do: 'trung_binh', diem: 2 },
          { min: 11, max: 20,  muc_do: 'kho',         diem: 3 },
          { min: 21, max: 999, muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'co_character', label: 'Có nhân vật / character?', type: 'boolean',
        required: false, thu_tu: 3, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'rat_kho', diem: 4 },
          { value: 'false', label: 'Không', muc_do: 'de',   diem: 1 },
        ],
      },
      {
        field_key: 'do_phan_giai', label: 'Độ phân giải', type: 'select',
        required: true, thu_tu: 4, default_value: 'FullHD',
        options: [
          { value: 'HD',     label: 'HD',     muc_do: 'de',         diem: 1 },
          { value: 'FullHD', label: 'Full HD', muc_do: 'trung_binh', diem: 2 },
          { value: '2K',     label: '2K',     muc_do: 'kho',         diem: 3 },
          { value: '4K',     label: '4K',     muc_do: 'rat_kho',     diem: 4 },
        ],
      },
    ],

    animation_3d: [
      {
        field_key: 'thoi_luong_giay', label: 'Thời lượng (giây)', type: 'number',
        required: true, thu_tu: 1, default_value: 30,
        cau_hinh_do_kho_number: [
          { min: 1,  max: 15,  muc_do: 'de',         diem: 1 },
          { min: 16, max: 30,  muc_do: 'trung_binh', diem: 2 },
          { min: 31, max: 60,  muc_do: 'kho',         diem: 3 },
          { min: 61, max: 999, muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'so_object_3d', label: 'Số object / model 3D', type: 'number',
        required: true, thu_tu: 2, default_value: 1,
        cau_hinh_do_kho_number: [
          { min: 1, max: 2,   muc_do: 'de',         diem: 1 },
          { min: 3, max: 5,   muc_do: 'trung_binh', diem: 2 },
          { min: 6, max: 10,  muc_do: 'kho',         diem: 3 },
          { min: 11, max: 999, muc_do: 'rat_kho',    diem: 4 },
        ],
      },
      {
        field_key: 'co_character', label: 'Có nhân vật 3D?', type: 'boolean',
        required: false, thu_tu: 3, default_value: false,
        options: [
          { value: 'true',  label: 'Có', muc_do: 'rat_kho', diem: 4 },
          { value: 'false', label: 'Không', muc_do: 'de',   diem: 1 },
        ],
      },
      {
        field_key: 'do_phan_giai', label: 'Độ phân giải', type: 'select',
        required: true, thu_tu: 4, default_value: 'FullHD',
        options: [
          { value: 'HD',     label: 'HD',     muc_do: 'de',         diem: 1 },
          { value: 'FullHD', label: 'Full HD', muc_do: 'trung_binh', diem: 2 },
          { value: '2K',     label: '2K',     muc_do: 'kho',         diem: 3 },
          { value: '4K',     label: '4K',     muc_do: 'rat_kho',     diem: 4 },
        ],
      },
    ],

    chinh_sua_anh: [
      {
        field_key: 'so_luong_anh', label: 'Số lượng ảnh', type: 'number',
        required: true, thu_tu: 1, default_value: 10,
        cau_hinh_do_kho_number: [
          { min: 1,   max: 10,  muc_do: 'de',         diem: 1 },
          { min: 11,  max: 30,  muc_do: 'trung_binh', diem: 2 },
          { min: 31,  max: 100, muc_do: 'kho',         diem: 3 },
          { min: 101, max: 999, muc_do: 'rat_kho',     diem: 4 },
        ],
      },
      {
        field_key: 'muc_do_chinh_sua', label: 'Mức độ chỉnh sửa', type: 'select',
        required: true, thu_tu: 2, default_value: 'trung_binh',
        options: [
          { value: 'nhe',       label: 'Nhẹ (màu sắc, ánh sáng)', muc_do: 'de',   diem: 1 },
          { value: 'trung_binh', label: 'Trung bình (xóa bg, retouch)', muc_do: 'trung_binh', diem: 2 },
          { value: 'nang',      label: 'Nặng (ghép ảnh, manipulate)', muc_do: 'kho', diem: 3 },
        ],
      },
    ],
  };

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [slug, fields] of Object.entries(SEED_DATA)) {
    const category = await ProjectCategory.findOne({ slug, deleted_at: null });
    if (!category) {
      console.log(`⚠️  Bỏ qua "${slug}" — loại dự án chưa được tạo`);
      continue;
    }

    for (const fieldData of fields) {
      const exists = await ProjectRequirementField.findOne({
        ma_loai_du_an: category._id,
        field_key: fieldData.field_key,
      });
      if (exists) {
        totalSkipped++;
        continue;
      }
      await ProjectRequirementField.create({ ...fieldData, ma_loai_du_an: category._id });
      totalCreated++;
    }
    console.log(`✅ ${category.ten_hien_thi} — đã xử lý ${fields.length} field`);
  }

  console.log(`\n🎉 Hoàn tất: ${totalCreated} tạo mới, ${totalSkipped} bỏ qua (đã tồn tại)`);
  await mongoose.disconnect();
}

run().catch(e => { console.error('❌', e); process.exit(1); });
