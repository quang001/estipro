// Rich mock data for MarketProd Admin Dashboard (Marketing company management)

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  CLIENT: "CLIENT",
};

export const users = [
  { id: "u_sa_1", name: "Vinh Tran", email: "vinh@marketprod.vn", role: ROLES.SUPER_ADMIN, avatar: "VT", company: "MarketProd" },
  { id: "u_m_1", name: "Linh Pham", email: "linh.pm@marketprod.vn", role: ROLES.MANAGER, avatar: "LP", company: "MarketProd" },
  { id: "u_s_1", name: "Minh Khoa", email: "khoa.vfx@marketprod.vn", role: ROLES.STAFF, avatar: "MK", company: "MarketProd", craft: "VFX" },
  { id: "u_s_2", name: "Thu Ha", email: "ha.editor@marketprod.vn", role: ROLES.STAFF, avatar: "TH", company: "MarketProd", craft: "Editor" },
  { id: "u_c_1", name: "Shopee Team", email: "marketing@shopee.vn", role: ROLES.CLIENT, avatar: "SP", company: "Shopee" },
  { id: "u_c_2", name: "Vinamilk Brand", email: "brand@vinamilk.com.vn", role: ROLES.CLIENT, avatar: "VM", company: "Vinamilk" },
];

export const notifications = [
  { id: "n_1", type: "approved", title: "Deal đã chốt", msg: "Honda đã xác nhận ngân sách & timeline cho TVC Q3.", time: "5 phút trước", read: false },
  { id: "n_2", type: "warning", title: "AI Risk Alert", msg: "Dự án Shopee 9.9 có nguy cơ trễ dựng do thiếu Editor.", time: "1 giờ trước", read: false },
  { id: "n_3", type: "penalty", title: "Vượt giờ", msg: "Task 'Compositing Shot 12' vượt 18% giờ dự kiến.", time: "2 giờ trước", read: true },
  { id: "n_4", type: "info", title: "Brief mới", msg: "Vinamilk gửi brief 'TVC Tết 2026' + assets brand guideline.", time: "Hôm qua", read: true },
];

export const clientsList = [
  {
    id: "c_shopee",
    name: "Shopee",
    industry: "E-commerce",
    owner: "Quang (BD)",
    stage: "new",
    expectedBudget: 500,
    lastTouch: "2 giờ trước",
    tags: ["TVC", "Social", "Performance"],
    brief: {
      title: "Chiến dịch 9.9 Mega Sale",
      kpi: "Reach 8M · CTR 2.4% · 3 phiên bản cutdown",
      deadline: "2026-08-20",
      note: "Cần visual speed-ramp + 2D/3D packshot, approve nhanh theo batch.",
      attachments: ["shopee_guideline.pdf", "product_list.xlsx"],
    },
  },
  {
    id: "c_vinamilk",
    name: "Vinamilk",
    industry: "FMCG",
    owner: "Linh (AM)",
    stage: "negotiation",
    expectedBudget: 720,
    lastTouch: "Hôm qua",
    tags: ["TVC", "VFX-heavy", "KOL"],
    brief: {
      title: "TVC Tết 2026 - 'Nhà là sữa ấm'",
      kpi: "Brand Lift +12% · View-through 18% · 15s master + 6s bumper",
      deadline: "2026-12-15",
      note: "Yêu cầu nhiều VFX: particle snow, set extension, grade cinematic.",
      attachments: ["moodboard.zip", "script_v3.docx"],
    },
  },
  {
    id: "c_honda",
    name: "Honda",
    industry: "Automotive",
    owner: "Tuan (BD)",
    stage: "won",
    expectedBudget: 980,
    lastTouch: "3 ngày trước",
    tags: ["Brand Film", "3D", "Sound design"],
    brief: {
      title: "Brand Film Q3 - 'Move Forward'",
      kpi: "Completion rate 22% · 2 phiên bản 30s/15s",
      deadline: "2026-09-10",
      note: "Tập trung motion camera + lighting realistic + high-end finishing.",
      attachments: ["storyboard.pdf", "brandbook.pdf"],
    },
  },
  {
    id: "c_samsung",
    name: "Samsung",
    industry: "Technology",
    owner: "Quang (BD)",
    stage: "negotiation",
    expectedBudget: 1200,
    lastTouch: "Tuần trước",
    tags: ["Event", "LED wall", "Motion"],
    brief: {
      title: "Event Teaser - Galaxy Launch",
      kpi: "Reach 4M · 1 teaser + 1 recap cutdown",
      deadline: "2026-07-22",
      note: "Deadline cực gấp, cần set pipeline review theo ngày.",
      attachments: ["event_agenda.pdf"],
    },
  },
];

