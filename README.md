# EstiPro - Hệ Thống Quản Lý Dự Án & Ước Tính Chi Phí Đối Với Sản Xuất Nội Dung

## 📋 Giới Thiệu Hệ Thống

**EstiPro** là một nền tảng quản lý dự án toàn diện dành cho các công ty sản xuất nội dung, video, animation và thiết kế đồ họa. Hệ thống cung cấp những tính năng mạnh mẽ để:

- 📊 **Ước tính chi phí dự án** một cách chính xác dựa trên độ khó, deadline, yêu cầu kỹ thuật
- 👥 **Quản lý nhân viên** theo vai trò, cấp độ, và lịch sử hiệu suất
- 💰 **Tính toán giá bán** tự động với xem xét rủi ro, lợi nhuận, và buffer deadline
- 📈 **Theo dõi hiệu suất** nhân viên qua điểm số, xếp hạng, lên cấp độ
- 📱 **Giao diện quản lý** trực quan cho cả quản trị viên, nhân viên, và khách hàng
- 🤖 **Hỗ trợ AI** (tính năng mở rộng) để đánh giá độ khó tự động

---

## 🎯 Chức Năng Chính

### 1. **Quản Lý Dự Án (Projects)**
- Tạo, chỉnh sửa, xóa dự án
- Theo dõi trạng thái: Draft → Quoted → Approved → In Progress → Review → Completed
- Liên kết với khách hàng
- Quản lý deadline và yêu cầu kỹ thuật

### 2. **Ước Tính Chi Phí Thông Minh**
Hệ thống tự động ước tính chi phí dựa trên 3 thành phần chính:
- **Chi phí nhân sự** (dựa trên giờ công × lương theo giờ)
- **Chi phí kỹ thuật** (phần mềm, render, lưu trữ, tài nguyên)
- **Buffer rủi ro** (dự phòng các rủi ro phát sinh)

### 3. **Đánh Giá Độ Khó Dự Án (Difficulty Engine)**
- Phân tích từng yêu cầu kỹ thuật
- Tính điểm độ khó từ 1.0 - 4.0
- Phân loại: Dễ (1.0) → Trung bình (1.3) → Khó (1.7) → Rất khó (2.2)
- Hệ số độ khó nhân lên giờ công để điều chỉnh chi phí

### 4. **Quản Lý Nhân Viên & Cấp Độ**
- Tạo hồ sơ nhân viên theo vai trò (Designer, Video Editor, Animator, VFX Artist, v.v.)
- Theo dõi cấp độ: Junior → Mid → Senior → Expert
- Lương theo giờ được cấu hình từng nhân viên

### 5. **Hệ Thống Điểm & Xếp Hạng**
- Tính điểm dự án dựa trên đánh giá (0-5 sao) từ khách hàng
- Bonus/Penalty: Dứng deadline (+2), Không bị sửa (+3), Trễ deadline (-2), Bị sửa nhiều (-3)
- Tích lũy 1000 điểm → Lên 1 cấp độ
- 5 lần 0 sao → Xuống 1 cấp độ

### 6. **Quản Lý Khách Hàng (CRM)**
- Lưu thông tin khách hàng, người liên hệ
- **Điểm độ khó khách hàng** (1-5): Ảnh hưởng tới buffer rủi ro
- Lịch sử dự án và giao dịch

### 7. **Báo Cáo & Thống Kê**
- Dashboard hiệu suất nhân viên
- Phân tích chi phí dự án (ước tính vs thực tế)
- Lợi nhuận theo dự án, nhân viên
- Biểu đồ trend theo thời gian

---

## 💰 Cách Tính Tiền - Công Thức Ước Tính Chi Phí

### **Bước 1: Xác Định Giờ Công Dự Kiến**

```
Tổng giờ công = Giờ cơ bản × Hệ số độ khó × Hệ số deadline

Giờ cơ bản: Được cấu hình theo loại dự án (VD: Animation 3D = 30 giờ)
Hệ số độ khó:
  - Dễ:          1.0
  - Trung bình:  1.3
  - Khó:         1.7
  - Rất khó:     2.2

Hệ số deadline:
  - Bình thường:  1.0
  - Gấp:          1.2
  - Siêu gấp:     1.5
```

**Ví dụ:** 
- Dự án: Animation 3D (30 giờ cơ bản)
- Độ khó: Rất khó (2.2)
- Deadline: Gấp (1.2)
- **Tổng giờ = 30 × 2.2 × 1.2 = 79.2 giờ**

