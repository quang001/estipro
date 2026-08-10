# EstiPro - Project Cost Estimation & Management System

**EstiPro** là hệ thống quản lý dự án và ước tính chi phí dành cho các công ty làm về thiết kế, video, animation, motion graphics và sản xuất nội dung số.

Hệ thống hỗ trợ quản lý dự án, khách hàng, nhân viên, loại dự án, phân công công việc, tính toán chi phí, đánh giá độ khó và đề xuất giá báo khách hàng một cách tự động.

---

## 🚀 Tính năng chính

* Quản lý dự án theo trạng thái: Draft, Quoted, Approved, In Progress, Review, Completed
* Quản lý khách hàng và mức độ rủi ro của khách hàng
* Quản lý nhân viên theo vai trò, cấp độ và lương theo giờ
* Quản lý loại dự án động bằng database
* Ước tính chi phí dự án tự động
* Tính chi phí nhân sự, chi phí kỹ thuật, buffer rủi ro và lợi nhuận
* Đánh giá độ khó dự án dựa trên yêu cầu kỹ thuật
* Đề xuất phân công nhân viên theo từng loại dự án
* Theo dõi điểm số, hiệu suất và cấp độ nhân viên
* Dashboard thống kê chi phí, lợi nhuận và hiệu suất
* Hỗ trợ AI Estimation để phân tích mô tả dự án và gợi ý độ khó

* Quản lý dự án theo trạng thái: Draft, Quoted, Approved, In Progress, Review, Completed
* Quản lý khách hàng và mức độ rủi ro của khách hàng
* Quản lý nhân viên theo vai trò, cấp độ và lương theo giờ
* Quản lý loại dự án động bằng database
* Ước tính chi phí dự án tự động
* Tính chi phí nhân sự, chi phí kỹ thuật, buffer rủi ro và lợi nhuận
* Đánh giá độ khó dự án dựa trên yêu cầu kỹ thuật
* Đề xuất phân công nhân viên theo từng loại dự án
* Theo dõi điểm số, hiệu suất và cấp độ nhân viên
* Dashboard thống kê chi phí, lợi nhuận và hiệu suất
* Hỗ trợ AI Estimation để phân tích mô tả dự án và gợi ý độ khó

---

## 🧠 Công thức ước tính chi phí

```text
Tổng giờ công = Giờ cơ bản × Hệ số độ khó × Hệ số deadline
```

```text
Chi phí nhân sự = Tổng lương theo giờ của nhân viên × Giờ được phân công
```

```text
Tổng chi phí = Chi phí nhân sự + Chi phí kỹ thuật + Buffer rủi ro
```

```text
Giá đề xuất = Tổng chi phí × (1 + Tỷ lệ lợi nhuận)
```

Ví dụ:

```text
Animation 3D:
Giờ cơ bản: 30 giờ
Độ khó: Rất khó = 2.2
Deadline gấp = 1.2

Tổng giờ = 30 × 2.2 × 1.2 = 79.2 giờ
```

---

## 🏗️ Công nghệ sử dụng

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* BcryptJS
* Dotenv
* CORS
* Helmet
* Morgan

### Frontend

* React
* Vite
* React Router
* Redux Toolkit
* Axios
* Lucide React
* Framer Motion
* Recharts
* CSS Custom

---

## 📁 Cấu trúc thư mục

```text
Admin-Project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

---

## ⚙️ Cài đặt và chạy dự án

### 1. Clone project

```bash
git clone https://github.com/quang001/estipro.git
cd estipro
```

---

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/estipro
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key
```

Chạy backend:

```bash
npm run dev
```

---

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Backend chạy tại:

```text
http://localhost:5000
```

---

## 🔐 Lưu ý bảo mật

Không được push các file chứa secret lên GitHub:

```text
.env
.env.local
backend/.env
frontend/.env
```

Nên thêm vào `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
backend/.env
frontend/.env
```

---

## 📌 Các module chính

### Project Management

Quản lý toàn bộ vòng đời dự án từ lúc tạo mới, báo giá, duyệt dự án, thực hiện, review và hoàn thành.

### Cost Estimation

Tự động tính toán chi phí dựa trên loại dự án, độ khó, deadline, yêu cầu kỹ thuật, nhân sự và rủi ro.

### Difficulty Engine

Đánh giá mức độ khó của dự án theo các yếu tố như animation, VFX, độ phân giải, số lần chỉnh sửa, deadline và mô tả yêu cầu.

### Employee Scoring

Theo dõi điểm tích lũy của nhân viên dựa trên đánh giá dự án, deadline, số lần sửa và mức độ đóng góp.

### AI Estimation

Hỗ trợ AI phân tích mô tả dự án, đánh giá điều kiện kỹ thuật và gợi ý mức độ khó phù hợp.

---

## 📊 API chính

### Auth

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Projects

```text
GET    /api/du-an
POST   /api/du-an
GET    /api/du-an/:id
PUT    /api/du-an/:id
DELETE /api/du-an/:id
POST   /api/du-an/:id/uc-tinh
POST   /api/du-an/:id/hoan-thanh
```

### Employees

```text
GET  /api/nhan-vien
POST /api/nhan-vien
PUT  /api/nhan-vien/:id
```

### Customers

```text
GET  /api/khach-hang
POST /api/khach-hang
PUT  /api/khach-hang/:id
```

### Project Categories

```text
GET  /api/loai-du-an
POST /api/loai-du-an
PUT  /api/loai-du-an/:id
DELETE /api/loai-du-an/:id
```

---

## 📈 Quy trình hoạt động

```text
Tạo dự án
    ↓
Nhập yêu cầu kỹ thuật
    ↓
Hệ thống đánh giá độ khó
    ↓
Tính giờ công dự kiến
    ↓
Tính chi phí nhân sự
    ↓
Tính chi phí kỹ thuật
    ↓
Tính buffer rủi ro
    ↓
Đề xuất giá báo khách hàng
    ↓
Phân công nhân viên
    ↓
Theo dõi tiến độ
    ↓
Hoàn thành và đánh giá
```

---

## 👨‍💻 Tác giả

**Nguyễn Văn Quang**

* GitHub: [quang001](https://github.com/quang001)
* Email: [nguyenvanquang001cntt@gmail.com](mailto:nguyenvanquang001cntt@gmail.com)

---

## 📄 License

This project is for learning and private project development purposes.