export const collaborationRequests = [
  {
    id: "cr_1",
    from: "Shopee",
    title: "Brief: Social burst 9.9",
    message: "Cần 10 video cutdown social, nhịp nhanh, có phiên bản 1:1 và 9:16. KPI: CTR 2.4%.",
    budget: 480,
    due: "2026-08-20",
    channels: ["TikTok", "Facebook", "YouTube"],
    priority: "high",
  },
  {
    id: "cr_2",
    from: "Vinamilk",
    title: "Brief: TVC Tết 2026 (VFX)",
    message: "TVC 15s, cinematic, snow particle + set extension. Cần 2 vòng review, chốt grade cuối.",
    budget: 720,
    due: "2026-12-15",
    channels: ["TV", "YouTube"],
    priority: "high",
  },
  {
    id: "cr_3",
    from: "Honda",
    title: "Brief: Brand film Q3",
    message: "30s master + 15s cut. Tập trung storytelling và camera move. Deadline chốt sound tuần 3.",
    budget: 980,
    due: "2026-09-10",
    channels: ["YouTube", "OOH"],
    priority: "medium",
  },
];

export const leadPipelineStages = [
  { key: "new", label: "Khách mới liên hệ", tone: "blue" },
  { key: "negotiation", label: "Đang đàm phán", tone: "purple" },
  { key: "won", label: "Đã chốt", tone: "green" },
];

export const RISK_COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#10b981"];
export const SKILL_COLORS = { high: "#10b981", medium: "#f59e0b", low: "#ef4444" };

export const riskData = [
  { name: "Trễ deadline", value: 34 },
  { name: "Vượt ngân sách", value: 26 },
  { name: "Thiếu nhân sự", value: 22 },
  { name: "Lỗi kỹ thuật", value: 18 },
];

export const costData = [
  { month: "T1", estimated: 160, actual: 150 },
  { month: "T2", estimated: 220, actual: 210 },
  { month: "T3", estimated: 260, actual: 280 },
  { month: "T4", estimated: 240, actual: 230 },
  { month: "T5", estimated: 310, actual: 325 },
  { month: "T6", estimated: 360, actual: 340 },
  { month: "T7", estimated: 420, actual: 455 },
];

export const promotionData = [
  { name: "Minh Khoa", promoted: 2, demoted: 0 },
  { name: "Thu Ha", promoted: 1, demoted: 1 },
  { name: "Lê Tuấn", promoted: 0, demoted: 2 },
  { name: "Phạm Linh", promoted: 3, demoted: 0 },
  { name: "Đỗ Nam", promoted: 1, demoted: 0 },
];

export const employees = [
  { id: 1, name: "Nguyễn Minh Khoa", role: "VFX Artist", skill: "high", points: 1350, quality: 4.85, tasks: 14, avatar: "MK" },
  { id: 2, name: "Trần Thị Hoa", role: "Motion Designer", skill: "high", points: 1180, quality: 4.65, tasks: 11, avatar: "TH" },
  { id: 3, name: "Lê Văn Tuấn", role: "Editor", skill: "medium", points: 940, quality: 4.2, tasks: 9, avatar: "LT" },
  { id: 4, name: "Phạm Thị Linh", role: "VFX Artist", skill: "medium", points: 820, quality: 4.05, tasks: 10, avatar: "PL" },
  { id: 5, name: "Đỗ Minh Nam", role: "Editor", skill: "low", points: 610, quality: 3.55, tasks: 7, avatar: "DN" },
];

