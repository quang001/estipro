// ─── Trạng thái dự án ─────────────────────────────────────────────────────
const TRANG_THAI_DU_AN = ['draft', 'quoted', 'approved', 'in_progress', 'review', 'completed', 'cancelled'];

// ─── Loại dự án ────────────────────────────────────────────────────────────
const LOAI_DU_AN = [
  'thiet_ke_banner', 'thiet_ke_logo', 'chinh_sua_anh',
  'video_quang_cao', 'motion_graphics', 'animation_2d',
  'animation_3d', 'vfx', 'video_san_xuat',
  'intro_animation', 'social_media', 'khac',
];

// ─── Vai trò nhân viên ─────────────────────────────────────────────────────
const VAI_TRO_NHAN_VIEN = [
  'designer', 'video_editor', 'animator', 'motion_designer',
  'voice_actor', 'project_manager', 'vfx_artist', 'photographer',
];

// ─── Cấp độ nhân viên ─────────────────────────────────────────────────────
const CAP_DO_NHAN_VIEN = ['junior', 'mid', 'senior', 'expert'];

// ─── Trạng thái làm việc ──────────────────────────────────────────────────
const TRANG_THAI_LAM_VIEC = ['available', 'busy', 'on_leave', 'inactive'];

// ─── Scoring constants ─────────────────────────────────────────────────────
const SCORING = {
  BASE_SCORE:      10,
  DIEM_LEN_CAP:    200,
  LAN_0_SAO_PHAT:  5,
  BONUS:   { dung_deadline: 2, khong_bi_sua: 3 },
  PENALTY: { tre_deadline: -2, bi_sua_nhieu: -3 },
  RATING_MAP: { 5: 1.0, 4: 0.8, 3: 0.6, 2: 0.4, 1: 0.2, 0: 0.0 },
};

module.exports = {
  TRANG_THAI_DU_AN,
  LOAI_DU_AN,
  VAI_TRO_NHAN_VIEN,
  CAP_DO_NHAN_VIEN,
  TRANG_THAI_LAM_VIEC,
  SCORING,
};
