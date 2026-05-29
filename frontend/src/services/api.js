import axios from "axios";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  CLIENT: "CLIENT",
};

export const TOKEN_KEY = "estipro_token";
export const USER_KEY = "estipro_user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error?.config?.url?.includes("/auth/login")) {
      clearStoredSession();
      window.dispatchEvent(new Event("estipro:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = "Không thể kết nối backend") {
  return error?.response?.data?.message || error?.message || fallback;
}

function initials(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function mapBackendRole(role) {
  return {
    admin: ROLES.SUPER_ADMIN,
    manager: ROLES.MANAGER,
    employee: ROLES.STAFF,
  }[role] || ROLES.STAFF;
}

export function normalizeUser(user) {
  if (!user) return null;
  const name = user.ho_ten || user.name || user.username || "User";
  const rawAvatar = user.avatar || "";
  const avatarUrl = rawAvatar.startsWith("/uploads/") || /^https?:\/\//i.test(rawAvatar) ? rawAvatar : "";
  return {
    id: user._id || user.id,
    username: user.username,
    name,
    email: user.email || "",
    role: user.role || mapBackendRole(user.vai_tro),
    backendRole: user.vai_tro || user.backendRole,
    avatar: avatarUrl ? initials(name) : rawAvatar || initials(name),
    avatarUrl,
    company: user.company || "EstiPro",
    phone: user.phone || "",
    department: user.department || "",
    location: user.location || "",
    timezone: user.timezone || "GMT+7",
    bio: user.bio || "",
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    raw: user,
  };
}

export function assetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

export function toISODate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function formatDate(value) {
  if (!value) return "Chưa chốt";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("vi-VN");
  } catch {
    return String(value);
  }
}

export function formatVnd(value, compact = true) {
  const amount = Number(value) || 0;
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1_000) return `₫${Math.round(amount / 1_000)}K`;
  }
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export const PROJECT_STATUSES = [
  { key: "draft", label: "Nháp", color: "#64748b" },
  { key: "quoted", label: "Đã báo giá", color: "#0ea5e9" },
  { key: "approved", label: "Đã duyệt", color: "#10b981" },
  { key: "in_progress", label: "Đang làm", color: "#4facfe" },
  { key: "review", label: "Review", color: "#8b5cf6" },
  { key: "completed", label: "Hoàn thành", color: "#059669" },
  { key: "cancelled", label: "Đã hủy", color: "#ef4444" },
];

export const STATUS_LABELS = Object.fromEntries(PROJECT_STATUSES.map((item) => [item.key, item.label]));

export const EMPLOYEE_ROLES = [
  { key: "designer", label: "Designer" },
  { key: "video_editor", label: "Video Editor" },
  { key: "animator", label: "Animator" },
  { key: "motion_designer", label: "Motion Designer" },
  { key: "voice_actor", label: "Voice Actor" },
  { key: "project_manager", label: "Project Manager" },
  { key: "vfx_artist", label: "VFX Artist" },
  { key: "photographer", label: "Photographer" },
];

export const WORK_STATUSES = [
  { key: "available", label: "Sẵn sàng", color: "#10b981" },
  { key: "busy", label: "Đang bận", color: "#f59e0b" },
  { key: "on_leave", label: "Nghỉ phép", color: "#0ea5e9" },
  { key: "inactive", label: "Ngừng hoạt động", color: "#94a3b8" },
];

export const SKILL_LEVELS = [
  { key: "beginner", label: "Mới học" },
  { key: "intermediate", label: "Trung bình" },
  { key: "advanced", label: "Thành thạo" },
  { key: "expert", label: "Chuyên gia" },
];

export const EMPLOYEE_LEVELS = ["junior", "mid", "senior", "expert"];

const STATUS_PROGRESS = {
  draft: 8,
  quoted: 18,
  approved: 32,
  in_progress: 62,
  review: 86,
  completed: 100,
  cancelled: 0,
};

