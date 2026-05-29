import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { Bot, Calculator, Eye, GripVertical, Plus, Upload, X } from "lucide-react";
import RoleGate from "../../components/common/RoleGate";
import AiEstimationModal from "../../components/projects/AiEstimationModal";
import {
  PROJECT_STATUSES,
  ROLES,
  backendApi,
  formatVnd,
  getErrorMessage,
  mapProject,
  STATUS_LABELS,
} from "../../services/api";
import "../../styles/pages/projects/ProjectsPage.css";

const createInitialForm = () => ({
  name: "",
  customerId: "",
  categoryId: "",
  deadline: "",
  status: "draft",
  urgency: "binh_thuong",
  description: "",
});

const complexityLabels = {
  low: "Dễ",
  medium: "Trung bình",
  high: "Khó",
};

function WaveLoader() {
  return (
    <div className="wave-loader" aria-label="Đang ước tính bằng backend">
      {[0, 1, 2, 3, 4].map((item) => (
        <span key={item} style={{ animationDelay: `${item * 0.12}s` }} />
      ))}
    </div>
  );
}

function requirementDefault(field) {
  if (field.default_value !== null && field.default_value !== undefined) return field.default_value;
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") return [];
  if (field.type === "number") return "";
  return "";
}

export default function ProjectsPage() {
  const { currentUser } = useOutletContext();
  const deny = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.CLIENT;

  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [draggedProject, setDraggedProject] = useState(null);
  const [dropZone, setDropZone] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [projectForm, setProjectForm] = useState(createInitialForm());
  const [requirementFields, setRequirementFields] = useState([]);
  const [requirementValues, setRequirementValues] = useState({});
  const [requirementLoading, setRequirementLoading] = useState(false);

  const [costLoading, setCostLoading] = useState(false);
  const [costModal, setCostModal] = useState({
    open: false,
    project: null,
    loading: false,
    result: null,
    error: "",
  });
  const [briefOcrLoading, setBriefOcrLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [aiModal, setAiModal] = useState({
    open: false,
    mode: "project",
    projectId: null,
    loading: false,
    saving: false,
    proposal: null,
    error: "",
  });
  const [actionError, setActionError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectDocs, customerDocs, categoryDocs] = await Promise.all([backendApi.projects(), backendApi.customers(), backendApi.categories()]);
      const mappedProjects = projectDocs.map(mapProject);
      setProjects(mappedProjects);
      setCustomers(customerDocs);
      setCategories(categoryDocs);
      setSelectedProjectId((current) => current || mappedProjects[0]?.id || null);
      setProjectForm((current) => ({
        ...current,
        customerId: current.customerId || customerDocs[0]?._id || "",
        categoryId: current.categoryId || categoryDocs[0]?._id || "",
      }));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu dự án"));
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

  useEffect(() => {
    if (!actionSuccess) return undefined;
    const timer = window.setTimeout(() => setActionSuccess(""), 2600);
    return () => window.clearTimeout(timer);
  }, [actionSuccess]);

  useEffect(() => {
    if (!projectForm.categoryId || !createOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setRequirementLoading(true);
      backendApi
        .requirementForm(projectForm.categoryId)
        .then(({ fields }) => {
          if (cancelled) return;
          setRequirementFields(fields || []);
          setRequirementValues((current) => {
            const next = { ...current };
            (fields || []).forEach((field) => {
              if (next[field.field_key] === undefined) next[field.field_key] = requirementDefault(field);
            });
            return next;
          });
        })
        .catch(() => {
          if (!cancelled) {
            setRequirementFields([]);
            setRequirementValues({});
          }
        })
        .finally(() => {
          if (!cancelled) setRequirementLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [createOpen, projectForm.categoryId]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) || projects[0], [projects, selectedProjectId]);

  if (deny)
    return (
      <RoleGate
        allow={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}
        title="Chỉ Manager/Admin được quản lý dự án"
        subtitle="Tài khoản Staff chỉ xem phần công việc được giao và dashboard cá nhân."
      />
    );

  const handleDrop = async (status) => {
    if (!draggedProject) return;
    const previous = projects;
    setProjects((prev) => prev.map((project) => (project.id === draggedProject ? { ...project, status, statusLabel: STATUS_LABELS[status] } : project)));
    setDraggedProject(null);
    setDropZone(null);
    setActionError("");

    try {
      const updated = await backendApi.updateProjectStatus(draggedProject, status);
      setProjects((prev) => prev.map((project) => (project.id === draggedProject ? mapProject({ ...updated, uoc_tinh: project.raw?.uoc_tinh }) : project)));
    } catch (err) {
      setProjects(previous);
      setActionError(getErrorMessage(err, "Không cập nhật được trạng thái dự án"));
    }
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!projectForm.name.trim() || !projectForm.customerId || !projectForm.categoryId || !projectForm.deadline) return;

    setActionError("");
    try {
      const created = await backendApi.createProject({
        ten_du_an: projectForm.name.trim(),
        ma_khach_hang: projectForm.customerId,
        loai_du_an: projectForm.categoryId,
        mo_ta: projectForm.description.trim(),
        deadline: projectForm.deadline,
        trang_thai: projectForm.status,
        yeu_cau: {
          ...requirementValues,
          muc_do_gap: projectForm.urgency,
          ghi_chu: projectForm.description.trim(),
        },
      });

      const mapped = mapProject(created);
      setProjects((prev) => [mapped, ...prev]);
      setSelectedProjectId(mapped.id);
      setProjectForm(createInitialForm());
      setRequirementFields([]);
      setRequirementValues({});
      setCreateOpen(false);
    } catch (err) {
      setActionError(getErrorMessage(err, "Không tạo được dự án"));
    }
  };

  const handleRecalculateCost = async () => {
    const source = selectedProject || projects[0];
    if (!source) return;
    setCostModal({
      open: true,
      project: source,
      loading: false,
      result: null,
      error: "",
    });
  };

  const confirmRecalculateCost = async () => {
    const source = costModal.project || selectedProject || projects[0];
    if (!source) return;
    setCostLoading(true);
    setCostModal((current) => ({ ...current, loading: true, error: "", result: null }));
    setActionError("");
    setActionSuccess("");

    try {
      const result = await backendApi.estimateProject(source.id);
      const refreshed = await backendApi.project(source.id);
      setProjects((prev) => prev.map((project) => (project.id === source.id ? mapProject(refreshed) : project)));
      setCostModal((current) => ({
        ...current,
        loading: false,
        result: { projectName: source.name, ...result },
      }));
    } catch (err) {
      setCostModal((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "Khong chay duoc tinh lai chi phi"),
      }));
    } finally {
      setCostLoading(false);
    }
  };

  const handleAiEstimate = async () => {
    const source = selectedProject || projects[0];
    if (!source) return;
    setAiModal({
      open: true,
      mode: "project",
      projectId: source.id,
      loading: true,
      saving: false,
      proposal: null,
      error: "",
    });
    setActionError("");
    setActionSuccess("");

    try {
      const proposal = await backendApi.analyzeProjectAi(source.id);
      setAiModal((current) => ({ ...current, loading: false, proposal }));
    } catch (err) {
      setAiModal((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "Khong phan tich duoc bang AI"),
      }));
    }
  };

  const applyAiProposalToCreateForm = ({ project = {}, conditions = [] }) => {
    const nextRequirementValues = {};
    conditions.forEach((condition) => {
      if (!condition.is_new && condition.field_key) {
        nextRequirementValues[condition.field_key] = condition.value;
      }
    });

    nextRequirementValues.ai_reviewed_conditions = conditions.map((condition, index) => ({
      field_key: condition.field_key || "",
      label: condition.label || condition.field_key || `Dieu kien ${index + 1}`,
      value: condition.value ?? "",
      is_new: Boolean(condition.is_new || !condition.field_key),
      difficulty_score: Number(condition.difficulty_score) || 2,
      difficulty_level: condition.difficulty_level || "trung_binh",
      difficulty_effective_score: Math.min(Number(condition.difficulty_score) || 2, 4),
      reason: condition.reason || "",
    }));
    nextRequirementValues.ai_confirmed_at = new Date().toISOString();

    setProjectForm((current) => ({
      ...current,
      name: project.ten_du_an || current.name,
      categoryId: project.ma_loai_du_an || current.categoryId,
      deadline: project.deadline ? String(project.deadline).slice(0, 10) : current.deadline,
      urgency: project.muc_do_gap || current.urgency,
      description: project.mo_ta || current.description,
    }));
    setRequirementValues((current) => ({
      ...current,
      ...nextRequirementValues,
      muc_do_gap: project.muc_do_gap || current.muc_do_gap || "binh_thuong",
    }));
    setActionSuccess("Da ap dung ket qua AI vao form tao du an");
  };

  const handleAiConfirm = async (payload) => {
    if (aiModal.mode === "create") {
      applyAiProposalToCreateForm(payload);
      setAiModal((current) => ({ ...current, open: false, saving: false }));
      return;
    }

    if (!aiModal.projectId) return;
    setAiModal((current) => ({ ...current, saving: true, error: "" }));
    try {
      const updated = await backendApi.confirmProjectAi(aiModal.projectId, payload);
      const mapped = mapProject(updated);
      setProjects((prev) => prev.map((project) => (project.id === mapped.id ? mapped : project)));
      setSelectedProjectId(mapped.id);
      setAiModal((current) => ({ ...current, open: false, saving: false }));
      setActionSuccess("Da xac nhan AI va tinh lai chi phi");
    } catch (err) {
      setAiModal((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, "Khong luu duoc ket qua AI"),
      }));
    }
  };

  const handleBriefImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBriefOcrLoading(true);
    setActionError("");
    setActionSuccess("");
    setAiModal({
      open: true,
      mode: "create",
      projectId: null,
      loading: true,
      saving: false,
      proposal: null,
      error: "",
    });

    try {
      const proposal = await backendApi.analyzeBriefImage(file);
      setAiModal((current) => ({ ...current, loading: false, proposal }));
    } catch (err) {
      setAiModal((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "Khong doc duoc file brief"),
      }));
    } finally {
      setBriefOcrLoading(false);
    }
  };

  const setRequirementValue = (key, value) => {
    setRequirementValues((current) => ({ ...current, [key]: value }));
  };

  const renderRequirementField = (field) => {
    const value = requirementValues[field.field_key] ?? requirementDefault(field);
    const commonLabel = (
      <>
        {field.label}
        {field.required ? <span style={{ color: "#ef4444" }}> *</span> : null}
        {field.hint ? <span className="field-hint">{field.hint}</span> : null}
      </>
    );

    if (field.type === "textarea") {
      return (
        <label key={field.field_key}>
          {commonLabel}
          <textarea className="form-textarea" rows={3} value={value} onChange={(event) => setRequirementValue(field.field_key, event.target.value)} />
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label key={field.field_key}>
          {commonLabel}
          <select className="form-select" value={value} onChange={(event) => setRequirementValue(field.field_key, event.target.value)}>
            <option value="">Chọn giá trị</option>
            {(field.options || []).map((option) => (
              <option key={String(option.value)} value={option.value}>
                {option.label || option.value}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "multiselect") {
      const selected = Array.isArray(value) ? value : [];
      return (
        <label key={field.field_key}>
          {commonLabel}
          <div className="requirement-check-grid">
            {(field.options || []).map((option) => (
              <button
                key={String(option.value)}
                type="button"
                className={`requirement-chip ${selected.includes(option.value) ? "active" : ""}`}
                onClick={() => {
                  const next = selected.includes(option.value) ? selected.filter((item) => item !== option.value) : [...selected, option.value];
                  setRequirementValue(field.field_key, next);
                }}
              >
                {option.label || option.value}
              </button>
            ))}
          </div>
        </label>
      );
    }

    if (field.type === "boolean") {
      return (
        <label key={field.field_key}>
          {commonLabel}
          <select className="form-select" value={String(Boolean(value))} onChange={(event) => setRequirementValue(field.field_key, event.target.value === "true")}>
            <option value="false">Không</option>
            <option value="true">Có</option>
          </select>
        </label>
      );
    }

    return (
      <label key={field.field_key}>
        {commonLabel}
        <input
          type={field.type === "number" ? "number" : "text"}
          min={field.min_value ?? undefined}
          max={field.max_value ?? undefined}
          className="form-input"
          value={value}
          onChange={(event) => setRequirementValue(field.field_key, field.type === "number" ? Number(event.target.value) : event.target.value)}
        />
      </label>
    );
  };

  return (
    <div className="page">
      <div className="page-header projects-header">
        <div>
          <h1 className="page-title">Quản lý dự án</h1>
          <p className="page-subtitle">Dữ liệu lấy từ dự án, khách hàng, loại dự án và form yêu cầu động theo loại dự án.</p>
        </div>
        <div className="projects-actions">
          <button className="btn btn-secondary ripple" onClick={handleRecalculateCost} disabled={!projects.length || costLoading} type="button">
            <Calculator size={16} /> {costLoading ? "Dang tinh" : "Tinh lai chi phi"}
          </button>
          <button className="btn btn-secondary ripple" onClick={handleAiEstimate} disabled={!projects.length} type="button">
            <Bot size={16} /> Uoc tinh bang AI
          </button>
          <button className="btn btn-primary ripple" onClick={() => setCreateOpen(true)} type="button">
            <Plus size={16} /> Tạo dự án
          </button>
        </div>
      </div>

      {loading && <div className="card">Đang tải dữ liệu dự án từ backend...</div>}
      {error && <div className="card error-card">{error}</div>}
      {actionError && <div className="card error-card">{actionError}</div>}
      {actionSuccess && <div className="card success-card">{actionSuccess}</div>}

      {!loading && !error && (
        <div className="kanban-board">
          {PROJECT_STATUSES.map((col) => (
            <div
              key={col.key}
              className={`kanban-col ${dropZone === col.key ? "drop-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDropZone(col.key);
              }}
              onDragLeave={() => setDropZone(null)}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="kanban-col-header">
                <div className="kanban-col-title" style={{ color: col.color }}>
                  {col.label}
                </div>
                <span className="kanban-col-count">{projects.filter((project) => project.status === col.key).length}</span>
              </div>
              {projects
                .filter((p) => p.status === col.key)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`project-card ${draggedProject === p.id ? "dragging" : ""} ${selectedProjectId === p.id ? "selected" : ""}`}
                    draggable
                    onClick={() => setSelectedProjectId(p.id)}
                    onDragStart={() => {
                      setDraggedProject(p.id);
                      setSelectedProjectId(p.id);
                    }}
                    onDragEnd={() => {
                      setDraggedProject(null);
                      setDropZone(null);
                    }}
                  >
                    <div className="project-card-top">
                      <div>
                        <div className="project-card-title">{p.name}</div>
                        <div className="project-card-meta">
                          {p.client} · {p.categoryName}
                        </div>
                      </div>
                      <div className="project-drag-handle">
                        <GripVertical size={14} />
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="project-card-footer">
                      <span className={`badge ${p.complexity}`}>{complexityLabels[p.complexity]}</span>
                      <span className="project-card-meta">Deadline: {p.deadlineLabel}</span>
                      <strong className="project-budget">{formatVnd(p.budget)}</strong>
                    </div>
                    <div className="project-card-extra">
                      <span>{p.estimatedHours || 0}h</span>
                      <span>Risk {p.risk || 0}%</span>
                    </div>
                    <div className="project-card-actions">
                      <Link className="btn btn-secondary btn-sm ripple" to={`/projects/${p.id}`} onClick={(event) => event.stopPropagation()}>
                        <Eye size={14} /> Chi tiết
                      </Link>
                    </div>
                  </div>
                ))}
              {projects.filter((project) => project.status === col.key).length === 0 && <div className="drop-zone-empty">Thả dự án vào cột này</div>}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal-card project-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Tạo dự án mới</h2>
                <p>Thông tin gửi thẳng tới dự án, sau đó dự án tự chạy ước tính chi phí.</p>
              </div>
              <button className="project-modal-close ripple" onClick={() => setCreateOpen(false)} type="button" aria-label="Đóng form tạo dự án">
                <X size={18} />
              </button>
            </div>

            <form className="project-form" onSubmit={handleCreateProject}>
              <label>
                Tên dự án
                <input
                  className="form-input"
                  value={projectForm.name}
                  onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ví dụ: TVC Q2 - Brand Launch"
                  required
                />
              </label>

              <div className="project-form-row">
                <label>
                  Khách hàng
                  <select
                    className="form-select"
                    value={projectForm.customerId}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, customerId: event.target.value }))}
                    required
                  >
                    <option value="">Chọn khách hàng</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.ten_cong_ty}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Loại dự án
                  <select
                    className="form-select"
                    value={projectForm.categoryId}
                    onChange={(event) => {
                      setProjectForm((prev) => ({ ...prev, categoryId: event.target.value }));
                      setRequirementValues({});
                    }}
                    required
                  >
                    <option value="">Chọn loại</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.icon ? `${category.icon} ` : ""}{category.ten_hien_thi}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="project-form-row">
                <label>
                  Deadline
                  <input
                    type="date"
                    className="form-input"
                    value={projectForm.deadline}
                    onChange={(event) => setProjectForm((prev) => ({ ...prev, deadline: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Trạng thái
                  <select className="form-select" value={projectForm.status} onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value }))}>
                    {PROJECT_STATUSES.filter((status) => !["completed", "cancelled"].includes(status.key)).map((status) => (
                      <option key={status.key} value={status.key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Mức độ gấp
                <select className="form-select" value={projectForm.urgency} onChange={(event) => setProjectForm((prev) => ({ ...prev, urgency: event.target.value }))}>
                  <option value="binh_thuong">Bình thường</option>
                  <option value="gap">Gấp</option>
                  <option value="sieu_gap">Siêu gấp</option>
                </select>
              </label>

              <label>
                Mô tả / brief
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Scope, KPI, yêu cầu chính..."
                />
              </label>

              <label className="brief-upload-box">
                <Upload size={16} />
                <span>Upload anh/PDF brief</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={handleBriefImageUpload} />
              </label>
              {briefOcrLoading ? <div className="project-form-note">Dang doc brief bang AI... <WaveLoader /></div> : null}

              {requirementLoading && <div className="project-form-note">Đang tải form yêu cầu theo loại dự án...</div>}
              {!requirementLoading && requirementFields.length > 0 && (
                <div className="requirement-panel">
                  <div className="requirement-title">Yêu cầu chi tiết</div>
                  <div className="requirement-grid">{requirementFields.map(renderRequirementField)}</div>
                </div>
              )}

              {actionError && <div className="form-error">{actionError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary ripple" onClick={() => setCreateOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary ripple">
                  <Plus size={16} /> Tạo dự án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {costModal.open ? (
        <div className="modal-backdrop" onClick={() => setCostModal((current) => ({ ...current, open: false }))}>
          <div className="modal-card cost-estimate-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  <Calculator size={18} /> Tinh lai chi phi
                </h2>
                <p>{costModal.project?.name || selectedProject?.name || "Du an"}</p>
              </div>
              <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => setCostModal((current) => ({ ...current, open: false }))}>
                <X size={18} />
              </button>
            </div>

            {costModal.loading ? (
              <div className="ai-loading-card">
                <Calculator size={20} />
                <div>
                  <div className="ai-loading-title">Dang tinh lai chi phi...</div>
                  <div className="ai-loading-subtitle">Chi dung dieu kien he thong hien co, khong cong dieu kien AI moi</div>
                </div>
                <WaveLoader />
              </div>
            ) : costModal.error ? (
              <div className="form-error">{costModal.error}</div>
            ) : costModal.result ? (
              <>
                <div className="ai-summary">
                  <div className="ai-summary-item">
                    <span>Du an</span>
                    <strong>{costModal.result.projectName}</strong>
                  </div>
                  <div className="ai-summary-item">
                    <span>Gia de xuat</span>
                    <strong>{formatVnd(costModal.result.gia_de_xuat || 0)}</strong>
                  </div>
                  <div className="ai-summary-item">
                    <span>Gio uoc tinh</span>
                    <strong>{costModal.result.tong_gio_cong ?? 0}h</strong>
                  </div>
                  <div className="ai-summary-item">
                    <span>Chi phi du kien</span>
                    <strong>{formatVnd(costModal.result.tong_chi_phi_du_kien || 0)}</strong>
                  </div>
                  <div className="ai-summary-item">
                    <span>Rui ro</span>
                    <strong>{costModal.result.phan_tram_rui_ro ?? 0}%</strong>
                  </div>
                  <div className="ai-summary-item">
                    <span>Do kho</span>
                    <strong>{costModal.result.do_kho?.muc_do_tong_the || costModal.result.do_kho?.muc_do || "Chua danh gia"}</strong>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary ripple" type="button" onClick={confirmRecalculateCost} disabled={costLoading}>
                    Chay lai
                  </button>
                  <button className="btn btn-primary ripple" type="button" onClick={() => setCostModal((current) => ({ ...current, open: false }))}>
                    Dong
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cost-confirm-box">
                  <strong>Xac nhan tinh lai bang thuat toan noi bo?</strong>
                  <span>He thong se tinh theo cac dieu kien cau hinh san co cua loai du an. Cac dieu kien moi do AI phat hien se khong duoc cong vao lan tinh nay.</span>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary ripple" type="button" onClick={() => setCostModal((current) => ({ ...current, open: false }))}>
                    Huy
                  </button>
                  <button className="btn btn-primary ripple" type="button" onClick={confirmRecalculateCost} disabled={costLoading}>
                    <Calculator size={16} /> Tinh lai
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {aiModal.open ? (
        <AiEstimationModal
          title={aiModal.mode === "create" ? "Doc brief bang AI" : "Uoc tinh bang AI"}
          proposal={aiModal.proposal}
          categories={categories}
          loading={aiModal.loading}
          saving={aiModal.saving}
          error={aiModal.error}
          onClose={() => setAiModal((current) => ({ ...current, open: false }))}
          onRetry={aiModal.mode === "project" ? handleAiEstimate : undefined}
          onConfirm={handleAiConfirm}
          confirmLabel={aiModal.mode === "create" ? "Ap dung vao form" : "Xac nhan va tinh gia"}
          allowProjectFields
        />
      ) : null}
    </div>
  );
}
