import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import "../../styles/components/AiEstimationModal.css";

const DIFFICULTY_LABELS = {
  1: "1 - De",
  2: "2 - Trung binh",
  3: "3 - Kho",
  4: "4 - Rat kho",
  5: "5 - Moi/rat phuc tap",
};

function conditionId(condition, index) {
  return condition.temp_id || condition.field_key || `${condition.label || "condition"}-${index}`;
}

function normalizeCondition(condition = {}, index = 0) {
  const score = Number(condition.difficulty_score || condition.diem || 2);
  return {
    temp_id: condition.temp_id || `condition-${index}-${Date.now()}`,
    field_key: condition.field_key || "",
    label: condition.label || condition.field_key || `Dieu kien ${index + 1}`,
    type: condition.type || "text",
    value: condition.value ?? "",
    options: condition.options || [],
    is_new: Boolean(condition.is_new),
    difficulty_score: Number.isFinite(score) ? Math.max(1, Math.min(5, Math.round(score))) : 2,
    difficulty_level: condition.difficulty_level || "trung_binh",
    difficulty_source: condition.difficulty_source || "",
    reason: condition.reason || "",
    confidence: condition.confidence || 0,
    required: Boolean(condition.required),
  };
}

function inputValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === true) return "true";
  if (value === false) return "false";
  return value ?? "";
}

function scoreToLevel(score) {
  if (score <= 1) return "de";
  if (score <= 2) return "trung_binh";
  if (score <= 3) return "kho";
  return "rat_kho";
}

function renderValueEditor(condition, onChange) {
  const options = condition.options || [];

  if (condition.type === "boolean") {
    return (
      <select className="form-select" value={String(Boolean(condition.value))} onChange={(event) => onChange(event.target.value === "true")}>
        <option value="false">Khong</option>
        <option value="true">Co</option>
      </select>
    );
  }

  if (condition.type === "multiselect" && options.length) {
    const selected = Array.isArray(condition.value) ? condition.value : [];
    return (
      <div className="ai-condition-options">
        {options.map((option) => {
          const optionValue = option.value;
          const active = selected.includes(optionValue);
          return (
            <button
              key={String(optionValue)}
              type="button"
              className={`ai-option-chip ${active ? "active" : ""}`}
              onClick={() => {
                onChange(active ? selected.filter((item) => item !== optionValue) : [...selected, optionValue]);
              }}
            >
              {option.label || option.value}
            </button>
          );
        })}
      </div>
    );
  }

  if (condition.type === "select" && options.length) {
    return (
      <select className="form-select" value={inputValue(condition.value)} onChange={(event) => onChange(event.target.value)}>
        <option value="">Chon gia tri</option>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label || option.value}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="form-input"
      type={condition.type === "number" ? "number" : "text"}
      value={inputValue(condition.value)}
      onChange={(event) => onChange(condition.type === "number" ? Number(event.target.value) : event.target.value)}
    />
  );
}

