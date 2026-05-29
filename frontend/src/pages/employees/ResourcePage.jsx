import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Award, Briefcase, ClipboardList, Edit2, History, Plus, Search, Star, Trash2, TrendingUp, Users, X } from "lucide-react";
import RoleGate from "../../components/common/RoleGate";
import {
  EMPLOYEE_ROLES,
  SKILL_LEVELS,
  WORK_STATUSES,
  ROLES,
  backendApi,
  formatVnd,
  getErrorMessage,
  mapEmployee,
  mapProject,
  roleLabel,
} from "../../services/api";
import "../../styles/pages/employees/ResourcePage.css";

const SKILL_COLORS = { high: "#10b981", medium: "#f59e0b", low: "#ef4444" };
const LEVEL_COLORS = { junior: "#38bdf8", mid: "#10b981", senior: "#f59e0b", expert: "#8b5cf6" };
const POINTS_TO_LEVEL = 1000;
const ASSIGNMENT_PREVIEW_LIMIT = 10;

const Stars = ({ value }) => (
  <div className="stars">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={12} fill={i <= Math.floor(value) ? "#fbbf24" : "transparent"} color={i <= Math.floor(value) ? "#fbbf24" : "#e2e8f0"} />
    ))}
  </div>
);

function Modal({ title, subtitle, children, footer, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card ${wide ? "resource-modal-wide" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="resource-modal-body">{children}</div>
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

function ScoreHistoryModal({ employee, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      backendApi
        .employeeScoreHistory(employee.id)
        .then((docs) => {
          if (!cancelled) setHistory(Array.isArray(docs) ? docs : []);
        })
        .catch((err) => {
          if (!cancelled) setError(getErrorMessage(err, "Không tải được lịch sử điểm"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employee.id]);

  return (
    <Modal
      title={`Lịch sử điểm - ${employee.name}`}
      subtitle="Các lần cộng/trừ điểm sau khi hoàn thành và đánh giá dự án."
      onClose={onClose}
      wide
      footer={
        <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
          Đóng
        </button>
      }
    >
      {loading ? <div className="resource-empty">Đang tải lịch sử điểm...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="score-history-list">
          {history.length === 0 ? <div className="resource-empty">Chưa có lịch sử điểm.</div> : null}
          {history.map((item) => {
            const point = Number(item.diem_cong || 0);
            return (
              <div key={item._id || `${item.createdAt}-${point}`} className="score-history-row">
                <div className={`score-history-icon ${point >= 0 ? "plus" : "minus"}`}>{point >= 0 ? "+" : "-"}</div>
                <div>
                  <div className="score-history-main">
                    <strong>{item.ma_du_an?.ten_du_an || "Dự án"}</strong>
                    <b className={point >= 0 ? "score-plus" : "score-minus"}>
                      {point >= 0 ? "+" : ""}
                      {point} điểm
                    </b>
                  </div>
                  <p>{item.ly_do || "Không có ghi chú"}</p>
                  {item.cap_do_truoc && item.cap_do_sau && item.cap_do_truoc !== item.cap_do_sau ? (
                    <span className="score-level-change">
                      Cấp độ: {item.cap_do_truoc} → {item.cap_do_sau}
                    </span>
                  ) : null}
                  <small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : ""}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Modal>
  );
}

function EmployeeForm({ employee, levels, onClose, onSaved }) {
  const raw = employee?.raw || {};
  const firstLevel = levels[0]?._id || "";
  const [form, setForm] = useState({
    ho_ten: raw.ho_ten || "",
    email: raw.email || "",
    so_dien_thoai: raw.so_dien_thoai || "",
    ma_cap_do: raw.ma_cap_do?._id || raw.ma_cap_do || firstLevel,
    vai_tro: raw.vai_tro || "designer",
    luong_theo_gio: raw.luong_theo_gio || levels[0]?.luong_mac_dinh_theo_gio || 150000,
    trang_thai_lam_viec: raw.trang_thai_lam_viec || "available",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, luong_theo_gio: Number(form.luong_theo_gio) || 0 };
      if (employee) await backendApi.updateEmployee(employee.id, payload);
      else await backendApi.createEmployee(payload);
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được nhân viên"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={employee ? "Sửa nhân viên" : "Thêm nhân viên"}
      subtitle="Cho phép quản lý thông tin nhân viên, dùng trực tiếp cho phân công và tính chi phí."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary ripple" type="submit" form="employee-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu nhân viên"}
          </button>
        </>
      }
    >
      <form id="employee-form" className="resource-form" onSubmit={submit}>
        <label>
          Họ tên
          <input className="form-input" value={form.ho_ten} onChange={(event) => setField("ho_ten", event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" className="form-input" value={form.email} onChange={(event) => setField("email", event.target.value)} required />
        </label>
        <label>
          Điện thoại
          <input className="form-input" value={form.so_dien_thoai} onChange={(event) => setField("so_dien_thoai", event.target.value)} />
        </label>
        <label>
          Vai trò
          <select className="form-select" value={form.vai_tro} onChange={(event) => setField("vai_tro", event.target.value)}>
            {EMPLOYEE_ROLES.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cấp độ
          <select
            className="form-select"
            value={form.ma_cap_do}
            onChange={(event) => {
              const level = levels.find((item) => item._id === event.target.value);
              setForm((prev) => ({
                ...prev,
                ma_cap_do: event.target.value,
                luong_theo_gio: level?.luong_mac_dinh_theo_gio || prev.luong_theo_gio,
              }));
            }}
            required
          >
            <option value="">Chọn cấp độ</option>
            {levels.map((level) => (
              <option key={level._id} value={level._id}>
                {level.ten_cap_do} - {formatVnd(level.luong_mac_dinh_theo_gio)}/h
              </option>
            ))}
          </select>
        </label>
        <label>
          Lương theo giờ
          <input type="number" min={0} step={5000} className="form-input" value={form.luong_theo_gio} onChange={(event) => setField("luong_theo_gio", event.target.value)} required />
        </label>
        <label>
          Trạng thái
          <select className="form-select" value={form.trang_thai_lam_viec} onChange={(event) => setField("trang_thai_lam_viec", event.target.value)}>
            {WORK_STATUSES.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        {error ? <div className="form-error resource-form-span">{error}</div> : null}
      </form>
    </Modal>
  );
}

function SkillModal({ employee, skills, onClose, onSaved }) {
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ ma_ky_nang: "", muc_do_thanh_thao: "intermediate" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    try {
      setDetail(await backendApi.employee(employee.id));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được kỹ năng nhân viên"));
    }
  }, [employee.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDetail();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);

  const addSkill = async () => {
    if (!form.ma_ky_nang) return;
    setSaving(true);
    setError("");
    try {
      await backendApi.addEmployeeSkill(employee.id, form);
      setForm({ ma_ky_nang: "", muc_do_thanh_thao: "intermediate" });
      await loadDetail();
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Không thêm được kỹ năng"));
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (skillLinkId) => {
    setSaving(true);
    setError("");
    try {
      await backendApi.removeEmployeeSkill(employee.id, skillLinkId);
      await loadDetail();
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được kỹ năng"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Kỹ năng - ${employee.name}`}
      subtitle="Kỹ năng dùng để lọc/gợi ý nhân sự phù hợp khi phân công."
      onClose={onClose}
      footer={<button className="btn btn-primary ripple" type="button" onClick={onClose}>Đóng</button>}
    >
      <div className="skill-list">
        {(detail?.ky_nang || []).length === 0 ? <div className="detail-empty">Nhân viên chưa có kỹ năng.</div> : null}
        {(detail?.ky_nang || []).map((item) => (
          <div key={item._id} className="skill-row">
            <div>
              <strong>{item.ma_ky_nang?.ten_ky_nang || item.ten_ky_nang || item.ten}</strong>
              <span>{SKILL_LEVELS.find((level) => level.key === item.muc_do_thanh_thao)?.label || item.muc_do_thanh_thao}</span>
            </div>
            <button className="btn btn-ghost btn-sm ripple danger-text" type="button" disabled={saving} onClick={() => removeSkill(item._id || item.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="resource-form single-line">
        <label>
          Kỹ năng
          <select className="form-select" value={form.ma_ky_nang} onChange={(event) => setForm((prev) => ({ ...prev, ma_ky_nang: event.target.value }))}>
            <option value="">Chọn kỹ năng</option>
            {skills.map((skill) => (
              <option key={skill._id} value={skill._id}>
                {skill.ten_ky_nang}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mức độ
          <select className="form-select" value={form.muc_do_thanh_thao} onChange={(event) => setForm((prev) => ({ ...prev, muc_do_thanh_thao: event.target.value }))}>
            {SKILL_LEVELS.map((level) => (
              <option key={level.key} value={level.key}>
                {level.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary ripple" type="button" disabled={saving || !form.ma_ky_nang} onClick={addSkill}>
          <Plus size={16} /> Thêm
        </button>
      </div>
      {error ? <div className="form-error">{error}</div> : null}
    </Modal>
  );
}

function urgencyFromDeadline(deadline) {
  const date = deadline ? new Date(deadline) : null;
  if (!date || Number.isNaN(date.getTime())) return "medium";
  const days = Math.ceil((date - new Date()) / 86400000);
  if (days <= 7) return "high";
  if (days <= 21) return "medium";
  return "low";
}

function buildSlots(projects) {
  return projects.flatMap((project) => {
    const assignments = project.raw?.phan_cong || [];
    if (assignments.length > 0) {
      return assignments.map((item) => ({
        id: item._id,
        assignmentId: item._id,
        projectId: project.id,
        project: project.name,
        role: item.vai_tro_trong_du_an || roleLabel(item.vai_tro),
        hours: item.gio_du_kien || project.estimatedHours || 8,
        actualHours: item.gio_thuc_te || 0,
        urgency: urgencyFromDeadline(project.deadline),
        assignedEmployeeId: item.ma_nhan_vien?._id || item.ma_nhan_vien,
        assignedName: item.ho_ten || item.ma_nhan_vien?.ho_ten,
      }));
    }

    const suggestions = project.raw?.uoc_tinh?.phan_cong_goi_y || [];
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return suggestions.map((item, index) => ({
        id: `${project.id}-suggest-${index}`,
        projectId: project.id,
        project: project.name,
        role: roleLabel(item.vai_tro || item.role || item.vai_tro_trong_du_an),
        hours: item.gio_du_kien || item.so_gio || Math.max(1, Math.round((project.estimatedHours || 8) / suggestions.length)),
        urgency: urgencyFromDeadline(project.deadline),
      }));
    }

    return [
      {
        id: `${project.id}-default`,
        projectId: project.id,
        project: project.name,
        role: project.categoryName || "Project role",
        hours: project.estimatedHours || 8,
        urgency: urgencyFromDeadline(project.deadline),
      },
    ];
  });
}

export default function ResourcePage() {
  const { currentUser } = useOutletContext();
  const deny = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.CLIENT;

  const [activeTab, setActiveTab] = useState("assignments");
  const [employees, setEmployees] = useState([]);
  const [levels, setLevels] = useState([]);
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [draggingEmp, setDraggingEmp] = useState(null);
  const [dragSlot, setDragSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSlot, setSavingSlot] = useState(null);
  const [search, setSearch] = useState("");
  const [employeeModal, setEmployeeModal] = useState(null);
  const [skillEmployee, setSkillEmployee] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [scoreEmployee, setScoreEmployee] = useState(null);
  const [showAllAssignmentEmployees, setShowAllAssignmentEmployees] = useState(false);
  const [showAllAssignmentSlots, setShowAllAssignmentSlots] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [employeeDocs, projectDocs, levelDocs, skillDocs] = await Promise.all([
        backendApi.employees(),
        backendApi.projects(),
        backendApi.levels(),
        backendApi.skills(),
      ]);
      const activeDocs = projectDocs.filter((project) => !["completed", "cancelled"].includes(project.trang_thai)).slice(0, 24);
      const detailDocs = await Promise.all(activeDocs.map((project) => backendApi.project(project._id).catch(() => project)));
      const mappedProjects = detailDocs.map(mapProject);
      const nextAssignments = {};
      buildSlots(mappedProjects).forEach((slot) => {
        if (slot.assignedEmployeeId) nextAssignments[slot.id] = slot.assignedEmployeeId;
      });
      setEmployees(employeeDocs.map(mapEmployee));
      setLevels(levelDocs);
      setSkills(skillDocs);
      setProjects(mappedProjects);
      setAssignments(nextAssignments);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu nhân sự"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deny) return undefined;
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deny]);

  const taskSlots = useMemo(() => buildSlots(projects), [projects]);
  const availableEmployees = useMemo(() => employees.filter((emp) => emp.status !== "inactive"), [employees]);
  const visibleAssignmentEmployees = showAllAssignmentEmployees ? availableEmployees : availableEmployees.slice(0, ASSIGNMENT_PREVIEW_LIMIT);
  const visibleTaskSlots = showAllAssignmentSlots ? taskSlots : taskSlots.slice(0, ASSIGNMENT_PREVIEW_LIMIT);
  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.role, employee.level].some((value) => String(value || "").toLowerCase().includes(keyword)),
    );
  }, [employees, search]);
  const rankedEmployees = useMemo(() => [...filteredEmployees].sort((a, b) => (b.points || 0) - (a.points || 0)), [filteredEmployees]);
  const employeeStats = useMemo(() => {
    const total = employees.length;
    const warned = employees.filter((employee) => Number(employee.raw?.so_lan_0_sao || employee.raw?.so_lan_0_sao_lien_tiep || 0) >= 3).length;
    const avgPoints = total ? Math.round(employees.reduce((sum, employee) => sum + Number(employee.points || 0), 0) / total) : 0;
    const upcomingUpgrade = employees.filter((employee) => employee.level !== "expert" && Number(employee.points || 0) >= 800).length;
    return { total, warned, avgPoints, upcomingUpgrade };
  }, [employees]);

  const urgencyLabel = { high: "Gấp", medium: "Bình thường", low: "Thấp" };

  if (deny)
    return (
      <RoleGate
        allow={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}
        title="Chỉ Manager/Admin được phân công nhân sự"
        subtitle="Khu vực này điều phối nguồn lực theo dữ liệu dự án và nhân viên trong backend."
      />
    );

  const handleAssign = async (slot) => {
    if (!draggingEmp) return;
    setSavingSlot(slot.id);
    setError("");
    try {
      const payload = {
        ma_nhan_vien: draggingEmp.id,
        vai_tro_trong_du_an: slot.role,
        gio_du_kien: Number(slot.hours) || 1,
      };

      const saved = slot.assignmentId
        ? await backendApi.updateAssignment(slot.projectId, slot.assignmentId, payload)
        : await backendApi.assignEmployee(slot.projectId, payload);

      setAssignments((prev) => ({ ...prev, [slot.id]: draggingEmp.id }));
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== slot.projectId) return project;
          const phanCong = project.raw?.phan_cong || [];
          const nextPhanCong = slot.assignmentId
            ? phanCong.map((item) => (item._id === slot.assignmentId ? { ...item, ...saved, ma_nhan_vien: draggingEmp.raw, ho_ten: draggingEmp.name } : item))
            : [...phanCong, { ...saved, ma_nhan_vien: draggingEmp.raw, ho_ten: draggingEmp.name }];
          return { ...project, raw: { ...project.raw, phan_cong: nextPhanCong } };
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được phân công"));
    } finally {
      setDraggingEmp(null);
      setDragSlot(null);
      setSavingSlot(null);
    }
  };

  const handleRemove = async (slot) => {
    setSavingSlot(slot.id);
    setError("");
    try {
      if (slot.assignmentId) await backendApi.removeAssignment(slot.projectId, slot.assignmentId);
      setAssignments((prev) => ({ ...prev, [slot.id]: null }));
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== slot.projectId) return project;
          return { ...project, raw: { ...project.raw, phan_cong: (project.raw?.phan_cong || []).filter((item) => item._id !== slot.assignmentId) } };
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được phân công"));
    } finally {
      setSavingSlot(null);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeId) return;
    setError("");
    try {
      await backendApi.deleteEmployee(deleteEmployeeId);
      setDeleteEmployeeId(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được nhân viên"));
    }
  };

  return (
    <div className="page">
      <div className="page-header resource-header">
        <div>
          <h1 className="page-title">Nhân sự & phân công</h1>
          <p className="page-subtitle">Quản lý nhân viên, kỹ năng và kéo thả phân công.</p>
        </div>
        <button className="btn btn-primary ripple" type="button" onClick={() => setEmployeeModal({ mode: "create" })}>
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      <div className="resource-tabs">
        <button type="button" className={`resource-tab ${activeTab === "assignments" ? "active" : ""}`} onClick={() => setActiveTab("assignments")}>
          <ClipboardList size={16} /> Phân công
        </button>
        <button type="button" className={`resource-tab ${activeTab === "employees" ? "active" : ""}`} onClick={() => setActiveTab("employees")}>
          <Users size={16} /> Danh sách nhân viên
        </button>
      </div>

      {loading && <div className="card">Đang tải nhân sự và dự án...</div>}
      {error && <div className="card error-card">{error}</div>}

      {!loading && !error && activeTab === "employees" && (
        <div className="employee-score-section">
          <div className="employee-score-stats">
            <div className="employee-stat-card">
              <Users size={18} />
              <strong>{employeeStats.total}</strong>
              <span>Tổng nhân viên</span>
            </div>
            <div className="employee-stat-card green">
              <TrendingUp size={18} />
              <strong>{employeeStats.avgPoints}</strong>
              <span>Điểm TB hệ thống</span>
            </div>
            <div className="employee-stat-card amber">
              <Award size={18} />
              <strong>{employeeStats.upcomingUpgrade}</strong>
              <span>Sắp lên cấp</span>
            </div>
            <div className="employee-stat-card red">
              <AlertTriangle size={18} />
              <strong>{employeeStats.warned}</strong>
              <span>Cảnh báo 0 sao</span>
            </div>
          </div>

          <div className="card employee-score-card">
            <div className="employee-table-toolbar">
              <div>
                <div className="card-title">Điểm & đánh giá nhân viên</div>
                <div className="card-subtitle">Sắp xếp theo điểm tích lũy, 1000 điểm là mốc lên cấp.</div>
              </div>
              <div className="search-box">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email, vai trò..." />
              </div>
            </div>
            <div className="employee-score-table-wrap">
              <table className="employee-score-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nhân viên</th>
                    <th>Cấp độ</th>
                    <th>Kỹ năng</th>
                    <th>Điểm tích lũy</th>
                    <th>Dự án</th>
                    <th>Điểm TB</th>
                    <th>0 sao</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rankedEmployees.map((employee, index) => {
                    const zeroStars = Number(employee.raw?.so_lan_0_sao || employee.raw?.so_lan_0_sao_lien_tiep || 0);
                    const warning = zeroStars >= 3;
                    const isExpert = employee.level === "expert";
                    const color = LEVEL_COLORS[employee.level] || "#4facfe";
                    const pct = Math.min(100, Math.round((Number(employee.points || 0) / POINTS_TO_LEVEL) * 100));
                    return (
                      <tr key={employee.id} className={warning ? "is-warning" : ""}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td>
                          <div className="emp-header compact">
                            <div className="emp-avatar mini">{employee.avatar}</div>
                            <div>
                              <div className="emp-name">{employee.name}</div>
                              <div className="emp-role">{employee.role}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="level-pill" style={{ "--level-color": color }}>
                            {employee.level}
                          </span>
                        </td>
                        <td>
                          <div className="skill-tags">
                            {(employee.raw?.ky_nang || []).slice(0, 2).map((skill) => (
                              <span key={skill.id || skill._id || skill.ten} className="skill-tag">
                                {skill.ten || skill.ma_ky_nang?.ten_ky_nang || skill.ten_ky_nang}
                              </span>
                            ))}
                            {(employee.raw?.ky_nang?.length || 0) > 2 ? (
                              <button className="skill-more" type="button" onClick={() => setSkillEmployee(employee)}>
                                +{employee.raw.ky_nang.length - 2}
                              </button>
                            ) : null}
                            {(employee.raw?.ky_nang?.length || 0) === 0 ? <span className="muted-cell">—</span> : null}
                          </div>
                        </td>
                        <td className="progress-cell">
                          <div className="score-progress-label">{isExpert ? "Cấp tối đa" : `${employee.points || 0} / ${POINTS_TO_LEVEL} (${pct}%)`}</div>
                          {!isExpert ? (
                            <div className="score-progress-track">
                              <div className="score-progress-fill" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          ) : null}
                        </td>
                        <td>{employee.tasks || employee.raw?.tong_du_an || 0}</td>
                        <td>{employee.raw?.diem_trung_binh || employee.quality ? `${employee.raw?.diem_trung_binh || employee.quality}đ` : "—"}</td>
                        <td>
                          {zeroStars > 0 ? <span className={`zero-star-count ${warning ? "warning" : ""}`}>{warning ? "!" : ""}{zeroStars}</span> : <span className="muted-cell">—</span>}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => setScoreEmployee(employee)} title="Lịch sử điểm">
                              <History size={14} />
                            </button>
                            <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setSkillEmployee(employee)} title="Kỹ năng">
                              <Award size={14} />
                            </button>
                            <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setEmployeeModal({ mode: "edit", employee })} title="Sửa">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => setDeleteEmployeeId(employee.id)} title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rankedEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9}>Không có nhân viên phù hợp.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="employee-table-toolbar legacy-employee-list">
            <div className="search-box">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email, vai trò..." />
            </div>
            <span>{filteredEmployees.length} nhân viên</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Cấp độ</th>
                  <th>Lương/giờ</th>
                  <th>Trạng thái</th>
                  <th>Kỹ năng</th>
                  <th>Điểm</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const status = WORK_STATUSES.find((item) => item.key === employee.status);
                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="emp-header compact">
                          <div className="emp-avatar mini">{employee.avatar}</div>
                          <div>
                            <div className="emp-name">{employee.name}</div>
                            <div className="emp-role">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{employee.role}</td>
                      <td>{employee.level}</td>
                      <td>{formatVnd(employee.hourlyRate)}</td>
                      <td>
                        <span className="status-dot-label" style={{ "--status-color": status?.color || "#94a3b8" }}>
                          {status?.label || employee.status}
                        </span>
                      </td>
                      <td>
                        <div className="skill-tags">
                          {(employee.raw?.ky_nang || []).slice(0, 2).map((skill) => (
                              <span key={skill.id || skill._id || skill.ten} className="skill-tag">
                                {skill.ten || skill.ma_ky_nang?.ten_ky_nang || skill.ten_ky_nang}
                              </span>
                            ))}
                            {(employee.raw?.ky_nang?.length || 0) > 2 ? (
                              <button className="skill-more" type="button" onClick={() => setSkillEmployee(employee)}>
                                +{employee.raw.ky_nang.length - 2}
                              </button>
                            ) : null}
                        </div>
                      </td>
                      <td>{employee.points || 0}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setSkillEmployee(employee)} title="Kỹ năng">
                            <Award size={14} />
                          </button>
                          <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setEmployeeModal({ mode: "edit", employee })} title="Sửa">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => setDeleteEmployeeId(employee.id)} title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={8}>Không có nhân viên phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === "assignments" && (
        <div className="resource-grid">
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users size={16} /> Danh sách nhân viên
            </div>
            {visibleAssignmentEmployees.map((emp) => (
              <div
                key={emp.id}
                className={`employee-card ${draggingEmp?.id === emp.id ? "dragging" : ""}`}
                style={{ borderLeft: `4px solid ${SKILL_COLORS[emp.skill]}` }}
                draggable
                onDragStart={() => setDraggingEmp(emp)}
                onDragEnd={() => setDraggingEmp(null)}
              >
                <div className="emp-header">
                  <div className="emp-avatar">{emp.avatar}</div>
                  <div>
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-role">
                      {emp.role} · {emp.level}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <span className={`badge ${emp.skill}`} style={{ marginBottom: 4 }}>
                      {emp.skill === "high" ? "Senior" : emp.skill === "medium" ? "Mid" : "Junior"}
                    </span>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{formatVnd(emp.hourlyRate)}/h</div>
                  </div>
                </div>
                <Stars value={emp.quality || 0} />
              </div>
            ))}
            {availableEmployees.length > ASSIGNMENT_PREVIEW_LIMIT ? (
              <button className="resource-show-more" type="button" onClick={() => setShowAllAssignmentEmployees((value) => !value)}>
                {showAllAssignmentEmployees ? "Thu gọn" : `Xem thêm ${availableEmployees.length - ASSIGNMENT_PREVIEW_LIMIT} nhân viên`}
              </button>
            ) : null}
          </div>

          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Briefcase size={16} /> Vị trí cần phân công
            </div>
            {taskSlots.length === 0 && <div className="card">Chưa có dự án đang chạy hoặc cần phân công.</div>}
            {visibleTaskSlots.map((slot) => {
              const assignedEmp = assignments[slot.id] ? employees.find((e) => e.id === assignments[slot.id]) : null;
              return (
                <div
                  key={slot.id}
                  className={`task-slot ${dragSlot === slot.id ? "drag-over" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragSlot(slot.id);
                  }}
                  onDragLeave={() => setDragSlot(null)}
                  onDrop={() => handleAssign(slot)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div className="slot-title">{slot.project}</div>
                      <div className="slot-meta">
                        {slot.role} · {slot.hours}h dự kiến
                      </div>
                    </div>
                    <span className={`badge ${slot.urgency === "high" ? "low" : slot.urgency === "medium" ? "medium" : "high"}`}>
                      {urgencyLabel[slot.urgency]}
                    </span>
                  </div>

                  {assignedEmp ? (
                    <div className="assigned-emp">
                      <div className="emp-avatar mini">{assignedEmp.avatar}</div>
                      <span className="assigned-name">{assignedEmp.name}</span>
                      <button className="btn btn-ghost btn-sm ripple remove-btn" onClick={() => handleRemove(slot)} disabled={savingSlot === slot.id} type="button">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="empty-slot-msg">{savingSlot === slot.id ? "Đang lưu..." : "Kéo nhân viên vào đây"}</div>
                  )}
                </div>
              );
            })}
            {taskSlots.length > ASSIGNMENT_PREVIEW_LIMIT ? (
              <button className="resource-show-more" type="button" onClick={() => setShowAllAssignmentSlots((value) => !value)}>
                {showAllAssignmentSlots ? "Thu gọn" : `Xem thêm ${taskSlots.length - ASSIGNMENT_PREVIEW_LIMIT} vị trí`}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {employeeModal ? (
        <EmployeeForm employee={employeeModal.employee} levels={levels} onSaved={loadData} onClose={() => setEmployeeModal(null)} />
      ) : null}

      {skillEmployee ? <SkillModal employee={skillEmployee} skills={skills} onSaved={loadData} onClose={() => setSkillEmployee(null)} /> : null}

      {scoreEmployee ? <ScoreHistoryModal employee={scoreEmployee} onClose={() => setScoreEmployee(null)} /> : null}

      {deleteEmployeeId ? (
        <Modal
          title="Xóa nhân viên"
          subtitle="Thao tác này gọi DELETE /api/nhan-vien/:id và xóa các kỹ năng gắn với nhân viên."
          onClose={() => setDeleteEmployeeId(null)}
          footer={
            <>
              <button className="btn btn-secondary ripple" type="button" onClick={() => setDeleteEmployeeId(null)}>
                Hủy
              </button>
              <button className="btn btn-primary ripple danger-button" type="button" onClick={handleDeleteEmployee}>
                <Trash2 size={16} /> Xóa
              </button>
            </>
          }
        >
          <div className="resource-empty">Bạn chắc chắn muốn xóa nhân viên này?</div>
        </Modal>
      ) : null}
    </div>
  );
}
