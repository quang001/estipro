import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bot,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Clock,
  DollarSign,
  Edit2,
  Play,
  RefreshCw,
  Send,
  Star,
  ThumbsUp,
  TrendingUp,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  PROJECT_STATUSES,
  backendApi,
  formatDate,
  formatVnd,
  getErrorMessage,
  mapEmployee,
  roleLabel,
  STATUS_LABELS,
} from "../../services/api";
import AiEstimationModal from "../../components/projects/AiEstimationModal";
import "../../styles/pages/projects/ProjectDetailPage.css";

const WORKFLOW = PROJECT_STATUSES.filter((item) => !["cancelled"].includes(item.key));

const DIFFICULTY_CONFIG = {
  de: { label: "Dễ", color: "#16a34a", bg: "rgba(34, 197, 94, 0.12)" },
  trung_binh: { label: "Trung bình", color: "#d97706", bg: "rgba(245, 158, 11, 0.14)" },
  kho: { label: "Khó", color: "#ea580c", bg: "rgba(249, 115, 22, 0.14)" },
  rat_kho: { label: "Rất khó", color: "#dc2626", bg: "rgba(239, 68, 68, 0.14)" },
};

const RATING_PCT = { 0: 0, 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8, 5: 1 };
const RATING_LABELS = {
  0: "0 sao (Thất bại)",
  1: "1 sao",
  2: "2 sao",
  3: "3 sao",
  4: "4 sao",
  5: "5 sao",
};

function numberInput(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === true) return "Có";
  if (value === false) return "Không";
  return String(value ?? "");
}