### **Bước 2: Tính Chi Phí Nhân Sự**

```
Chi phí nhân sự = Σ(Lương theo giờ của nhân viên × Giờ công được pân công)
```

Hệ thống tự động đề xuất phân công nhân viên theo vai trò, nhưng có thể chỉnh sửa thủ công.

**Ví dụ:** Phan công Animation 3D (79.2 giờ)
- Animator 70% (55.44 giờ) × 150,000 VND/giờ = 8,316,000 VND
- Motion Designer 20% (15.84 giờ) × 120,000 VND/giờ = 1,900,800 VND
- Designer 10% (7.92 giờ) × 100,000 VND/giờ = 792,000 VND
- **Chi phí nhân sự = 11,008,800 VND**

### **Bước 3: Tính Chi Phí Kỹ Thuật**

```
Chi phí kỹ thuật = Chi phí phần mềm + Chi phí render + Chi phí lưu trữ + Chi phí tài nguyên

Có thể:
1. Nhập tự động: Dựa trên loại dự án (cấu hình trong ProjectCategory)
2. Nhập thủ công: Quản trị viên nhập chi tiết từng khoản
```

**Chi phí kỹ thuật mặc định theo loại dự án:**
- Intro Animation: 200,000 VND
- Video Quảng Cáo: 300,000 VND
- Animation 2D: 400,000 VND
- Animation 3D: 800,000 VND
- VFX: 1,000,000 VND
- Thiết kế logo: 50,000 VND
- Thiết kế banner: 30,000 VND

### **Bước 4: Tính Buffer Rủi Ro**

```
Buffer rủi ro = Tổng chi phí cơ bản × % rủi ro

% rủi ro được tính từ các yếu tố:
- Khách hàng khó tính (3-4 điểm): +8% | (5 điểm): +15%
- Deadline gấp: +6% | Siêu gấp: +12%
- Số lần sửa > 3 lần: +5% | > 5 lần: +10%
- Dự án kỹ thuật cao (3D/VFX): +10%
- Dự án animation: +6%
- Output 4K: +5%
- VFX cực kỳ phức tạp: +12%
- Tối đa: 45%
```

**Ví dụ:** Khách hàng (4 điểm) + Deadline gấp + Vòng sửa 3 lần + Animation 3D + Output 4K
- Rủi ro = 8% + 6% + 5% + 10% + 5% = 34%

### **Bước 5: Tính Tổng Chi Phí & Giá Đề Xuất**

```
Tổng chi phí dự kiến = Chi phí nhân sự + Chi phí kỹ thuật

Giá đề xuất = Tổng chi phí × (1 + Tỷ lệ lợi nhuận/100)

Tỷ lệ lợi nhuận: Mặc định 25% (có thể chỉnh sửa theo chính sách công ty)
```

**Ví dụ hoàn chỉnh Animation 3D:**
- Chi phí nhân sự: 11,008,800 VND
- Chi phí kỹ thuật: 1,000,000 VND
- Tổng chi phí: 12,008,800 VND
- Buffer rủi ro (34%): 4,083,000 VND
- **Tổng với rủi ro: 16,091,800 VND**
- Lợi nhuận (25%): 4,022,950 VND
- **Giá đề xuất: 20,114,750 VND ≈ 20,115,000 VND**

---

## 🏗️ Kiến Trúc Hệ Thống

### **Cấu Trúc Thư Mục**

```
Admin-Project/
├── backend/                      # API Server (Node.js/Express)
│   └── src/
│       ├── server.js             # Entry point
│       ├── config/
│       │   ├── constants.js       # Hằng số, enum
│       │   └── database.js        # MongoDB connection
│       ├── models/               # Mongoose schemas
│       │   ├── DuAn.model.js      # Projects
│       │   ├── NhanVien.model.js  # Employees
│       │   ├── KhachHang.model.js # Customers
│       │   ├── ProjectCategory.model.js  # Project types
│       │   └── index.js           # Additional schemas
│       ├── controllers/          # Business logic
│       │   ├── duAn.controller.js
│       │   ├── nhanVien.controller.js
│       │   └── ...
│       ├── routes/               # API endpoints
│       ├── middlewares/          # Auth, error handling
│       ├── utils/                # Core engines
│       │   ├── estimationEngine.js    # Chi phí ước tính
│       │   ├── difficultyEngine.js    # Đánh giá độ khó
│       │   ├── scoringEngine.js       # Hệ thống điểm
│       │   └── aiService.js           # AI support (optional)
│       └── seed/                 # Database seeding
│
├── frontend/                     # React UI (Vite)
│   └── src/
│       ├── App.jsx               # Main app component
│       ├── pages/                # Page components
│       │   ├── projects/
│       │   ├── employees/
│       │   ├── statistics/
│       │   └── ...
│       ├── components/           # Reusable components
│       ├── services/
│       │   └── api.js            # API client (axios)
│       ├── contexts/
│       │   └── AuthContext.jsx   # Auth state
│       └── styles/               # CSS files
│
└── README.md                     # This file
```