export function difficultyToLevel(value) {
  return {
    de: "low",
    trung_binh: "medium",
    kho: "high",
    rat_kho: "high",
  }[value] || "medium";
}

export function roleLabel(value) {
  return {
    designer: "Designer",
    video_editor: "Video Editor",
    animator: "Animator",
    motion_designer: "Motion Designer",
    voice_actor: "Voice Actor",
    project_manager: "Project Manager",
    vfx_artist: "VFX Artist",
    photographer: "Photographer",
  }[value] || value || "Nhân sự";
}

export function mapProject(doc) {
  const estimate = doc?.uoc_tinh || {};
  const difficulty = estimate?.do_kho?.muc_do || estimate?.do_kho?.muc_do_tong_the;
  const progress = STATUS_PROGRESS[doc?.trang_thai] ?? 0;
  const category = doc?.loai_du_an;
  const client = doc?.ma_khach_hang;

  return {
    id: doc?._id,
    name: doc?.ten_du_an || "Dự án chưa đặt tên",
    client: client?.ten_cong_ty || "Chưa có khách hàng",
    clientId: client?._id || doc?.ma_khach_hang,
    categoryId: category?._id || category,
    categoryName: category?.ten_hien_thi || category?.slug || "Chưa phân loại",
    status: doc?.trang_thai || "draft",
    statusLabel: STATUS_LABELS[doc?.trang_thai] || doc?.trang_thai || "Nháp",
    progress,
    deadline: toISODate(doc?.deadline),
    deadlineLabel: formatDate(doc?.deadline),
    budget: estimate?.gia_de_xuat || estimate?.tong_chi_phi_du_kien || 0,
    cost: estimate?.tong_chi_phi_du_kien || 0,
    complexity: difficultyToLevel(difficulty),
    difficulty,
    risk: estimate?.phan_tram_rui_ro ?? 0,
    riskReason: estimate?.ly_do_rui_ro || "",
    estimatedHours: estimate?.tong_gio_cong || 0,
    phases: {
      preprod: Math.min(100, progress + 18),
      production: progress,
      post: Math.max(0, progress - 18),
      render: Math.max(0, progress - 36),
    },
    raw: doc,
  };
}

export function mapEmployee(doc) {
  const level = doc?.cap_do_ten || doc?.ma_cap_do?.ten_cap_do || "junior";
  const score = Number(doc?.diem_tich_luy || 0);
  const quality = doc?.diem_tb ?? doc?.diem_trung_binh ?? 0;
  const skill = level === "expert" || level === "senior" || score >= 1000 ? "high" : level === "mid" || score >= 500 ? "medium" : "low";

  return {
    id: doc?._id,
    name: doc?.ho_ten || "Nhân viên",
    email: doc?.email || "",
    role: roleLabel(doc?.vai_tro),
    rawRole: doc?.vai_tro,
    level,
    status: doc?.trang_thai_lam_viec || doc?.trang_thai || "available",
    hourlyRate: doc?.luong_theo_gio || 0,
    skill,
    points: score,
    quality: quality || 0,
    tasks: doc?.tong_du_an ?? doc?.so_du_an ?? 0,
    avatar: initials(doc?.ho_ten),
    skills: doc?.ky_nang || [],
    raw: doc,
  };
}