function Modal({ title, subtitle, children, footer, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card ${wide ? "detail-modal-wide" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="detail-modal-body">{children}</div>
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="detail-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskBreakdown({ estimate }) {
  const [open, setOpen] = useState(false);
  if (!estimate) return null;

  const details = Array.isArray(estimate.chi_tiet_rui_ro) ? estimate.chi_tiet_rui_ro : [];
  const fallbackReasons = estimate.ly_do_rui_ro
    ? String(estimate.ly_do_rui_ro)
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="risk-breakdown">
      <button className="risk-breakdown-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span>
          <AlertTriangle size={13} />
          Rủi ro ({estimate.phan_tram_rui_ro || 0}%)
        </span>
        <strong>
          {formatVnd(estimate.chi_phi_rui_ro || 0, false)}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </strong>
      </button>
      {open ? (
        <div className="risk-breakdown-panel">
          <div className="risk-breakdown-head">
            <span>Nguồn rủi ro</span>
            <span>%</span>
          </div>
          {details.length > 0
            ? details.map((item, index) => (
                <div key={`${item.ten || "risk"}-${index}`} className="risk-breakdown-row">
                  <span>{item.ten || item.label || "Rủi ro"}</span>
                  <strong>+{item.phan_tram || 0}%</strong>
                </div>
              ))
            : fallbackReasons.map((reason, index) => (
                <div key={`${reason}-${index}`} className="risk-breakdown-row">
                  <span>{reason}</span>
                  <strong>{index === 0 ? `${estimate.phan_tram_rui_ro || 0}%` : ""}</strong>
                </div>
              ))}
          {!details.length && !fallbackReasons.length ? (
            <div className="risk-breakdown-row">
              <span>Không có ghi chú rủi ro chi tiết.</span>
              <strong>{estimate.phan_tram_rui_ro || 0}%</strong>
            </div>
          ) : null}
          <div className="risk-breakdown-total">
            <span>Tổng rủi ro</span>
            <strong>{estimate.phan_tram_rui_ro || 0}% = {formatVnd(estimate.chi_phi_rui_ro || 0, false)}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DifficultyChip({ difficulty }) {
  const [open, setOpen] = useState(false);
  if (!difficulty) return null;

  const key = difficulty.muc_do || difficulty.muc_do_tong_the || "trung_binh";
  const config = DIFFICULTY_CONFIG[key] || DIFFICULTY_CONFIG.trung_binh;
  const details = Array.isArray(difficulty.chi_tiet) ? difficulty.chi_tiet : [];

  return (
    <div className="difficulty-wrap">
      <button
        className="difficulty-chip"
        type="button"
        style={{ "--difficulty-color": config.color, "--difficulty-bg": config.bg }}
        onClick={() => details.length && setOpen((value) => !value)}
      >
        Độ khó: {config.label} {difficulty.he_so_do_kho ? `(x${difficulty.he_so_do_kho})` : ""}
        {details.length ? (open ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null}
      </button>
      {open && details.length ? (
        <div className="difficulty-popover">
          <div className="difficulty-popover-title">Chi tiết độ khó</div>
          {details.map((item, index) => {
            const itemKey = item.muc_do || "trung_binh";
            const itemConfig = DIFFICULTY_CONFIG[itemKey] || DIFFICULTY_CONFIG.trung_binh;
            return (
              <div key={`${item.field_key || item.label || "difficulty"}-${index}`} className="difficulty-detail-row">
                <div>
                  <strong>{item.label || item.field_key || "Yêu cầu"}</strong>
                  <span>Giá trị: {displayValue(item.gia_tri)}</span>
                </div>
                <em style={{ color: itemConfig.color, background: itemConfig.bg }}>
                  {itemConfig.label} ({item.diem_do_kho || item.diem || 0}đ)
                </em>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function CostBreakdown({ estimate, profit, setProfit, onEstimate, onAiEstimate, busy, disabled }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profit);

  const confirmProfit = async () => {
    const value = numberInput(draft);
    if (value < 0 || value > 200) return;
    setProfit(value);
    await onEstimate(value);
    setEditing(false);
  };

  const profitAmount = (estimate.gia_de_xuat || 0) - (estimate.tong_chi_phi_du_kien || 0);

  return (
    <div className="card detail-cost-card">
      <div className="detail-card-head">
        <div>
          <div className="card-title"><CircleDollarSign size={16} /> Ước tính chi phí</div>
          <div className="card-subtitle">Backend tính theo yêu cầu động, chi phí kỹ thuật, rủi ro và phân công thực tế.</div>
        </div>
        <div className="cost-card-actions">
          <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => onEstimate()} disabled={busy === "estimate" || disabled}>
            <RefreshCw size={14} /> Tính lại
          </button>
          <button className="btn btn-secondary btn-sm ripple" type="button" onClick={onAiEstimate} disabled={busy === "ai-estimation" || disabled}>
            <Bot size={14} /> Ước tính bằng AI
          </button>
        </div>
      </div>

      <div className="cost-breakdown-grid">
        <div className="cost-tile">
          <span><Users size={13} /> Nhân sự</span>
          <strong>{formatVnd(estimate.chi_phi_nhan_su || 0, false)}</strong>
          <small>{estimate.tong_gio_cong || 0} giờ</small>
        </div>
        <div className="cost-tile">
          <span><Calculator size={13} /> Kỹ thuật</span>
          <strong>{formatVnd(estimate.chi_phi_ky_thuat || 0, false)}</strong>
        </div>
        <div className="cost-tile">
          <span><Clock size={13} /> Hệ số deadline</span>
          <strong>x{estimate.he_so_deadline || 1}</strong>
        </div>
        <div className="cost-tile cost-tile-risk">
          <RiskBreakdown estimate={estimate} />
        </div>
      </div>

      <div className="cost-total-row">
        <span>Tổng chi phí dự kiến</span>
        <strong>{formatVnd(estimate.tong_chi_phi_du_kien || 0, false)}</strong>
      </div>

      <div className="profit-editor">
        <span><TrendingUp size={14} /> Tỉ lệ lợi nhuận</span>
        {editing ? (
          <div className="profit-edit-controls">
            <label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={200}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirmProfit();
                  if (event.key === "Escape") {
                    setDraft(profit);
                    setEditing(false);
                  }
                }}
                autoFocus
              />
              <small>%</small>
            </label>
            <button className="btn btn-primary btn-sm ripple" type="button" onClick={confirmProfit} disabled={busy === "estimate"}>
              <Check size={14} />
            </button>
            <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => { setDraft(profit); setEditing(false); }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <strong>
            {profit}%
            {!disabled ? (
              <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => { setDraft(profit); setEditing(true); }} aria-label="Sửa tỉ lệ lợi nhuận">
                <Edit2 size={13} />
              </button>
            ) : null}
          </strong>
        )}
      </div>

      <div className="price-box enhanced">
        <span>
          Giá đề xuất
          <small>Lợi nhuận: {profit}% {profitAmount > 0 ? `(+${formatVnd(profitAmount, false)})` : ""}</small>
        </span>
        <strong>{formatVnd(estimate.gia_de_xuat || 0, false)}</strong>
      </div>

      <div className="difficulty-row">
        <DifficultyChip difficulty={estimate.do_kho} />
        {estimate.tong_gio_cong ? <span>{estimate.tong_gio_cong} giờ tổng công</span> : null}
      </div>
    </div>
  );
}

function statusAction(status) {
  return {
    draft: { label: "Gửi báo giá", icon: Send, fn: backendApi.sendQuote },
    quoted: { label: "Khách duyệt", icon: ThumbsUp, fn: backendApi.customerApproveProject },
    approved: { label: "Bắt đầu", icon: Play, fn: backendApi.startProject },
    in_progress: { label: "Chuyển review", icon: CheckCircle2, fn: backendApi.moveProjectToReview },
  }[status];
}

function RequirementList({ values }) {
  const reviewedConditions = Array.isArray(values?.ai_reviewed_conditions) ? values.ai_reviewed_conditions : [];
  const hiddenKeys = new Set(["ai_reviewed_conditions", "ai_confirmed_at"]);
  const entries = Object.entries(values || {}).filter(([key, value]) => !hiddenKeys.has(key) && value !== false && value !== "" && value !== null && value !== undefined);
  if (!entries.length && !reviewedConditions.length) return <div className="detail-empty">Dự án chưa có yêu cầu chi tiết.</div>;
  return (
    <div className="detail-requirements">
      {entries.map(([key, value]) => (
        <div key={key} className="detail-req-item">
          <span>{key.replaceAll("_", " ")}</span>
          <strong>{Array.isArray(value) ? value.join(", ") : value === true ? "Có" : String(value)}</strong>
        </div>
      ))}
      {reviewedConditions.map((item, index) => (
        <div key={`${item.field_key || item.label || "ai"}-${index}`} className="detail-req-item ai-reviewed">
          <span>{item.label || item.field_key || "AI condition"}</span>
          <strong>{displayValue(item.value)} · {item.difficulty_score || item.difficulty_effective_score || 0}đ</strong>
        </div>
      ))}
    </div>
  );
}

function AssignmentModal({ project, employees, suggestions, onClose, onSaved }) {
  const firstSuggestion = suggestions?.[0] || {};
  const [form, setForm] = useState({
    ma_nhan_vien: firstSuggestion.ma_nhan_vien || employees[0]?.id || "",
    vai_tro_trong_du_an: firstSuggestion.vai_tro_trong_du_an || roleLabel(firstSuggestion.vai_tro) || "",
    gio_du_kien: firstSuggestion.gio_du_kien || 8,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedEmployee = employees.find((employee) => employee.id === form.ma_nhan_vien);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.ma_nhan_vien || !form.vai_tro_trong_du_an) return;
    setSaving(true);
    setError("");
    try {
      await backendApi.assignEmployee(project._id, {
        ...form,
        gio_du_kien: numberInput(form.gio_du_kien),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được phân công"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Phân công nhân sự"
      subtitle="Chọn người, vai trò trong dự án và giờ dự kiến. Hệ thống sẽ tính lại chi phí sau khi lưu."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary ripple" type="submit" form="assignment-form" disabled={saving}>
            <UserPlus size={16} /> {saving ? "Đang lưu" : "Lưu phân công"}
          </button>
        </>
      }
    >
      {suggestions?.length > 0 && (
        <div className="suggestion-strip">
          <label>
          Gợi ý từ hệ thống
        </label>
          {suggestions.map((item) => (
            <button
              key={`${item.ma_nhan_vien}_${item.vai_tro}_${item.gio_du_kien}`}
              type="button"
              className="suggestion-chip"
              onClick={() =>
                setForm({
                  ma_nhan_vien: item.ma_nhan_vien,
                  vai_tro_trong_du_an: item.vai_tro_trong_du_an || roleLabel(item.vai_tro),
                  gio_du_kien: item.gio_du_kien || 8,
                })
              }
            >
              <strong>{item.ho_ten}</strong>
              <span>{roleLabel(item.vai_tro)} · {item.gio_du_kien || 0}h</span>
            </button>
          ))}
        </div>
      )}
      <form id="assignment-form" className="detail-form" onSubmit={submit}>
        <label>
          Nhân viên
          <select className="form-select" value={form.ma_nhan_vien} onChange={(event) => setForm((prev) => ({ ...prev, ma_nhan_vien: event.target.value }))} required>
            <option value="">Chọn nhân viên</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.role} - {formatVnd(employee.hourlyRate)}/h
              </option>
            ))}
          </select>
        </label>
        {selectedEmployee ? (
          <div className="assignment-selected-info">
            <span>Lương: <strong>{formatVnd(selectedEmployee.hourlyRate)}/giờ</strong></span>
            {selectedEmployee.status !== "available" ? <em>Đang bận</em> : <em className="ok">Sẵn sàng</em>}
          </div>
        ) : null}
        <label>
          Vai trò trong dự án
          <input
            className="form-input"
            value={form.vai_tro_trong_du_an}
            onChange={(event) => setForm((prev) => ({ ...prev, vai_tro_trong_du_an: event.target.value }))}
            required
          />
        </label>
        <label>
          Giờ dự kiến
          <input
            type="number"
            min={1}
            className="form-input"
            value={form.gio_du_kien}
            onChange={(event) => setForm((prev) => ({ ...prev, gio_du_kien: event.target.value }))}
            required
          />
        </label>
        {selectedEmployee && numberInput(form.gio_du_kien) > 0 ? (
          <div className="assignment-cost-preview">
            Chi phí dự kiến: <strong>{formatVnd(selectedEmployee.hourlyRate * numberInput(form.gio_du_kien))}</strong>
          </div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
      </form>
    </Modal>
  );
}

function TechnicalCostModal({ project, onClose, onSaved }) {
  const current = project?.chi_phi_ky_thuat || {};
  const [form, setForm] = useState({
    chi_phi_phan_mem: current.chi_phi_phan_mem || 0,
    chi_phi_render: current.chi_phi_render || 0,
    chi_phi_luu_tru: current.chi_phi_luu_tru || 0,
    chi_phi_tai_nguyen: current.chi_phi_tai_nguyen || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await backendApi.updateTechnicalCost(project._id, {
        chi_phi_phan_mem: numberInput(form.chi_phi_phan_mem),
        chi_phi_render: numberInput(form.chi_phi_render),
        chi_phi_luu_tru: numberInput(form.chi_phi_luu_tru),
        chi_phi_tai_nguyen: numberInput(form.chi_phi_tai_nguyen),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được chi phí kỹ thuật"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Chi phí kỹ thuật"
      subtitle="Các khoản này được hệ thống cộng vào ước tính chi phí dự án."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary ripple" type="submit" form="technical-cost-form" disabled={saving}>
            <Calculator size={16} /> {saving ? "Đang lưu" : "Lưu chi phí"}
          </button>
        </>
      }
    >
      <form id="technical-cost-form" className="detail-form detail-form-grid" onSubmit={submit}>
        {[
          ["chi_phi_phan_mem", "Phần mềm"],
          ["chi_phi_render", "Render"],
          ["chi_phi_luu_tru", "Lưu trữ"],
          ["chi_phi_tai_nguyen", "Tài nguyên"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={0}
              step={10000}
              className="form-input"
              value={form[key]}
              onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
            />
          </label>
        ))}
        {error ? <div className="form-error detail-form-span">{error}</div> : null}
      </form>
    </Modal>
  );
}

function getCompletionScorePreview(form, employeeCount) {
  const stars = numberInput(form.so_sao);
  const projectScore = 10 * (RATING_PCT[stars] ?? 0);
  const bonus = (numberInput(form.so_ngay_tre_deadline) === 0 ? 2 : 0) + (numberInput(form.so_lan_sua_thuc_te) === 0 ? 3 : 0);
  const penalty = (numberInput(form.so_ngay_tre_deadline) > 0 ? 2 : 0) + (numberInput(form.so_lan_sua_thuc_te) >= 3 ? 3 : 0);
  const perEmployee = employeeCount > 0 ? Math.max(0, projectScore / employeeCount + bonus - penalty) : 0;

  return { projectScore, bonus, penalty, perEmployee };
}

function CompleteModal({ project, onClose, onSaved }) {
  const estimate = project?.uoc_tinh || {};
  const assignments = project?.phan_cong || [];
  const evenShare = assignments.length ? Number((1 / assignments.length).toFixed(4)) : 1;
  const [form, setForm] = useState({
    tong_chi_phi_thuc_te: estimate.tong_chi_phi_du_kien || 0,
    gia_ban_thuc_te: estimate.gia_de_xuat || 0,
    so_lan_sua_thuc_te: 0,
    so_ngay_tre_deadline: 0,
    so_sao: 5,
    dung_chia_deu: true,
    ty_le_dong_gop: assignments.map((assignment) => ({
      ma_nhan_vien: assignment.ma_nhan_vien?._id || assignment.ma_nhan_vien,
      ho_ten: assignment.ho_ten || assignment.ma_nhan_vien?.ho_ten,
      ty_le: evenShare,
    })),
    danh_gia: assignments.map((assignment) => ({
      ma_nhan_vien: assignment.ma_nhan_vien?._id || assignment.ma_nhan_vien,
      ho_ten: assignment.ho_ten || assignment.ma_nhan_vien?.ho_ten,
      diem_chat_luong: 8,
      so_ngay_tre: 0,
      so_lan_sua: 0,
      nhan_xet_quan_ly: "",
    })),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalRatio = form.ty_le_dong_gop.reduce((sum, item) => sum + Number(item.ty_le || 0), 0);
  const ratioInvalid = form.ty_le_dong_gop.length > 0 && Math.abs(totalRatio - 1) > 0.01;
  const actualProfit = numberInput(form.gia_ban_thuc_te) - numberInput(form.tong_chi_phi_thuc_te);
  const scorePreview = getCompletionScorePreview(form, assignments.length);

  const setEvenContribution = () => {
    const share = form.ty_le_dong_gop.length ? Number((1 / form.ty_le_dong_gop.length).toFixed(4)) : 1;
    setForm((prev) => ({
      ...prev,
      dung_chia_deu: true,
      ty_le_dong_gop: prev.ty_le_dong_gop.map((item) => ({ ...item, ty_le: share })),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (ratioInvalid) {
      setError("Tổng tỉ lệ đóng góp phải bằng 100%.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await backendApi.completeProject(project._id, {
        tong_chi_phi_thuc_te: numberInput(form.tong_chi_phi_thuc_te),
        gia_ban_thuc_te: numberInput(form.gia_ban_thuc_te),
        so_lan_sua_thuc_te: numberInput(form.so_lan_sua_thuc_te),
        so_ngay_tre_deadline: numberInput(form.so_ngay_tre_deadline),
        so_sao: numberInput(form.so_sao),
        ty_le_dong_gop: form.ty_le_dong_gop.map(({ ma_nhan_vien, ty_le }) => ({ ma_nhan_vien, ty_le: Number(ty_le) })),
        danh_gia: form.danh_gia.map(({ ma_nhan_vien, diem_chat_luong, so_ngay_tre, so_lan_sua, nhan_xet_quan_ly }) => ({
          ma_nhan_vien,
          diem_chat_luong: numberInput(diem_chat_luong),
          so_ngay_tre: numberInput(so_ngay_tre),
          so_lan_sua: numberInput(so_lan_sua),
          nhan_xet_quan_ly,
        })),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Không hoàn thành được dự án"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Hoàn thành & tính điểm"
      subtitle="Chốt chi phí thực tế, rating khách hàng và tỉ lệ đóng góp để hệ thống cập nhật điểm nhân viên."
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary ripple" type="submit" form="complete-form" disabled={saving}>
            <CheckCircle2 size={16} /> {saving ? "Đang chốt" : "Hoàn thành dự án"}
          </button>
        </>
      }
    >
      <form id="complete-form" className="detail-form" onSubmit={submit}>
        <div>
          <div className="complete-section-title"><DollarSign size={15} /> Chi phí thực tế</div>
        <div className="detail-form-grid">
          <label>
            Tổng chi phí thực tế
            <input
              type="number"
              min={0}
              className="form-input"
              value={form.tong_chi_phi_thuc_te}
              onChange={(event) => setForm((prev) => ({ ...prev, tong_chi_phi_thuc_te: event.target.value }))}
            />
          </label>
          <label>
            Giá bán thực tế
            <input
              type="number"
              min={0}
              className="form-input"
              value={form.gia_ban_thuc_te}
              onChange={(event) => setForm((prev) => ({ ...prev, gia_ban_thuc_te: event.target.value }))}
            />
          </label>
          <label>
            Số lần sửa
            <input
              type="number"
              min={0}
              className="form-input"
              value={form.so_lan_sua_thuc_te}
              onChange={(event) => setForm((prev) => ({ ...prev, so_lan_sua_thuc_te: event.target.value }))}
            />
          </label>
          <label>
            Số ngày trễ
            <input
              type="number"
              min={0}
              className="form-input"
              value={form.so_ngay_tre_deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, so_ngay_tre_deadline: event.target.value }))}
            />
          </label>
        </div>
          <div className={`actual-profit-box ${actualProfit >= 0 ? "ok" : "bad"}`}>
            Lợi nhuận thực tế: <strong>{formatVnd(actualProfit)}</strong>
            {estimate.gia_de_xuat ? <span>Ước tính: {formatVnd(estimate.gia_de_xuat)}</span> : null}
          </div>
        </div>
        <div>
          <div className="detail-section-title">Rating khách hàng</div>
          <div className="rating-row">
            {[0, 1, 2, 3, 4, 5].map((score) => (
              <button key={score} type="button" className={`rating-btn ${Number(form.so_sao) === score ? "active" : ""}`} onClick={() => setForm((prev) => ({ ...prev, so_sao: score }))}>
                <Star size={14} fill={Number(form.so_sao) >= score && score > 0 ? "currentColor" : "transparent"} /> {RATING_LABELS[score]}
              </button>
            ))}
          </div>
        </div>
        <div className="score-preview-box">
          <strong>Preview điểm nhân viên</strong>
          <span>
            Project score: <b>{scorePreview.projectScore.toFixed(1)} pts</b>
            <i>Bonus: +{scorePreview.bonus}</i>
            <em>Penalty: -{scorePreview.penalty}</em>
          </span>
          <small>Mỗi NV: ~{scorePreview.perEmployee.toFixed(1)} pts</small>
        </div>
        {form.ty_le_dong_gop.length > 0 && (
          <div>
            <div className="detail-section-title">Tỉ lệ đóng góp</div>
            <div className="contribution-mode">
              <button className={form.dung_chia_deu ? "active" : ""} type="button" onClick={setEvenContribution}>
                Chia đều
              </button>
              <button className={!form.dung_chia_deu ? "active" : ""} type="button" onClick={() => setForm((prev) => ({ ...prev, dung_chia_deu: false }))}>
                Tùy chỉnh
              </button>
            </div>
            {!form.dung_chia_deu ? (
            <div className="contribution-list">
              {form.ty_le_dong_gop.map((item, index) => (
                <label key={item.ma_nhan_vien} className="contribution-row">
                  <span>{item.ho_ten || "Nhân viên"}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-input"
                    value={Math.round((Number(item.ty_le) || 0) * 100)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ty_le_dong_gop: prev.ty_le_dong_gop.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, ty_le: numberInput(event.target.value) / 100 } : row,
                        ),
                      }))
                    }
                  />
                  <strong>%</strong>
                </label>
              ))}
            </div>
            ) : null}
            <div className={`ratio-total ${ratioInvalid ? "bad" : "ok"}`}>Tổng: {Math.round(totalRatio * 100)}%</div>
          </div>
        )}
        {form.danh_gia.length > 0 ? (
          <div>
            <div className="complete-section-title"><Users size={15} /> Đánh giá nhân viên</div>
            <div className="employee-evaluation-list">
              {form.danh_gia.map((item, index) => (
                <div key={item.ma_nhan_vien} className="employee-evaluation-card">
                  <strong>{item.ho_ten || "Nhân viên"}</strong>
                  <div className="detail-form-grid compact">
                    <label>
                      Điểm chất lượng (1-10)
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="form-input"
                        value={item.diem_chat_luong}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            danh_gia: prev.danh_gia.map((row, rowIndex) => (rowIndex === index ? { ...row, diem_chat_luong: event.target.value } : row)),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Ngày trễ của nhân viên
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        value={item.so_ngay_tre}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            danh_gia: prev.danh_gia.map((row, rowIndex) => (rowIndex === index ? { ...row, so_ngay_tre: event.target.value } : row)),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Nhận xét
                    <input
                      className="form-input"
                      value={item.nhan_xet_quan_ly}
                      placeholder="Nhận xét ngắn..."
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          danh_gia: prev.danh_gia.map((row, rowIndex) => (rowIndex === index ? { ...row, nhan_xet_quan_ly: event.target.value } : row)),
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [profit, setProfit] = useState(25);
  const [busy, setBusy] = useState("");
  const [aiModal, setAiModal] = useState({
    open: false,
    loading: false,
    saving: false,
    proposal: null,
    error: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectDoc, employeeDocs, categoryDocs, suggestionData, historyData] = await Promise.all([
        backendApi.project(id),
        backendApi.employees(),
        backendApi.categories(),
        backendApi.suggestAssignments(id).catch(() => ({ goi_y: [] })),
        backendApi.projectScoreHistory(id).catch(() => []),
      ]);
      setProject(projectDoc);
      setProfit(projectDoc?.uoc_tinh?.ty_le_loi_nhuan ?? 25);
      setEmployees(employeeDocs.map(mapEmployee));
      setCategories(categoryDocs || []);
      setSuggestions(suggestionData?.goi_y || projectDoc?.uoc_tinh?.phan_cong_goi_y || []);
      setScoreHistory(historyData || []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được chi tiết dự án"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const estimate = project?.uoc_tinh || {};
  const assignments = project?.phan_cong || [];
  const isFinished = ["completed", "cancelled"].includes(project?.trang_thai);
  const action = statusAction(project?.trang_thai);
  const workflowIndex = WORKFLOW.findIndex((item) => item.key === project?.trang_thai);

  const technicalTotal = useMemo(() => {
    const kt = project?.chi_phi_ky_thuat || {};
    return (kt.chi_phi_phan_mem || 0) + (kt.chi_phi_render || 0) + (kt.chi_phi_luu_tru || 0) + (kt.chi_phi_tai_nguyen || 0);
  }, [project]);

  const runAction = async (label, fn) => {
    setBusy(label);
    setError("");
    try {
      await fn(id);
      setToast(label);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Không cập nhật được dự án"));
    } finally {
      setBusy("");
    }
  };

  const runEstimate = async (nextProfit = profit) => {
    const selectedProfit = typeof nextProfit === "number" || typeof nextProfit === "string" ? nextProfit : profit;
    setBusy("estimate");
    setError("");
    try {
      await backendApi.estimateProject(id, numberInput(selectedProfit));
      setToast("Đã tính lại bằng thuật toán nội bộ");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Không chạy được ước tính"));
    } finally {
      setBusy("");
    }
  };

  const runAiEstimate = async () => {
    setBusy("ai-estimation");
    setAiModal({
      open: true,
      loading: true,
      saving: false,
      proposal: null,
      error: "",
    });
    setError("");
    try {
      const proposal = await backendApi.analyzeProjectAi(id);
      setAiModal((current) => ({ ...current, loading: false, proposal }));
    } catch (err) {
      setAiModal((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(err, "Không phân tích được bằng AI"),
      }));
    } finally {
      setBusy("");
    }
  };

  const confirmAiEstimate = async (payload) => {
    setAiModal((current) => ({ ...current, saving: true, error: "" }));
    try {
      await backendApi.confirmProjectAi(id, { ...payload, ty_le_loi_nhuan: numberInput(profit) });
      setToast("Đã xác nhận AI và tính lại chi phí");
      await loadData();
      setAiModal((current) => ({ ...current, open: false, saving: false }));
    } catch (err) {
      setAiModal((current) => ({
        ...current,
        saving: false,
        error: getErrorMessage(err, "Không lưu được kết quả AI"),
      }));
    }
  };

  const removeAssignment = async (assignmentId) => {
    setBusy(assignmentId);
    setError("");
    try {
      await backendApi.removeAssignment(id, assignmentId);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được phân công"));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="page"><div className="card">Đang tải chi tiết dự án...</div></div>;
  if (error && !project) {
    return (
      <div className="page">
        <div className="card error-card">{error}</div>
        <button className="btn btn-secondary ripple" type="button" onClick={() => navigate("/projects")}>
          <ArrowLeft size={16} /> Quay lại dự án
        </button>
      </div>
    );
  }

  const ActionIcon = action?.icon;

  return (
    <div className="page project-detail-page">
      <div className="detail-head">
        <div className="detail-title-row">
          <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => navigate("/projects")}>
            <ArrowLeft size={16} /> Dự án
          </button>
          <div>
            <h1 className="page-title">{project.ten_du_an}</h1>
            <p className="page-subtitle">
              {project.ma_khach_hang?.ten_cong_ty || "Chưa có khách"} · {project.loai_du_an?.ten_hien_thi || project.loai_du_an?.slug || "Chưa phân loại"} · Deadline {formatDate(project.deadline)}
            </p>
          </div>
        </div>
        <div className="detail-actions">
          {action && !isFinished ? (
            <button className="btn btn-primary ripple" type="button" disabled={Boolean(busy)} onClick={() => runAction(action.label, action.fn)}>
              <ActionIcon size={16} /> {busy ? "Đang xử lý" : action.label}
            </button>
          ) : null}
          {project.trang_thai === "review" ? (
            <button className="btn btn-primary ripple complete-btn" type="button" onClick={() => setModal("complete")}>
              <CheckCircle2 size={16} /> Hoàn thành
            </button>
          ) : null}
          {!isFinished ? (
            <button className="btn btn-secondary ripple danger-soft" type="button" disabled={Boolean(busy)} onClick={() => runAction("Đã hủy dự án", backendApi.cancelProject)}>
              <Ban size={16} /> Hủy
            </button>
          ) : null}
        </div>
      </div>

      {toast ? <div className="pill success detail-toast"><CheckCircle2 size={14} /> {toast}</div> : null}
      {error ? <div className="card error-card">{error}</div> : null}

      {project.trang_thai !== "cancelled" && (
        <div className="workflow-card">
          {WORKFLOW.map((step, index) => {
            const active = step.key === project.trang_thai;
            const done = workflowIndex > index;
            return (
              <div key={step.key} className={`workflow-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                <span className="workflow-dot">{done ? "✓" : index + 1}</span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="detail-grid">
        <section className="detail-main">
          <CostBreakdown
            estimate={estimate}
            profit={profit}
            setProfit={setProfit}
            onEstimate={runEstimate}
            onAiEstimate={runAiEstimate}
            busy={busy}
            disabled={isFinished}
          />
          <div className="card detail-cost-card">
            <div className="detail-card-head">
              <div>
                <div className="card-title"><CircleDollarSign size={16} /> Ước tính chi phí</div>
                <div className="card-subtitle">Backend tính theo yêu cầu động, chi phí kỹ thuật, rủi ro và phân công thực tế.</div>
              </div>
              <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => runEstimate()} disabled={busy === "estimate"}>
                <RefreshCw size={14} /> Tính lại
              </button>
            </div>
            <div className="cost-grid">
              <InfoRow label="Nhân sự" value={formatVnd(estimate.chi_phi_nhan_su || 0)} />
              <InfoRow label="Kỹ thuật" value={formatVnd(estimate.chi_phi_ky_thuat || 0)} />
              <InfoRow label="Rủi ro" value={`${estimate.phan_tram_rui_ro || 0}% · ${formatVnd(estimate.chi_phi_rui_ro || 0)}`} />
              <InfoRow label="Giờ công" value={`${estimate.tong_gio_cong || 0}h`} />
            </div>
            <div className="profit-row">
              <label>
                Tỉ lệ lợi nhuận
                <input className="form-input" type="number" min={0} max={200} value={profit} onChange={(event) => setProfit(event.target.value)} />
              </label>
              <div className="price-box">
                <span>Giá đề xuất</span>
                <strong>{formatVnd(estimate.gia_de_xuat || 0, false)}</strong>
              </div>
            </div>
            {estimate.ly_do_rui_ro ? <div className="risk-note">{estimate.ly_do_rui_ro}</div> : null}
          </div>

          <div className="card">
            <div className="detail-card-head">
              <div>
                <div className="card-title"><UserPlus size={16} /> Phân công ({assignments.length})</div>
                <div className="card-subtitle">Phân công theo từng loại dự án và kéo theo tính lại chi phí.</div>
              </div>
              {!isFinished ? (
                <button className="btn btn-primary btn-sm ripple" type="button" onClick={() => setModal("assignment")}>
                  <UserPlus size={14} /> Thêm
                </button>
              ) : null}
            </div>
            {assignments.length === 0 ? (
              <div className="detail-empty">Chưa có nhân sự. Dùng gợi ý của hệ thống bên dưới hoặc thêm phân công thủ công.</div>
            ) : (
              <div className="assignment-list">
                {assignments.map((assignment) => {
                  const person = assignment.ma_nhan_vien || {};
                  return (
                    <div key={assignment._id} className="assignment-row">
                      <div className="emp-avatar mini">{(assignment.ho_ten || person.ho_ten || "?").slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{assignment.ho_ten || person.ho_ten || "Nhân viên"}</strong>
                        <span>{assignment.vai_tro_trong_du_an || roleLabel(person.vai_tro)} · {assignment.gio_du_kien || 0}h dự kiến · {assignment.gio_thuc_te || 0}h thực tế</span>
                      </div>
                      {!isFinished ? (
                        <button className="btn btn-ghost btn-sm ripple danger-text" type="button" disabled={busy === assignment._id} onClick={() => removeAssignment(assignment._id)}>
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {suggestions.length > 0 && !isFinished ? (
              <div className="suggestion-panel">
                <div className="detail-section-title">Gợi ý từ hệ thống</div>
                <div className="suggestion-strip">
                  {suggestions.map((item) => (
                    <button
                      key={`${item.ma_nhan_vien}_${item.vai_tro}`}
                      className="suggestion-chip"
                      type="button"
                      onClick={async () => {
                        setBusy(item.ma_nhan_vien);
                        try {
                          await backendApi.assignEmployee(id, {
                            ma_nhan_vien: item.ma_nhan_vien,
                            vai_tro_trong_du_an: item.vai_tro_trong_du_an || roleLabel(item.vai_tro),
                            gio_du_kien: item.gio_du_kien || 1,
                          });
                          await loadData();
                        } catch (err) {
                          setError(getErrorMessage(err, "Không thêm được gợi ý phân công"));
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      <strong>{item.ho_ten}</strong>
                      <span>{roleLabel(item.vai_tro)} · {item.gio_du_kien || 0}h</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="detail-side">
          <div className="card">
            <div className="card-title"><ClipboardList size={16} /> Thông tin</div>
            <InfoRow label="Trạng thái" value={STATUS_LABELS[project.trang_thai] || project.trang_thai} />
            <InfoRow label="Khách hàng" value={project.ma_khach_hang?.ten_cong_ty} />
            <InfoRow label="Liên hệ" value={project.ma_khach_hang?.nguoi_lien_he} />
            <InfoRow label="Email" value={project.ma_khach_hang?.email} />
            <InfoRow label="Độ khó KH" value={project.ma_khach_hang?.diem_do_kho ? `${project.ma_khach_hang.diem_do_kho}/5` : null} />
            <InfoRow label="Loại dự án" value={project.loai_du_an?.ten_hien_thi || project.loai_du_an?.slug} />
            <InfoRow label="Deadline" value={formatDate(project.deadline)} />
            {project.mo_ta ? <div className="detail-description">{project.mo_ta}</div> : null}
          </div>

          <div className="card">
            <div className="detail-card-head">
              <div className="card-title"><Calculator size={16} /> Chi phí kỹ thuật</div>
              {!isFinished ? (
                <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setModal("technical")}>
                  Sửa
                </button>
              ) : null}
            </div>
            <InfoRow label="Phần mềm" value={formatVnd(project.chi_phi_ky_thuat?.chi_phi_phan_mem || 0)} />
            <InfoRow label="Render" value={formatVnd(project.chi_phi_ky_thuat?.chi_phi_render || 0)} />
            <InfoRow label="Lưu trữ" value={formatVnd(project.chi_phi_ky_thuat?.chi_phi_luu_tru || 0)} />
            <InfoRow label="Tài nguyên" value={formatVnd(project.chi_phi_ky_thuat?.chi_phi_tai_nguyen || 0)} />
            <div className="tech-total">{formatVnd(technicalTotal, false)}</div>
          </div>

          <div className="card">
            <div className="card-title">Yêu cầu dự án</div>
            <RequirementList values={project.yeu_cau} />
          </div>

          {scoreHistory.length > 0 ? (
            <div className="card">
              <div className="card-title">Lịch sử điểm</div>
              <div className="score-history">
                {scoreHistory.slice(0, 6).map((item) => (
                  <div key={item._id} className="score-row">
                    <span>{item.ma_nhan_vien?.ho_ten || "Nhân viên"}</span>
                    <strong>{item.diem_thay_doi > 0 ? "+" : ""}{item.diem_thay_doi || item.diem || 0}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Link className="btn btn-secondary ripple detail-full-btn" to="/tasks">
            Xem công việc liên quan
          </Link>
        </aside>
      </div>

      {aiModal.open ? (
        <AiEstimationModal
          title="Ước tính bằng AI"
          proposal={aiModal.proposal}
          categories={categories}
          loading={aiModal.loading}
          saving={aiModal.saving}
          error={aiModal.error}
          onClose={() => setAiModal((current) => ({ ...current, open: false }))}
          onRetry={runAiEstimate}
          onConfirm={confirmAiEstimate}
          confirmLabel="Xác nhận và tính giá"
          allowProjectFields
        />
      ) : null}
      {modal === "assignment" ? <AssignmentModal project={project} employees={employees} suggestions={suggestions} onSaved={loadData} onClose={() => setModal(null)} /> : null}
      {modal === "technical" ? <TechnicalCostModal project={project} onSaved={loadData} onClose={() => setModal(null)} /> : null}
      {modal === "complete" ? <CompleteModal project={project} onSaved={loadData} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