### **Technology Stack**

#### **Backend**
- **Framework:** Express.js (Node.js)
- **Database:** MongoDB + Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Security:** Helmet, CORS, bcryptjs, rate limiting
- **Logging:** Morgan
- **Environment:** dotenv

#### **Frontend**
- **Framework:** React 19.2.6 với Vite
- **State Management:** Redux Toolkit
- **Routing:** React Router v7
- **HTTP Client:** Axios
- **UI Libraries:** 
  - Lucide React (Icons)
  - Framer Motion (Animation)
  - Recharts (Charting)
- **Styling:** CSS custom

#### **DevTools**
- ESLint (Code linting)
- Nodemon (Auto-restart backend)

---

## 📊 Luồng Dữ Liệu & Hoạt Động Chính

### **1. Tạo Dự Án & Ước Tính Chi Phí**

```
Khách hàng tạo dự án
    ↓
System phân tích yêu cầu kỹ thuật
    ↓
DifficultyEngine đánh giá độ khó (1.0-4.0)
    ↓
EstimationEngine tính:
  - Giờ công cần thiết
  - Chi phí nhân sự (dựa trên phan công)
  - Chi phí kỹ thuật
  - Buffer rủi ro
    ↓
Tính toán giá đề xuất = (Tổng chi phí) × (1 + Lợi nhuận%)
    ↓
Trạng thái: Draft → Quoted (Gửi báo giá cho khách hàng)
```

### **2. Phê Duyệt & Khởi Động Dự Án**

```
Khách hàng chấp nhận giá
    ↓
Trạng thái: Quoted → Approved (Hợp đồng ký)
    ↓
Quản trị viên phan công nhân viên
    ↓
Trạng thái: Approved → In Progress
    ↓
Nhân viên bắt đầu làm việc (ghi nhận giờ công thực tế)
```

### **3. Hoàn Thành & Đánh Giá**

```
Nhân viên hoàn thành công việc
    ↓
Trạng thái: In Progress → Review (Xem xét chất lượng)
    ↓
Khách hàng đánh giá: 0-5 sao
    ↓
ScoringEngine tính điểm cho nhân viên:
  - Điểm cơ bản = 10 × (so_sao/5)
  - Thêm Bonus/Penalty
  - Chia theo tỷ lệ đóng góp của từng nhân viên
    ↓
Cập nhật điểm tích lũy, kiểm tra lên/xuống cấp
    ↓
Trạng thái: Review → Completed
    ↓
Lưu chi phí thực tế (tính lợi nhuận/lỗ thực tế)
```

### **4. Theo Dõi Hiệu Suất Nhân Viên**

```
Sau mỗi dự án hoàn thành:
  - Cập nhật điểm tích lũy (diem_tich_luy)
  - Cập nhật điểm trung bình (diem_trung_binh)
  - Đếm 0 sao (so_lan_0_sao)
  - Kiểm tra lên cấp: diem_tich_luy >= 1000 → Lên 1 cấp
  - Kiểm tra xuống cấp: so_lan_0_sao >= 5 → Xuống 1 cấp (reset đếm)

Cấp độ: Junior → Mid → Senior → Expert
```

---

## 🗄️ Cấu Trúc Dữ Liệu Chính

### **DuAn (Projects)**
```javascript
{
  _id, ma_khach_hang, ten_du_an, loai_du_an, mo_ta,
  trang_thai: 'draft|quoted|approved|in_progress|review|completed',
  deadline, yeu_cau: {...},
  so_sao: 0-5,
  // Audit
  created_by, updated_by, deleted_at, deleted_by,
  timestamps
}
```

