import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle2, Edit2, FileText, Paperclip, Plus, Search, Send, Trash2, X } from "lucide-react";
import { ROLES, backendApi, formatVnd, getErrorMessage, mapCustomer, mapProject } from "../../services/api";
import RoleGate from "../../components/common/RoleGate";
import "../../styles/pages/marketing/MarketingCRMPage.css";

const leadPipelineStages = [
  { key: "new", label: "Khách mới", tone: "blue" },
  { key: "negotiation", label: "Đang báo giá", tone: "purple" },
  { key: "won", label: "Đã chốt / đang chạy", tone: "green" },
];

function buildBriefs(projects) {
  return projects
    .filter((project) => !["completed", "cancelled"].includes(project.status))
    .slice(0, 8)
    .map((project) => ({
      id: project.id,
      from: project.client,
      title: project.name,
      message: project.raw?.mo_ta || project.riskReason || "Chưa có ghi chú brief.",
      budget: project.budget,
      due: project.deadlineLabel,
      priority: project.risk >= 50 ? "high" : project.status === "review" ? "medium" : "low",
      project,
    }));
}

function Modal({ title, subtitle, children, footer, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card customer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="btn btn-ghost btn-sm ripple" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="customer-modal-body">{children}</div>
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    ten_cong_ty: customer?.ten_cong_ty || "",
    nguoi_lien_he: customer?.nguoi_lien_he || "",
    email: customer?.email || "",
    so_dien_thoai: customer?.so_dien_thoai || "",
    dia_chi: customer?.dia_chi || "",
    diem_do_kho: customer?.diem_do_kho || 3,
    ghi_chu: customer?.ghi_chu || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, diem_do_kho: Number(form.diem_do_kho) || 3 };
      if (customer) await backendApi.updateCustomer(customer._id, payload);
      else await backendApi.createCustomer(payload);
      await onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được khách hàng"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={customer ? "Sửa khách hàng" : "Thêm khách hàng"}
      subtitle="Điểm độ khó khách hàng được hệ thống dùng để cộng rủi ro khi ước tính dự án."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary ripple" type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary ripple" type="submit" form="customer-form" disabled={saving}>
            {saving ? "Đang lưu" : "Lưu khách hàng"}
          </button>
        </>
      }
    >
      <form id="customer-form" className="customer-form" onSubmit={submit}>
        <label>
          Công ty
          <input className="form-input" value={form.ten_cong_ty} onChange={(event) => setField("ten_cong_ty", event.target.value)} required />
        </label>
        <label>
          Người liên hệ
          <input className="form-input" value={form.nguoi_lien_he} onChange={(event) => setField("nguoi_lien_he", event.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" className="form-input" value={form.email} onChange={(event) => setField("email", event.target.value)} required />
        </label>
        <label>
          Điện thoại
          <input className="form-input" value={form.so_dien_thoai} onChange={(event) => setField("so_dien_thoai", event.target.value)} />
        </label>
        <label className="customer-form-span">
          Địa chỉ / nhóm ngành
          <input className="form-input" value={form.dia_chi} onChange={(event) => setField("dia_chi", event.target.value)} />
        </label>
        <label className="customer-form-span">
          Độ khó khách hàng
          <div className="difficulty-picker">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} type="button" className={score <= Number(form.diem_do_kho) ? "active" : ""} onClick={() => setField("diem_do_kho", score)}>
                {score}
              </button>
            ))}
          </div>
        </label>
        <label className="customer-form-span">
          Ghi chú
          <textarea className="form-textarea" rows={3} value={form.ghi_chu} onChange={(event) => setField("ghi_chu", event.target.value)} />
        </label>
        {error ? <div className="form-error customer-form-span">{error}</div> : null}
      </form>
    </Modal>
  );
}

