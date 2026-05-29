require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User.model');
const KhachHang = require('../models/KhachHang.model');
const DuAn = require('../models/DuAn.model');
const YeuCauDuAn = require('../models/YeuCauDuAn');
const CapDoNhanVien = require('../models/CapDoNhanVien.model');
const NhanVien = require('../models/NhanVien.model');
const { KyNang, KyNangNhanVien } = require('../models/KyNang.model');
const PhanCongDuAn = require('../models/PhanCongDuAn.model');
const { DanhGiaHieuSuat, ChiPhiKyThuat, PhanTichRuiRo, UocTinhChiPhi, ChiPhiThucTe, DuLieuHocMay } = require('../models/index');

const seed = async () => {
  await connectDB();

  // Xóa hết data cũ
  await Promise.all([
    User.deleteMany(), KhachHang.deleteMany(), DuAn.deleteMany(),
    YeuCauDuAn.deleteMany(), CapDoNhanVien.deleteMany(), NhanVien.deleteMany(),
    KyNang.deleteMany(), KyNangNhanVien.deleteMany(), PhanCongDuAn.deleteMany(),
    DanhGiaHieuSuat.deleteMany(), ChiPhiKyThuat.deleteMany(),
    PhanTichRuiRo.deleteMany(), UocTinhChiPhi.deleteMany(),
    ChiPhiThucTe.deleteMany(), DuLieuHocMay.deleteMany()
  ]);
  console.log('🗑️  Cleared all collections');

  // ── USERS ────────────────────────────────────────────────────
  await User.create([
    { username: 'admin', password: 'admin123', ho_ten: 'Admin System', email: 'admin@estipro.vn', vai_tro: 'admin' },
    { username: 'manager', password: 'manager123', ho_ten: 'Nguyễn Quản Lý', email: 'manager@estipro.vn', vai_tro: 'manager' },
  ]);
  console.log('✅ Users');

  // ── CAP DO NHAN VIEN ─────────────────────────────────────────
  const capDos = await CapDoNhanVien.insertMany([
    { ten_cap_do: 'junior',  mo_ta: 'Dưới 1 năm kinh nghiệm',  luong_mac_dinh_theo_gio: 80000 },
    { ten_cap_do: 'mid',     mo_ta: '1-3 năm kinh nghiệm',     luong_mac_dinh_theo_gio: 150000 },
    { ten_cap_do: 'senior',  mo_ta: '3-7 năm kinh nghiệm',     luong_mac_dinh_theo_gio: 250000 },
    { ten_cap_do: 'expert',  mo_ta: 'Trên 7 năm kinh nghiệm',  luong_mac_dinh_theo_gio: 400000 },
  ]);
  const [junior, mid, senior, expert] = capDos;
  console.log('✅ CapDoNhanVien');

  // ── KY NANG ───────────────────────────────────────────────────
  const kyNangs = await KyNang.insertMany([
    { ten_ky_nang: 'Photoshop' },
    { ten_ky_nang: 'Illustrator' },
    { ten_ky_nang: 'After Effects' },
    { ten_ky_nang: 'Premiere Pro' },
    { ten_ky_nang: 'Blender' },
    { ten_ky_nang: 'Cinema 4D' },
    { ten_ky_nang: 'DaVinci Resolve' },
    { ten_ky_nang: 'Figma' },
    { ten_ky_nang: 'Midjourney AI' },
  ]);
  const [ps, ai, ae, pr, bl, c4d, dr, fg, mj] = kyNangs;
  console.log('✅ KyNang');

  // ── NHAN VIEN ─────────────────────────────────────────────────
  const nhanViens = await NhanVien.insertMany([
    { ma_cap_do: senior._id, ho_ten: 'Trần Thị Lan',   email: 'lan@estipro.vn',   so_dien_thoai: '0901111111', vai_tro: 'designer',       luong_theo_gio: 250000, trang_thai_lam_viec: 'available' },
    { ma_cap_do: mid._id,    ho_ten: 'Nguyễn Văn Minh',email: 'minh@estipro.vn',  so_dien_thoai: '0902222222', vai_tro: 'video_editor',    luong_theo_gio: 150000, trang_thai_lam_viec: 'available' },
    { ma_cap_do: expert._id, ho_ten: 'Phạm Thị Hoa',   email: 'hoa@estipro.vn',   so_dien_thoai: '0903333333', vai_tro: 'animator',        luong_theo_gio: 400000, trang_thai_lam_viec: 'available' },
    { ma_cap_do: junior._id, ho_ten: 'Lê Văn Đức',     email: 'duc@estipro.vn',   so_dien_thoai: '0904444444', vai_tro: 'designer',        luong_theo_gio: 80000,  trang_thai_lam_viec: 'available' },
    { ma_cap_do: senior._id, ho_ten: 'Vũ Thị Mai',     email: 'mai@estipro.vn',   so_dien_thoai: '0905555555', vai_tro: 'motion_designer', luong_theo_gio: 280000, trang_thai_lam_viec: 'busy' },
  ]);
  const [lan, minh, hoa, duc, mai] = nhanViens;
  console.log('✅ NhanVien');

  // ── KY NANG NHAN VIEN ─────────────────────────────────────────
  await KyNangNhanVien.insertMany([
    { ma_nhan_vien: lan._id,  ma_ky_nang: ps._id,  muc_do_thanh_thao: 'expert' },
    { ma_nhan_vien: lan._id,  ma_ky_nang: ai._id,  muc_do_thanh_thao: 'advanced' },
    { ma_nhan_vien: lan._id,  ma_ky_nang: fg._id,  muc_do_thanh_thao: 'intermediate' },
    { ma_nhan_vien: minh._id, ma_ky_nang: pr._id,  muc_do_thanh_thao: 'advanced' },
    { ma_nhan_vien: minh._id, ma_ky_nang: dr._id,  muc_do_thanh_thao: 'intermediate' },
    { ma_nhan_vien: hoa._id,  ma_ky_nang: ae._id,  muc_do_thanh_thao: 'expert' },
    { ma_nhan_vien: hoa._id,  ma_ky_nang: bl._id,  muc_do_thanh_thao: 'advanced' },
    { ma_nhan_vien: duc._id,  ma_ky_nang: ps._id,  muc_do_thanh_thao: 'beginner' },
    { ma_nhan_vien: mai._id,  ma_ky_nang: ae._id,  muc_do_thanh_thao: 'expert' },
    { ma_nhan_vien: mai._id,  ma_ky_nang: c4d._id, muc_do_thanh_thao: 'intermediate' },
  ]);
  console.log('✅ KyNangNhanVien');

  // ── KHACH HANG ────────────────────────────────────────────────
  const khs = await KhachHang.insertMany([
    { ten_cong_ty: 'TechCorp Vietnam',  nguoi_lien_he: 'Anh Hùng',  email: 'hung@techcorp.vn',     so_dien_thoai: '0281111111', diem_do_kho: 2 },
    { ten_cong_ty: 'Fashion Brand X',   nguoi_lien_he: 'Chị Thảo',  email: 'thao@fashionx.vn',     so_dien_thoai: '0282222222', diem_do_kho: 4 },
    { ten_cong_ty: 'StartUp ABC',       nguoi_lien_he: 'Anh Bình',  email: 'binh@startupABC.vn',   so_dien_thoai: '0283333333', diem_do_kho: 3 },
    { ten_cong_ty: 'Media House Pro',   nguoi_lien_he: 'Chị Ngân',  email: 'ngan@mediahousepro.vn',so_dien_thoai: '0284444444', diem_do_kho: 1 },
  ]);
  const [tc, fb, sa, mh] = khs;
  console.log('✅ KhachHang');

  // ── DU AN ─────────────────────────────────────────────────────
  const duAns = await DuAn.insertMany([
    { ma_khach_hang: tc._id, ten_du_an: 'Video quảng cáo sản phẩm TechCorp Q1', loai_du_an: 'video_quang_cao', trang_thai: 'completed', ngay_bat_dau: new Date('2024-01-05'), deadline: new Date('2024-01-25') },
    { ma_khach_hang: fb._id, ten_du_an: 'Bộ banner mùa hè Fashion Brand X',     loai_du_an: 'thiet_ke_banner', trang_thai: 'completed', ngay_bat_dau: new Date('2024-02-01'), deadline: new Date('2024-02-10') },
    { ma_khach_hang: sa._id, ten_du_an: 'Intro animation cho StartUp ABC',       loai_du_an: 'intro_animation', trang_thai: 'in_progress',ngay_bat_dau: new Date('2024-03-10'), deadline: new Date('2024-04-10') },
    { ma_khach_hang: mh._id, ten_du_an: 'Motion graphics series Media House',    loai_du_an: 'motion_graphics', trang_thai: 'quoted',     ngay_bat_dau: new Date('2024-04-01'), deadline: new Date('2024-05-01') },
    { ma_khach_hang: tc._id, ten_du_an: 'Animation 3D sản phẩm mới TechCorp',   loai_du_an: 'animation_3d',    trang_thai: 'draft',      ngay_bat_dau: null,                   deadline: new Date('2024-06-01') },
  ]);
  const [da1, da2, da3, da4, da5] = duAns;
  console.log('✅ DuAn');

  // ── YEU CAU DU AN ─────────────────────────────────────────────
  await YeuCauDuAn.insertMany([
    { ma_du_an: da1._id, so_luong_noi_dung: 1, thoi_luong_video_giay: 30,  do_phan_giai: 'FullHD', so_lan_chinh_sua: 3, muc_do_gap: 'binh_thuong', co_animation: false, co_vfx: false },
    { ma_du_an: da2._id, so_luong_noi_dung: 5, thoi_luong_video_giay: 0,   do_phan_giai: 'FullHD', so_lan_chinh_sua: 2, muc_do_gap: 'gap',         co_animation: false, co_vfx: false },
    { ma_du_an: da3._id, so_luong_noi_dung: 1, thoi_luong_video_giay: 15,  do_phan_giai: '2K',     so_lan_chinh_sua: 2, muc_do_gap: 'binh_thuong', co_animation: true,  co_vfx: false },
    { ma_du_an: da4._id, so_luong_noi_dung: 3, thoi_luong_video_giay: 60,  do_phan_giai: 'FullHD', so_lan_chinh_sua: 4, muc_do_gap: 'sieu_gap',    co_animation: true,  co_vfx: true  },
    { ma_du_an: da5._id, so_luong_noi_dung: 1, thoi_luong_video_giay: 45,  do_phan_giai: '4K',     so_lan_chinh_sua: 3, muc_do_gap: 'binh_thuong', co_animation: true,  co_vfx: true  },
  ]);
  console.log('✅ YeuCauDuAn');

  // ── PHAN CONG DU AN ───────────────────────────────────────────
  const phanCongs = await PhanCongDuAn.insertMany([
    { ma_du_an: da1._id, ma_nhan_vien: minh._id, vai_tro_trong_du_an: 'Video Editor',  gio_du_kien: 20, gio_thuc_te: 22 },
    { ma_du_an: da1._id, ma_nhan_vien: lan._id,  vai_tro_trong_du_an: 'Lead Designer', gio_du_kien: 8,  gio_thuc_te: 9  },
    { ma_du_an: da2._id, ma_nhan_vien: lan._id,  vai_tro_trong_du_an: 'Designer',      gio_du_kien: 16, gio_thuc_te: 15 },
    { ma_du_an: da2._id, ma_nhan_vien: duc._id,  vai_tro_trong_du_an: 'Junior Support',gio_du_kien: 8,  gio_thuc_te: 10 },
    { ma_du_an: da3._id, ma_nhan_vien: hoa._id,  vai_tro_trong_du_an: 'Lead Animator', gio_du_kien: 30, gio_thuc_te: 0  },
    { ma_du_an: da4._id, ma_nhan_vien: mai._id,  vai_tro_trong_du_an: 'Motion Designer',gio_du_kien: 40, gio_thuc_te: 0 },
    { ma_du_an: da4._id, ma_nhan_vien: hoa._id,  vai_tro_trong_du_an: 'VFX Artist',    gio_du_kien: 20, gio_thuc_te: 0  },
    { ma_du_an: da5._id, ma_nhan_vien: hoa._id,  vai_tro_trong_du_an: 'Lead 3D',       gio_du_kien: 60, gio_thuc_te: 0  },
  ]);
  console.log('✅ PhanCongDuAn');

  // ── CHI PHI KY THUAT ──────────────────────────────────────────
  await ChiPhiKyThuat.insertMany([
    { ma_du_an: da1._id, chi_phi_phan_mem: 500000,  chi_phi_render: 200000,  chi_phi_luu_tru: 100000, chi_phi_tai_nguyen: 300000 },
    { ma_du_an: da2._id, chi_phi_phan_mem: 500000,  chi_phi_render: 0,       chi_phi_luu_tru: 50000,  chi_phi_tai_nguyen: 200000 },
    { ma_du_an: da3._id, chi_phi_phan_mem: 500000,  chi_phi_render: 300000,  chi_phi_luu_tru: 100000, chi_phi_tai_nguyen: 100000 },
    { ma_du_an: da4._id, chi_phi_phan_mem: 1000000, chi_phi_render: 500000,  chi_phi_luu_tru: 200000, chi_phi_tai_nguyen: 500000 },
    { ma_du_an: da5._id, chi_phi_phan_mem: 1000000, chi_phi_render: 2000000, chi_phi_luu_tru: 300000, chi_phi_tai_nguyen: 500000 },
  ]);
  console.log('✅ ChiPhiKyThuat');

  // ── PHAN TICH RUI RO ──────────────────────────────────────────
  await PhanTichRuiRo.insertMany([
    { ma_du_an: da1._id, phan_tram_rui_ro: 8,  ly_do_rui_ro: 'Rủi ro cơ bản' },
    { ma_du_an: da2._id, phan_tram_rui_ro: 15, ly_do_rui_ro: 'Khách hàng khó tính; Deadline gấp (+30%)' },
    { ma_du_an: da3._id, phan_tram_rui_ro: 10, ly_do_rui_ro: 'Có animation' },
    { ma_du_an: da4._id, phan_tram_rui_ro: 30, ly_do_rui_ro: 'Khách hàng khó tính; Deadline siêu gấp; Nhiều lần sửa' },
    { ma_du_an: da5._id, phan_tram_rui_ro: 12, ly_do_rui_ro: 'Có VFX + Animation' },
  ]);
  console.log('✅ PhanTichRuiRo');

  // ── UOC TINH CHI PHI ─────────────────────────────────────────
  // da1: minh(150k×20=3M) + lan(250k×8=2M) = 5M nhân sự + 1.1M KT = 6.1M × 1.0 × 1.08 rủi ro
  await UocTinhChiPhi.insertMany([
    { ma_du_an: da1._id, chi_phi_nhan_su: 5000000,  chi_phi_ky_thuat: 1100000,  chi_phi_rui_ro: 492800,  tong_chi_phi_du_kien: 6592800,  ty_le_loi_nhuan: 20, gia_de_xuat: 7911360  },
    { ma_du_an: da2._id, chi_phi_nhan_su: 4640000,  chi_phi_ky_thuat: 750000,   chi_phi_rui_ro: 1009500, tong_chi_phi_du_kien: 7499500,  ty_le_loi_nhuan: 20, gia_de_xuat: 8999400  },
    { ma_du_an: da3._id, chi_phi_nhan_su: 12000000, chi_phi_ky_thuat: 1000000,  chi_phi_rui_ro: 1300000, tong_chi_phi_du_kien: 14300000, ty_le_loi_nhuan: 25, gia_de_xuat: 17875000 },
    { ma_du_an: da4._id, chi_phi_nhan_su: 19200000, chi_phi_ky_thuat: 2200000,  chi_phi_rui_ro: 8619000, tong_chi_phi_du_kien: 37619000, ty_le_loi_nhuan: 25, gia_de_xuat: 47023750 },
    { ma_du_an: da5._id, chi_phi_nhan_su: 24000000, chi_phi_ky_thuat: 3800000,  chi_phi_rui_ro: 3336000, tong_chi_phi_du_kien: 31136000, ty_le_loi_nhuan: 30, gia_de_xuat: 40476800 },
  ]);
  console.log('✅ UocTinhChiPhi');

  // ── CHI PHI THUC TE (chỉ dự án đã completed) ─────────────────
  await ChiPhiThucTe.insertMany([
    { ma_du_an: da1._id, tong_chi_phi_thuc_te: 6800000,  loi_nhuan_thuc_te: 1111360, so_lan_sua_thuc_te: 2, so_ngay_tre_deadline: 0 },
    { ma_du_an: da2._id, tong_chi_phi_thuc_te: 8200000,  loi_nhuan_thuc_te: 799400,  so_lan_sua_thuc_te: 3, so_ngay_tre_deadline: 1 },
  ]);
  console.log('✅ ChiPhiThucTe');

  // ── DANH GIA HIEU SUAT ────────────────────────────────────────
  await DanhGiaHieuSuat.insertMany([
    { ma_nhan_vien: minh._id, ma_du_an: da1._id, diem_chat_luong: 8, so_ngay_tre: 0, so_lan_sua: 2, nhan_xet_quan_ly: 'Hoàn thành tốt, đúng hạn' },
    { ma_nhan_vien: lan._id,  ma_du_an: da1._id, diem_chat_luong: 9, so_ngay_tre: 0, so_lan_sua: 1, nhan_xet_quan_ly: 'Chất lượng thiết kế xuất sắc' },
    { ma_nhan_vien: lan._id,  ma_du_an: da2._id, diem_chat_luong: 8, so_ngay_tre: 1, so_lan_sua: 3, nhan_xet_quan_ly: 'Khách hàng khó tính nhưng xử lý ổn' },
    { ma_nhan_vien: duc._id,  ma_du_an: da2._id, diem_chat_luong: 6, so_ngay_tre: 1, so_lan_sua: 4, nhan_xet_quan_ly: 'Cần cải thiện tốc độ làm việc' },
  ]);
  console.log('✅ DanhGiaHieuSuat');

  // ── DU LIEU HOC MAY ───────────────────────────────────────────
  await DuLieuHocMay.insertMany([
    { ma_du_an: da1._id, chi_phi_du_doan: 6592800,  chi_phi_thuc_te: 6800000,  do_chinh_xac_du_doan: 96.9 },
    { ma_du_an: da2._id, chi_phi_du_doan: 7499500,  chi_phi_thuc_te: 8200000,  do_chinh_xac_du_doan: 91.5 },
  ]);
  console.log('✅ DuLieuHocMay');

  console.log('\n🎉 SEED HOÀN TẤT!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login: admin / admin123');
  console.log('Login: manager / manager123');
  console.log('MongoDB: mongodb://localhost:27017/estipro_db');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