### **NhanVien (Employees)**
```javascript
{
  _id, ma_cap_do, ho_ten, email, vai_tro,
  luong_theo_gio, trang_thai_lam_viec,
  // Scoring
  diem_tich_luy, so_lan_0_sao, tong_du_an, diem_trung_binh,
  timestamps
}
```

### **UocTinhChiPhi (Cost Estimation)**
```javascript
{
  ma_du_an, chi_phi_nhan_su, chi_phi_ky_thuat,
  chi_phi_rui_ro, tong_chi_phi_du_kien,
  ty_le_loi_nhuan, gia_de_xuat,
  // Metadata
  he_so_deadline, phan_tram_rui_ro, ly_do_rui_ro,
  tong_gio_cong, phan_cong_goi_y,
  // Difficulty assessment
  do_kho: {
    muc_do: 'de|trung_binh|kho|rat_kho',
    diem: 1.0-4.0,
    he_so_do_kho: 1.0|1.3|1.7|2.2,
    chi_tiet: [...]
  }
}
```

### **PhanCongDuAn (Project Assignments)**
```javascript
{
  ma_du_an, ma_nhan_vien, vai_tro_trong_du_an,
  gio_du_kien, gio_thuc_te, ty_le_dong_gop,
  timestamps
}
```

### **ProjectCategory (Project Types)**
```javascript
{
  slug: 'animation_3d|video_quang_cao|...',
  ten_hien_thi, mo_ta, icon, thu_tu, active,
  // Configuration
  base_hours: 30,
  tech_cost_base: 800000,
  required_roles: [
    { vai_tro: 'animator', phan_tram: 70 },
    { vai_tro: 'motion_designer', phan_tram: 20 },
    { vai_tro: 'designer', phan_tram: 10 }
  ]
}
```

---

## 🚀 Cách Chạy Hệ Thống

### **Yêu Cầu Hệ Thống**
- Node.js >= 16.x
- MongoDB >= 4.0
- npm hoặc yarn

### **1. Cài Đặt Backend**

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
# Thêm các biến:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/estipro
# JWT_SECRET=your_secret_key
# CORS_ORIGIN=http://localhost:5173
# NODE_ENV=development

# Chạy seeding (tạo dữ liệu mẫu)
npm run seed

# Khởi động backend
npm run dev
```

### **2. Cài Đặt Frontend**

```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi động dev server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**
Backend API: **http://localhost:5000**

### **Build Production**

```bash
# Backend: Chạy bình thường với NODE_ENV=production
NODE_ENV=production npm start

# Frontend: Build static
npm run build
```

---

## 🔐 Bảo Mật & Authentication

- **JWT Tokens:** Xác thực qua access token trong header Authorization
- **Password Hashing:** bcryptjs (bcrypt)
- **Rate Limiting:** Giới hạn request per IP
- **CORS:** Cấu hình origin được phép
- **Helmet:** Security headers

### **Các Role Chính**
- **admin**: Quản trị viên hệ thống
- **manager**: Quản lý dự án
- **employee**: Nhân viên (xem dự án được phan công)
- **customer**: Khách hàng (xem dự án của mình)

---

## 📈 API Endpoints Chính

### **Projects**
- `POST /api/du-an` - Tạo dự án mới
- `GET /api/du-an` - Danh sách dự án
- `GET /api/du-an/:id` - Chi tiết dự án
- `PUT /api/du-an/:id` - Chỉnh sửa dự án
- `DELETE /api/du-an/:id` - Xóa dự án
- `POST /api/du-an/:id/uc-tinh` - Ước tính chi phí
- `POST /api/du-an/:id/hoan-thanh` - Hoàn thành dự án

### **Employees**
- `GET /api/nhan-vien` - Danh sách nhân viên
- `POST /api/nhan-vien` - Tạo nhân viên
- `PUT /api/nhan-vien/:id` - Cập nhật thông tin

### **Customers**
- `GET /api/khach-hang` - Danh sách khách hàng
- `POST /api/khach-hang` - Thêm khách hàng
- `PUT /api/khach-hang/:id` - Cập nhật khách hàng

### **Categories**
- `GET /api/loai-du-an` - Danh sách loại dự án
- `POST /api/loai-du-an` - Tạo loại dự án mới

### **Authentication**
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Làm mới token

---

## 🎓 Ví Dụ Quy Trình Thực Tế

### **Scenario: Nhận Dự Án Quảng Cáo Video**