export default function MarketingCRMPage() {
  const { currentUser } = useOutletContext();
  const deny = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.CLIENT;

  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [dropStage, setDropStage] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefLead, setBriefLead] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [quoteAnim, setQuoteAnim] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [customerDocs, projectDocs] = await Promise.all([backendApi.customers(), backendApi.projects()]);
      const mappedProjects = projectDocs.map(mapProject);
      setProjects(mappedProjects);
      setCustomers(customerDocs);
      setLeads(customerDocs.map((customer) => mapCustomer(customer, mappedProjects)));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được CRM khách hàng"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!deny) loadData();
  }, [deny]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const briefs = useMemo(() => buildBriefs(projects), [projects]);
  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter((customer) =>
      [customer.ten_cong_ty, customer.nguoi_lien_he, customer.email, customer.so_dien_thoai].some((value) =>
        String(value || "").toLowerCase().includes(keyword),
      ),
    );
  }, [customers, customerSearch]);

  if (deny)
    return (
      <RoleGate
        allow={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}
        title="CRM chỉ dành cho Manager/Admin"
        subtitle="Backend hiện có quản lý khách hàng và dự án nội bộ; Staff chỉ xử lý task được phân công."
      />
    );

  const handleDrop = (stage) => {
    if (!dragId) return;
    setLeads((prev) => prev.map((lead) => (lead.id === dragId ? { ...lead, stage } : lead)));
    setDragId(null);
    setDropStage(null);
  };

  const handleSendQuote = async (project, event) => {
    if (!project) {
      setToast("Khách hàng này chưa có dự án để gửi báo giá.");
      return;
    }
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    if (rect) {
      setQuoteAnim({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, id: `${project.id}_${Date.now()}` });
      window.setTimeout(() => setQuoteAnim(null), 900);
    }

    try {
      await backendApi.sendQuote(project.id);
      setToast("Đã cập nhật trạng thái dự án sang Đã báo giá.");
      await loadData();
    } catch (err) {
      setToast(getErrorMessage(err, "Không gửi được báo giá"));
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    try {
      await backendApi.deleteCustomer(deleteCustomerId);
      setToast("Đã xóa khách hàng.");
      setDeleteCustomerId(null);
      await loadData();
    } catch (err) {
      setToast(getErrorMessage(err, "Không xóa được khách hàng"));
    }
  };

  return (
    <div className="page marketing-page">
      <div className="page-header">
        <h1 className="page-title">Khách hàng & Marketing</h1>
      </div>

      {loading && <div className="card">Đang tải CRM...</div>}
      {error && <div className="card error-card">{error}</div>}
      {toast && (
        <div className="pill success crm-toast">
          <CheckCircle2 size={14} />
          <span>{toast}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="card customer-admin-card">
            <div className="customer-toolbar">
              <div>
                <div className="card-title">Quản lý khách hàng</div>
                <div className="card-subtitle">CRUD khách hàng; điểm độ khó ảnh hưởng trực tiếp tới rủi ro ước tính.</div>
              </div>
              <button className="btn btn-primary ripple" type="button" onClick={() => setCustomerModal({ mode: "create" })}>
                <Plus size={16} /> Thêm khách hàng
              </button>
            </div>
            <div className="customer-filter">
              <Search size={16} />
              <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Tìm công ty, người liên hệ, email..." />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Công ty</th>
                    <th>Liên hệ</th>
                    <th>Email</th>
                    <th>Điện thoại</th>
                    <th>Độ khó</th>
                    <th>Dự án</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => {
                    const customerProjects = projects.filter((project) => project.clientId === customer._id);
                    return (
                      <tr key={customer._id}>
                        <td style={{ fontWeight: 800 }}>{customer.ten_cong_ty}</td>
                        <td>{customer.nguoi_lien_he}</td>
                        <td>{customer.email}</td>
                        <td>{customer.so_dien_thoai || "Chưa có"}</td>
                        <td>
                          <div className="difficulty-dots">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <span key={score} className={score <= (customer.diem_do_kho || 3) ? "active" : ""} />
                            ))}
                          </div>
                        </td>
                        <td>{customerProjects.length}</td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => setCustomerModal({ mode: "edit", customer })}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => setDeleteCustomerId(customer._id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7}>Chưa có khách hàng phù hợp.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="crm-top">
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title">Brief / dự án đang xử lý</div>
              <div className="card-subtitle">Danh sách dự án chưa hoàn thành, dùng để xem brief và gửi báo giá</div>

              <div className="brief-list">
                {briefs.map((brief) => (
                  <div key={brief.id} className={`brief-row ${brief.priority}`}>
                    <div>
                      <div className="brief-title">{brief.title}</div>
                      <div className="brief-meta">
                        <strong>{brief.from}</strong> · Budget {formatVnd(brief.budget)} · Due {brief.due}
                      </div>
                    </div>
                    <div className="brief-actions">
                      <button
                        className="btn btn-secondary btn-sm ripple"
                        type="button"
                        onClick={() => {
                          const lead = leads.find((item) => item.id === brief.project.clientId);
                          setBriefLead(lead ? { ...lead, latestProject: brief.project } : { name: brief.from, latestProject: brief.project });
                          setBriefOpen(true);
                        }}
                      >
                        <FileText size={14} /> Xem brief
                      </button>
                      <button className="btn btn-primary btn-sm ripple" type="button" onClick={(event) => handleSendQuote(brief.project, event)}>
                        <Send size={14} /> Gửi báo giá
                      </button>
                    </div>
                  </div>
                ))}
                {briefs.length === 0 && <div className="pipeline-empty">Chưa có dự án cần xử lý.</div>}
              </div>
            </div>
          </div>

          <div className="pipeline">
            {leadPipelineStages.map((stage) => (
              <div
                key={stage.key}
                className={`pipeline-col ${dropStage === stage.key ? "drop" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropStage(stage.key);
                }}
                onDragLeave={() => setDropStage(null)}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className={`pipeline-col-header ${stage.tone}`}>
                  <div className="pipeline-col-title">{stage.label}</div>
                  <span className="pipeline-col-count">{leads.filter((lead) => lead.stage === stage.key).length}</span>
                </div>

                <div className="pipeline-col-body">
                  {leads
                    .filter((lead) => lead.stage === stage.key)
                    .map((lead) => (
                      <div
                        key={lead.id}
                        className={`lead-card card hover-lift ${dragId === lead.id ? "dragging" : ""}`}
                        draggable
                        onDragStart={() => setDragId(lead.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropStage(null);
                        }}
                      >
                        <div className="lead-top">
                          <div>
                            <div className="lead-name">{lead.name}</div>
                            <div className="lead-meta">
                              Liên hệ <strong>{lead.owner}</strong> · {lead.email}
                            </div>
                          </div>
                          <div className={`lead-badge ${stage.tone}`}>{formatVnd(lead.expectedBudget)}</div>
                        </div>

                        <div className="lead-tags">
                          {(lead.tags.length ? lead.tags : ["Chưa có dự án"]).slice(0, 3).map((tag) => (
                            <span key={tag} className="lead-tag">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="lead-actions">
                          <button
                            className="btn btn-secondary btn-sm ripple"
                            type="button"
                            onClick={() => {
                              setBriefLead(lead);
                              setBriefOpen(true);
                            }}
                          >
                            <FileText size={14} /> Xem brief
                          </button>
                          <button className="btn btn-primary btn-sm ripple" type="button" onClick={(event) => handleSendQuote(lead.latestProject, event)}>
                            <Send size={14} /> Báo giá
                          </button>
                        </div>
                        <div className="lead-foot">
                          {lead.projects.length} dự án · độ khó KH {lead.difficultyScore}/5 · Last touch: {lead.lastTouch}
                        </div>
                      </div>
                    ))}

                  {leads.filter((lead) => lead.stage === stage.key).length === 0 && <div className="pipeline-empty">Thả lead vào đây</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {briefOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setBriefOpen(false);
            setBriefLead(null);
          }}
        >
          <div className="modal-card brief-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{briefLead?.latestProject?.name || "Brief khách hàng"}</h2>
                <p>
                  <strong>{briefLead?.name}</strong> · Budget {formatVnd(briefLead?.latestProject?.budget || briefLead?.expectedBudget || 0)} · Deadline{" "}
                  {briefLead?.latestProject?.deadlineLabel || "Chưa có"}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm ripple" onClick={() => setBriefOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="brief-body">
              <div className="brief-block">
                <div className="brief-block-title">Mô tả</div>
                <div className="brief-block-content">{briefLead?.latestProject?.raw?.mo_ta || briefLead?.note || "Chưa có ghi chú."}</div>
              </div>
              <div className="brief-block">
                <div className="brief-block-title">Ước tính</div>
                <div className="brief-block-content">
                  Giờ công: {briefLead?.latestProject?.estimatedHours || 0}h · Risk {briefLead?.latestProject?.risk || 0}% · Giá đề xuất{" "}
                  {formatVnd(briefLead?.latestProject?.budget || 0)}
                </div>
              </div>
              <div className="brief-block">
                <div className="brief-block-title">Thông tin khách hàng</div>
                <div className="attach-grid">
                  <div className="attach-item">
                    <Paperclip size={14} />
                    <span>{briefLead?.email || "Chưa có email"}</span>
                  </div>
                  <div className="attach-item">
                    <Paperclip size={14} />
                    <span>{briefLead?.phone || "Chưa có số điện thoại"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary ripple" onClick={() => setBriefOpen(false)} type="button">
                Đóng
              </button>
              <button className="btn btn-primary ripple" type="button" onClick={(event) => handleSendQuote(briefLead?.latestProject, event)}>
                <Send size={16} /> Gửi báo giá
              </button>
            </div>
          </div>
        </div>
      )}

      {customerModal ? <CustomerForm customer={customerModal.customer} onSaved={loadData} onClose={() => setCustomerModal(null)} /> : null}

      {deleteCustomerId ? (
        <Modal
          title="Xóa khách hàng"
          subtitle="Nếu khách hàng đang có dự án, backend có thể từ chối hoặc cần xử lý dữ liệu liên quan."
          onClose={() => setDeleteCustomerId(null)}
          footer={
            <>
              <button className="btn btn-secondary ripple" type="button" onClick={() => setDeleteCustomerId(null)}>
                Hủy
              </button>
              <button className="btn btn-primary ripple danger-button" type="button" onClick={handleDeleteCustomer}>
                <Trash2 size={16} /> Xóa
              </button>
            </>
          }
        >
          <div className="customer-empty">Bạn chắc chắn muốn xóa khách hàng này?</div>
        </Modal>
      ) : null}

      {quoteAnim && <div key={quoteAnim.id} className="mail-fly" style={{ left: quoteAnim.x, top: quoteAnim.y }} aria-hidden />}
    </div>
  );
}