export function mapCustomer(doc, projects = []) {
  const customerProjects = projects.filter((project) => project.clientId === doc?._id);
  const activeProjects = customerProjects.filter((project) => !["completed", "cancelled"].includes(project.status));
  const latestProject = customerProjects[0] || null;
  const hasWon = customerProjects.some((project) => ["approved", "in_progress", "review", "completed"].includes(project.status));
  const hasQuote = customerProjects.some((project) => ["quoted", "draft"].includes(project.status));

  return {
    id: doc?._id,
    name: doc?.ten_cong_ty || "Khách hàng",
    industry: doc?.dia_chi || "Chưa phân nhóm",
    owner: doc?.nguoi_lien_he || "Chưa có liên hệ",
    email: doc?.email || "",
    phone: doc?.so_dien_thoai || "",
    stage: hasWon ? "won" : hasQuote ? "negotiation" : "new",
    expectedBudget: customerProjects.reduce((sum, project) => sum + (project.budget || 0), 0),
    lastTouch: latestProject?.deadlineLabel || "Chưa có dự án",
    tags: [...new Set(customerProjects.map((project) => project.categoryName).filter(Boolean))].slice(0, 3),
    projects: customerProjects,
    activeProjects,
    latestProject,
    difficultyScore: doc?.diem_do_kho || 3,
    note: doc?.ghi_chu || "",
    raw: doc,
  };
}