**1. Khách Hàng Yêu Cầu:**
- Loại: Video Quảng Cáo 30s
- Độ phân giải: 4K
- Số lần sửa chữa: Tối đa 3 lần
- Deadline: 2 tuần (gấp)
- Khách hàng rating khó tính: 4 điểm

**2. Hệ Thống Phân Tích:**
- Base hours (Video Quảng Cáo): 16 giờ
- Độ khó: Khó (1.7) - vì 4K resolution
- Deadline: Gấp (1.2)
- **Tổng giờ = 16 × 1.7 × 1.2 = 32.64 giờ**

**3. Phan Công Nhân Viên (Tự động đề xuất):**
- Video Editor (50%): 16.32 giờ × 150,000 = 2,448,000 VND
- Motion Designer (25%): 8.16 giờ × 120,000 = 979,200 VND
- Designer (25%): 8.16 giờ × 100,000 = 816,000 VND
- **Chi phí nhân sự = 4,243,200 VND**

**4. Chi Phí Kỹ Thuật:**
- Base: 300,000 VND
- 4K resolution: ×1.4 = 420,000 VND
- **Chi phí kỹ thuật = 420,000 VND**

**5. Tính Rủi Ro:**
- Khách hàng khó tính (4 điểm): +8%
- Deadline gấp: +6%
- Số sửa 3 lần: +5% (borderline)
- **Tổng rủi ro = 19% → Chi phí rủi ro = (4.24M + 0.42M) × 19% = 882,400 VND**

**6. Giá Cuối Cùng:**
- Tổng chi phí: 4.24M + 0.42M + 0.88M = 5.54M VND
- Lợi nhuận (25%): 1.38M VND
- **Giá đề xuất: 6,920,000 VND**

**7. Theo Dõi Hiệu Suất:**
- Sau hoàn thành, khách hàng đánh giá: 5 sao
- Hoàn thành đúng deadline, không sửa (ngoài dự kiến)
- Mỗi nhân viên nhận: 10 × 1.0 = 10 điểm × tỷ lệ đóng góp + Bonus
- Nếu điểm tích lũy ≥ 1000 → Lên cấp độ

---

## 🔧 Debugging & Troubleshooting

### **Backend không kết nối MongoDB**
```bash
# Kiểm tra .env có MONGODB_URI
# Kiểm tra MongoDB service đang chạy
# Logs sẽ hiển thị lỗi chi tiết
```

### **Frontend không call được API**
```bash
# Kiểm tra CORS_ORIGIN trong backend .env
# Kiểm tra baseURL trong frontend axios config
# Xem Network tab trong DevTools
```

### **JWT Token hết hạn**
```bash
# Hệ thống tự động refresh token
# Nếu vẫn lỗi, đăng nhập lại
```

---

## 📝 Ghi Chú Phát Triển

### **Tính Năng Đang Triển Khai**
- [ ] AI Difficulty Assessment (tự động đánh giá độ khó từ mô tả)
- [ ] Machine Learning accuracy tracking (cải thiện dự đoán chi phí)
- [ ] Advanced reporting (export PDF/Excel)
- [ ] Team collaboration features
- [ ] Notification system (email, push)

### **Best Practices**
1. Luôn validate dữ liệu ở backend trước khi lưu
2. Sử dụng JWT refresh token để bảo mật
3. Tách biệt env variables cho dev/prod
4. Seed dữ liệu mẫu khi setup lần đầu
5. Log lại mọi thay đổi quan trọng (audit trail)

---

## 👨‍💼 Support & Liên Hệ

Để báo cáo lỗi hoặc yêu cầu tính năng, vui lòng liên hệ team phát triển.

---

**Version:** 2.0.0  
**Last Updated:** May 2026  
**Author:** Development Team  
**License:** Private - Company Use Only

---

## 📚 Tài Liệu Thêm

### Các Công Thức Chính
- **Estimation Engine**: `backend/src/utils/estimationEngine.js`
- **Difficulty Engine**: `backend/src/utils/difficultyEngine.js`
- **Scoring Engine**: `backend/src/utils/scoringEngine.js`

### Controllers
- **Projects**: `backend/src/controllers/duAn.controller.js`
- **Employees**: `backend/src/controllers/nhanVien.controller.js`
- **Customers**: `backend/src/controllers/khachHang.controller.js`

---

**Cảm ơn bạn sử dụng EstiPro! 🚀**