export default function AiEstimationModal({
  title = "Uoc tinh bang AI",
  proposal,
  categories = [],
  loading = false,
  saving = false,
  error = "",
  onClose,
  onRetry,
  onConfirm,
  confirmLabel = "Xac nhan va tinh gia",
  allowProjectFields = true,
}) {
  const [projectDraft, setProjectDraft] = useState({});
  const [conditions, setConditions] = useState([]);

  useEffect(() => {
    setProjectDraft(proposal?.project || {});
    setConditions((proposal?.conditions || []).map(normalizeCondition));
  }, [proposal]);

  const categoryLabel = useMemo(() => {
    const category = categories.find((item) => item._id === projectDraft.ma_loai_du_an);
    return category?.ten_hien_thi || projectDraft.loai_du_an_label || "";
  }, [categories, projectDraft.ma_loai_du_an, projectDraft.loai_du_an_label]);

  const updateProject = (key, value) => {
    setProjectDraft((current) => ({ ...current, [key]: value }));
  };

  const updateCondition = (targetId, patch) => {
    setConditions((current) => current.map((item, index) => (conditionId(item, index) === targetId ? { ...item, ...patch } : item)));
  };

  const removeCondition = (targetId) => {
    setConditions((current) => current.filter((item, index) => conditionId(item, index) !== targetId));
  };

  const addCondition = () => {
    setConditions((current) => [
      ...current,
      normalizeCondition({
        temp_id: `manual-${Date.now()}`,
        label: "Dieu kien moi",
        type: "text",
        value: "",
        is_new: true,
        difficulty_score: 3,
        difficulty_level: "kho",
        reason: "",
      }, current.length),
    ]);
  };

  const confirm = () => {
    onConfirm?.({
      project: projectDraft,
      conditions,
    });
  };

  return (
    <div className="modal-backdrop ai-estimation-backdrop" onClick={onClose}>
      <div className="modal-card ai-estimation-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header ai-estimation-header">
          <div>
            <h2>
              <Sparkles size={18} /> {title}
            </h2>
            {proposal?.provider ? <p>{proposal.provider} · {proposal.model}</p> : categoryLabel ? <p>{categoryLabel}</p> : null}
          </div>
          <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onClose} aria-label="Dong">
            <X size={18} />
          </button>
        </div>

        <div className="ai-estimation-body">
          {loading ? (
            <div className="ai-estimation-loading">
              <Bot size={24} />
              <strong>Dang phan tich yeu cau</strong>
              <div className="ai-estimation-bars">
                {[0, 1, 2, 3].map((item) => (
                  <span key={item} style={{ animationDelay: `${item * 0.12}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {error ? <div className="form-error">{error}</div> : null}

            {allowProjectFields ? (
              <div className="ai-project-grid">
                <label>
                  Ten du an
                  <input className="form-input" value={projectDraft.ten_du_an || ""} onChange={(event) => updateProject("ten_du_an", event.target.value)} />
                </label>
                <label>
                  Loai du an
                  <select className="form-select" value={projectDraft.ma_loai_du_an || ""} onChange={(event) => updateProject("ma_loai_du_an", event.target.value)}>
                    <option value="">Chon loai</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.ten_hien_thi}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Deadline
                  <input className="form-input" type="date" value={projectDraft.deadline ? String(projectDraft.deadline).slice(0, 10) : ""} onChange={(event) => updateProject("deadline", event.target.value)} />
                </label>
                <label>
                  Muc do gap
                  <select className="form-select" value={projectDraft.muc_do_gap || "binh_thuong"} onChange={(event) => updateProject("muc_do_gap", event.target.value)}>
                    <option value="binh_thuong">Binh thuong</option>
                    <option value="gap">Gap</option>
                    <option value="sieu_gap">Sieu gap</option>
                  </select>
                </label>
                <label className="ai-project-span">
                  Mo ta
                  <textarea className="form-textarea" rows={3} value={projectDraft.mo_ta || ""} onChange={(event) => updateProject("mo_ta", event.target.value)} />
                </label>
              </div>
            ) : null}

            {proposal?.extracted_text ? (
              <div className="ai-extracted-text">
                <span>Noi dung OCR</span>
                <p>{proposal.extracted_text}</p>
              </div>
            ) : null}

            <div className="ai-condition-head">
              <div>
                <strong>Dieu kien da phat hien</strong>
                <span>{conditions.length} muc</span>
              </div>
              <button className="btn btn-secondary btn-sm ripple" type="button" onClick={addCondition}>
                <Plus size={14} /> Them
              </button>
            </div>

            <div className="ai-condition-list">
              {conditions.map((condition, index) => {
                const id = conditionId(condition, index);
                return (
                  <div key={id} className={`ai-condition-row ${condition.is_new ? "is-new" : ""}`}>
                    <div className="ai-condition-main">
                      <label>
                        Dieu kien
                        <input className="form-input" value={condition.label} onChange={(event) => updateCondition(id, { label: event.target.value, is_new: condition.is_new || !condition.field_key })} />
                      </label>
                      <label>
                        Gia tri
                        {renderValueEditor(condition, (value) => updateCondition(id, { value }))}
                      </label>
                    </div>

                    <div className="ai-condition-meta">
                      <label>
                        Do kho
                        <select
                          className="form-select"
                          value={condition.difficulty_score}
                          onChange={(event) => {
                            const score = Number(event.target.value);
                            updateCondition(id, { difficulty_score: score, difficulty_level: scoreToLevel(score) });
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((score) => (
                            <option key={score} value={score}>
                              {DIFFICULTY_LABELS[score]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ly do
                        <input className="form-input" value={condition.reason || ""} onChange={(event) => updateCondition(id, { reason: event.target.value })} />
                      </label>
                      <div className="ai-condition-actions">
                        <span className={`ai-condition-badge ${condition.is_new ? "new" : "known"}`}>{condition.is_new ? "Moi" : "Co san"}</span>
                        <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => removeCondition(id)} aria-label="Xoa dieu kien">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!conditions.length ? <div className="ai-condition-empty">Chua co dieu kien nao.</div> : null}
            </div>

            {proposal?.missing_conditions?.length ? (
              <div className="ai-note-strip">
                <strong>Thieu thong tin</strong>
                <span>{proposal.missing_conditions.join(", ")}</span>
              </div>
            ) : null}
            {proposal?.notes?.length ? (
              <div className="ai-note-strip">
                <strong>Ghi chu</strong>
                <span>{proposal.notes.join(" ")}</span>
              </div>
            ) : null}

            </>
          )}
        </div>

        {!loading ? (
          <div className="ai-modal-footer">
            <button className="btn btn-secondary ripple" type="button" onClick={onClose} disabled={saving}>
              Huy
            </button>
            {onRetry ? (
              <button className="btn btn-secondary ripple" type="button" onClick={onRetry} disabled={saving}>
                <RefreshCw size={16} /> Chay lai
              </button>
            ) : null}
            <button className="btn btn-primary ripple" type="button" onClick={confirm} disabled={saving || !conditions.length}>
              <Check size={16} /> {saving ? "Dang luu" : confirmLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