export const authApi = {
  async login(username, password) {
    const { data } = await api.post("/auth/login", { username, password });
    const user = normalizeUser(data.user);
    setStoredSession(data.token, user);
    return { token: data.token, user };
  },
  async me() {
    const { data } = await api.get("/auth/me");
    const user = normalizeUser(data);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  async updateProfile(payload) {
    const { data } = await api.put("/auth/profile", payload);
    const user = normalizeUser(data);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  async uploadAvatar(file) {
    const { data } = await api.post("/auth/avatar", file, {
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name || "avatar"),
      },
      transformRequest: [(body) => body],
    });
    const user = normalizeUser(data);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  async changePassword(current_password, new_password) {
    const { data } = await api.put("/auth/change-password", { current_password, new_password });
    return data;
  },
};

export const backendApi = {
  dashboard: () => api.get("/bao-cao/dashboard").then((res) => res.data),
  revenue: () => api.get("/bao-cao/doanh-thu").then((res) => res.data),
  performance: () => api.get("/bao-cao/hieu-suat").then((res) => res.data),
  aiInsights: () => api.get("/bao-cao/ai-insights").then((res) => res.data),

  projects: (params) => api.get("/du-an", { params }).then((res) => res.data),
  project: (id) => api.get(`/du-an/${id}`).then((res) => res.data),
  createProject: (payload) => api.post("/du-an", payload).then((res) => res.data),
  updateProject: (id, payload) => api.put(`/du-an/${id}`, payload).then((res) => res.data),
  deleteProject: (id) => api.delete(`/du-an/${id}`).then((res) => res.data),
  updateProjectStatus: (id, trang_thai) => api.patch(`/du-an/${id}/trang-thai`, { trang_thai }).then((res) => res.data),
  estimateProject: (id, ty_le_loi_nhuan = 25) => api.post(`/du-an/${id}/uoc-tinh`, { ty_le_loi_nhuan }).then((res) => res.data),
  suggestAssignments: (id) => api.get(`/du-an/${id}/goi-y-phan-cong`).then((res) => res.data),
  assignEmployee: (projectId, payload) => api.post(`/du-an/${projectId}/phan-cong`, payload).then((res) => res.data),
  updateAssignment: (projectId, assignmentId, payload) => api.put(`/du-an/${projectId}/phan-cong/${assignmentId}`, payload).then((res) => res.data),
  removeAssignment: (projectId, assignmentId) => api.delete(`/du-an/${projectId}/phan-cong/${assignmentId}`).then((res) => res.data),
  updateTechnicalCost: (id, payload) => api.put(`/du-an/${id}/chi-phi-ky-thuat`, payload).then((res) => res.data),
  sendQuote: (id) => api.post(`/du-an/${id}/gui-bao-gia`).then((res) => res.data),
  customerApproveProject: (id) => api.post(`/du-an/${id}/khach-duyet`).then((res) => res.data),
  startProject: (id) => api.post(`/du-an/${id}/bat-dau`).then((res) => res.data),
  moveProjectToReview: (id) => api.post(`/du-an/${id}/chuyen-review`).then((res) => res.data),
  completeProject: (id, payload) => api.post(`/du-an/${id}/hoan-thanh`, payload).then((res) => res.data),
  cancelProject: (id) => api.post(`/du-an/${id}/huy`).then((res) => res.data),
  scoreProject: (id, payload) => api.post(`/du-an/${id}/tinh-diem`, payload).then((res) => res.data),
  projectScoreHistory: (id) => api.get(`/du-an/${id}/lich-su-diem`).then((res) => res.data),

  customers: (params) => api.get("/khach-hang", { params }).then((res) => res.data),
  customer: (id) => api.get(`/khach-hang/${id}`).then((res) => res.data),
  createCustomer: (payload) => api.post("/khach-hang", payload).then((res) => res.data),
  updateCustomer: (id, payload) => api.put(`/khach-hang/${id}`, payload).then((res) => res.data),
  deleteCustomer: (id) => api.delete(`/khach-hang/${id}`).then((res) => res.data),

  employees: (params) => api.get("/nhan-vien", { params }).then((res) => res.data),
  employee: (id) => api.get(`/nhan-vien/${id}`).then((res) => res.data),
  createEmployee: (payload) => api.post("/nhan-vien", payload).then((res) => res.data),
  updateEmployee: (id, payload) => api.put(`/nhan-vien/${id}`, payload).then((res) => res.data),
  deleteEmployee: (id) => api.delete(`/nhan-vien/${id}`).then((res) => res.data),
  addEmployeeSkill: (id, payload) => api.post(`/nhan-vien/${id}/ky-nang`, payload).then((res) => res.data),
  removeEmployeeSkill: (id, skillLinkId) => api.delete(`/nhan-vien/${id}/ky-nang/${skillLinkId}`).then((res) => res.data),
  employeeScoreHistory: (id) => api.get(`/nhan-vien/${id}/lich-su-diem`).then((res) => res.data),

  skills: () => api.get("/ky-nang").then((res) => res.data),
  createSkill: (payload) => api.post("/ky-nang", payload).then((res) => res.data),
  deleteSkill: (id) => api.delete(`/ky-nang/${id}`).then((res) => res.data),

  levels: () => api.get("/cap-do").then((res) => res.data),
  createLevel: (payload) => api.post("/cap-do", payload).then((res) => res.data),
  updateLevel: (id, payload) => api.put(`/cap-do/${id}`, payload).then((res) => res.data),

  categories: () => api.get("/loai-du-an").then((res) => res.data),
  allCategories: () => api.get("/loai-du-an/all").then((res) => res.data),
  createCategory: (payload) => api.post("/loai-du-an", payload).then((res) => res.data),
  updateCategory: (id, payload) => api.put(`/loai-du-an/${id}`, payload).then((res) => res.data),
  toggleCategory: (id) => api.patch(`/loai-du-an/${id}/toggle`).then((res) => res.data),
  deleteCategory: (id) => api.delete(`/loai-du-an/${id}`).then((res) => res.data),
  requirementForm: (categoryId) => api.get(`/project-requirements/render/${categoryId}`).then((res) => res.data),
  evaluateRequirements: (payload) => api.post("/project-requirements/evaluate", payload).then((res) => res.data),
  requirementCategoriesSummary: () => api.get("/project-requirements/all-categories").then((res) => res.data),
  requirementsByCategory: (categoryId) => api.get(`/project-requirements/${categoryId}`).then((res) => res.data),
  createRequirement: (payload) => api.post("/project-requirements", payload).then((res) => res.data),
  updateRequirement: (id, payload) => api.put(`/project-requirements/${id}`, payload).then((res) => res.data),
  deleteRequirement: (id) => api.delete(`/project-requirements/${id}`).then((res) => res.data),
  toggleRequirement: (id) => api.patch(`/project-requirements/${id}/toggle`).then((res) => res.data),
  sortRequirement: (id, thu_tu) => api.patch(`/project-requirements/${id}/sort`, { thu_tu }).then((res) => res.data),
};

export default api;