export const financeOverview = {
  currency: "VND",
  revenueYTD: 4200,
  marginTarget: 25,
  softwareMonthly: 210,
  renderFarmMonthly: 340,
  storageMonthly: 65,
  payrollMonthly: 980,
};

export const projects = [
  {
    id: 1,
    name: "Shopee 9.9 - Social Burst",
    clientId: "c_shopee",
    clientName: "Shopee",
    status: "in_progress",
    progress: 46,
    deadline: "2026-08-20",
    budget: 520,
    complexity: "high",
    ownerId: "u_m_1",
    risks: ["Thiếu Editor", "Feedback nhiều vòng"],
    phases: { preprod: 90, production: 55, post: 35, render: 22 },
  },
  {
    id: 2,
    name: "Vinamilk - TVC Tết 2026",
    clientId: "c_vinamilk",
    clientName: "Vinamilk",
    status: "approved",
    progress: 12,
    deadline: "2026-12-15",
    budget: 720,
    complexity: "high",
    ownerId: "u_sa_1",
    risks: ["VFX heavy", "Deadline cứng"],
    phases: { preprod: 65, production: 18, post: 5, render: 0 },
  },
  {
    id: 3,
    name: "Honda - Brand Film Q3",
    clientId: "c_honda",
    clientName: "Honda",
    status: "review",
    progress: 82,
    deadline: "2026-09-10",
    budget: 980,
    complexity: "medium",
    ownerId: "u_m_1",
    risks: ["Approval cuối", "Finishing polish"],
    phases: { preprod: 100, production: 90, post: 84, render: 76 },
  },
  {
    id: 4,
    name: "Samsung - Event Teaser",
    clientId: "c_samsung",
    clientName: "Samsung",
    status: "in_progress",
    progress: 58,
    deadline: "2026-07-22",
    budget: 1200,
    complexity: "high",
    ownerId: "u_sa_1",
    risks: ["Deadline gấp", "Nhiều output ratio"],
    phases: { preprod: 100, production: 68, post: 60, render: 45 },
  },
];

export const initialProjects = projects.map((p) => ({
  id: p.id,
  name: p.name,
  status: p.status,
  progress: p.progress,
  deadline: p.deadline,
  budget: p.budget,
  complexity: p.complexity,
  client: p.clientName,
}));

export const myTasks = [
  {
    id: 101,
    project: "Shopee 9.9 - Social Burst",
    role: "VFX Artist",
    estHours: 42,
    actualHours: 38,
    status: "in_progress",
    feedback: "Shot 03 cần tighten timing + thêm motion blur nhẹ.",
  },
  { id: 102, project: "Honda - Brand Film Q3", role: "Editor", estHours: 28, actualHours: 33, status: "review", feedback: "" },
  { id: 103, project: "Vinamilk - TVC Tết 2026", role: "Motion Designer", estHours: 18, actualHours: 16, status: "pending", feedback: "Chờ assets logo vector final." },
];

export const riskAnalysis = [
  { id: "ra_1", projectId: 1, level: "high", title: "Thiếu nhân lực Editor", hint: "Cần 1 Editor senior + 1 junior hỗ trợ cutdown", score: 82 },
  { id: "ra_2", projectId: 4, level: "medium", title: "Deadline gấp", hint: "Bật daily review, khóa scope, ưu tiên output chính", score: 66 },
  { id: "ra_3", projectId: 2, level: "medium", title: "VFX complex", hint: "Chốt reference look sớm, tách shot list & cache render", score: 61 },
];

