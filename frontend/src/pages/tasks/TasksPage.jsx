import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle, Clock, Edit2, MessageSquare, Play, Send } from "lucide-react";
import { ROLES, backendApi, getErrorMessage, mapProject, roleLabel } from "../../services/api";
import "../../styles/pages/tasks/TasksPage.css";

const taskStatusLabels = {
  pending: "Chờ xử lý",
  in_progress: "Đang làm",
  review: "Chờ review",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};
const TASK_PREVIEW_LIMIT = 10;

function projectStatusToTaskStatus(status) {
  if (["draft", "quoted", "approved"].includes(status)) return "pending";
  if (status === "in_progress") return "in_progress";
  if (status === "review") return "review";
  if (status === "completed") return "done";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function nextProjectStatus(taskStatus) {
  return {
    pending: "in_progress",
    in_progress: "review",
    review: "completed",
  }[taskStatus];
}

function buildTasks(projects, currentUser) {
  const taskMap = new Map();

  projects.forEach((project) => {
    (project.raw?.phan_cong || []).forEach((assignment) => {
      const employee = assignment.ma_nhan_vien || {};
      const role = assignment.vai_tro_trong_du_an || roleLabel(employee.vai_tro);
      const employeeKey = employee._id || assignment.ma_nhan_vien || assignment.ho_ten || employee.email || "";
      const taskKey = `${project.id || project.raw?._id}:${employeeKey}:${role}`.toLowerCase();
      const task = {
        id: assignment._id,
        projectId: project.id,
        project: project.name,
        role,
        estHours: assignment.gio_du_kien || project.estimatedHours || 1,
        actualHours: assignment.gio_thuc_te || 0,
        status: projectStatusToTaskStatus(project.status),
        feedback: project.riskReason || project.raw?.mo_ta || "",
        employeeEmail: employee.email,
        employeeName: assignment.ho_ten || employee.ho_ten,
        updatedAt: assignment.updatedAt || assignment.createdAt || project.raw?.updatedAt || project.raw?.createdAt || "",
      };
      const existing = taskMap.get(taskKey);
      if (!existing || new Date(task.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        taskMap.set(taskKey, task);
      }
    });
  });

  const allTasks = Array.from(taskMap.values());

  if (currentUser?.role !== ROLES.STAFF) return allTasks;
  const personal = allTasks.filter((task) => task.employeeEmail && task.employeeEmail.toLowerCase() === currentUser.email?.toLowerCase());
  return personal.length > 0 ? personal : allTasks;
}

export default function TasksPage() {
  const { currentUser } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const projectDocs = await backendApi.projects();
      const detailDocs = await Promise.all(projectDocs.slice(0, 40).map((project) => backendApi.project(project._id).catch(() => project)));
      setProjects(detailDocs.map(mapProject));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được công việc"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const tasks = useMemo(() => buildTasks(projects, currentUser), [currentUser, projects]);
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, TASK_PREVIEW_LIMIT);

  const updateHours = async (task, value) => {
    const newVal = parseInt(value, 10) || 0;
    setSavingId(task.id);
    setError("");
    try {
      await backendApi.updateAssignment(task.projectId, task.id, { gio_thuc_te: newVal });
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== task.projectId) return project;
          return {
            ...project,
            raw: {
              ...project.raw,
              phan_cong: (project.raw?.phan_cong || []).map((assignment) => (assignment._id === task.id ? { ...assignment, gio_thuc_te: newVal } : assignment)),
            },
          };
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được giờ thực tế"));
    } finally {
      setEditId(null);
      setSavingId(null);
    }
  };

  const advanceTask = async (task) => {
    const nextStatus = nextProjectStatus(task.status);
    if (!nextStatus) return;
    setSavingId(task.id);
    setError("");
    try {
      const updated = await backendApi.updateProjectStatus(task.projectId, nextStatus);
      setProjects((prev) =>
        prev.map((project) => (project.id === task.projectId ? { ...project, ...mapProject({ ...updated, uoc_tinh: project.raw?.uoc_tinh, phan_cong: project.raw?.phan_cong }) } : project)),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được trạng thái công việc"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Công việc của tôi</h1>
        <p className="page-subtitle">
          {currentUser?.name || "Nhân sự"} · {currentUser?.backendRole || currentUser?.role || "STAFF"} · {tasks.length} nhiệm vụ từ phân công backend
        </p>
      </div>

      {loading && <div className="card">Đang tải phân công dự án...</div>}
      {error && <div className="card error-card">{error}</div>}
      {!loading && tasks.length === 0 && <div className="card">Chưa có phân công nào trong backend.</div>}

      {visibleTasks.map((task, i) => (
        <div key={task.id} className="task-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="task-card-header">
            <div>
              <div className="task-name">{task.project}</div>
              <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "4px 8px", borderRadius: 6 }}>
                {task.role} · {task.employeeName || "Chưa rõ nhân sự"}
              </span>
            </div>
            <span className={`badge ${task.status}`}>{taskStatusLabels[task.status]}</span>
          </div>

          <div className="hours-compare">
            <Clock size={14} />
            <span>
              Giờ ước tính: <span className="hours-val">{task.estHours}h</span>
            </span>
            <span style={{ color: "#e2e8f0", margin: "0 8px" }}>|</span>
            <span>
              Thực tế:
              <span className={`hours-val ${task.actualHours > task.estHours ? "over" : ""}`} style={{ marginLeft: 6 }}>
                {editId === task.id ? (
                  <input
                    type="number"
                    defaultValue={task.actualHours}
                    className="hours-input"
                    onBlur={(event) => updateHours(task, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    autoFocus
                  />
                ) : (
                  `${task.actualHours}h`
                )}
              </span>
            </span>
          </div>

          {task.actualHours > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (task.actualHours / task.estHours) * 100)}%`,
                    background:
                      task.actualHours > task.estHours ? "linear-gradient(90deg, #f97316, #ef4444)" : "linear-gradient(90deg, #4facfe, #00f2fe)",
                  }}
                />
              </div>
            </div>
          )}

          {task.feedback && (
            <div className="feedback-box">
              <span className="feedback-title">
                <MessageSquare size={12} /> Ghi chú dự án:{" "}
              </span>
              <span className="feedback-content">{task.feedback}</span>
            </div>
          )}

          <div className="task-card-actions">
            {!["done", "cancelled"].includes(task.status) && (
              <button className="btn btn-primary btn-sm ripple" onClick={() => advanceTask(task)} disabled={savingId === task.id} type="button">
                {task.status === "pending" ? (
                  <>
                    <Play size={14} /> Bắt đầu
                  </>
                ) : task.status === "in_progress" ? (
                  <>
                    <Send size={14} /> Gửi review
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Hoàn thành
                  </>
                )}
              </button>
            )}
            <button className="btn btn-secondary btn-sm ripple" onClick={() => setEditId(editId === task.id ? null : task.id)} disabled={savingId === task.id} type="button">
              <Edit2 size={14} /> {savingId === task.id ? "Đang lưu" : "Cập nhật giờ thực tế"}
            </button>
          </div>
        </div>
      ))}
      {!loading && tasks.length > TASK_PREVIEW_LIMIT ? (
        <button className="task-show-more" type="button" onClick={() => setShowAllTasks((value) => !value)}>
          {showAllTasks ? "Thu gọn" : `Xem thêm ${tasks.length - TASK_PREVIEW_LIMIT} công việc`}
        </button>
      ) : null}
    </div>
  );
}
