import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  EyeOff,
  List,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { EMPLOYEE_LEVELS, backendApi, formatVnd, getErrorMessage } from "../../services/api";

const FIELD_TYPES = [
  { value: "number", label: "Number", desc: "Nhập số, có thể cấu hình min/max và khoảng độ khó." },
  { value: "select", label: "Select", desc: "Chọn một lựa chọn trong danh sách." },
  { value: "multiselect", label: "Multiselect", desc: "Chọn nhiều lựa chọn, có quy tắc tổng hợp độ khó." },
  { value: "boolean", label: "Boolean", desc: "Cấu hình hai trạng thái Có / Không." },
  { value: "text", label: "Text", desc: "Nhập chuỗi ngắn, không tính độ khó tự động." },
  { value: "textarea", label: "Textarea", desc: "Nhập nội dung dài, không tính độ khó tự động." },
];

const DIFFICULTY_OPTIONS = [
  { value: "de", label: "Dễ", diem: 1 },
  { value: "trung_binh", label: "Trung bình", diem: 2 },
  { value: "kho", label: "Khó", diem: 3 },
  { value: "rat_kho", label: "Rất khó", diem: 4 },
];

const DIFFICULTY_LABELS = Object.fromEntries(DIFFICULTY_OPTIONS.map((item) => [item.value, item.label]));

const TABS = [
  { key: "skills", label: "Kỹ năng" },
  { key: "levels", label: "Cấp độ" },
  { key: "categories", label: "Loại dự án" },
  { key: "requirements", label: "Yêu cầu dự án" },
];

const emptyCategory = {
  slug: "",
  ten_hien_thi: "",
  mo_ta: "",
  icon: "",
  thu_tu: 1,
  active: true,
  base_hours: 8,
  tech_cost_base: 100000,
};

const emptyRequirement = {
  field_key: "",
  label: "",
  hint: "",
  type: "select",
  required: false,
  active: true,
  thu_tu: 0,
  default_value: "",
  min_value: "",
  max_value: "",
  options: [],
  cau_hinh_do_kho_number: [],
  multiselect_rule: "max",
};

const defaultBooleanOptions = [
  { value: "true", label: "Có", muc_do: "kho", diem: 3 },
  { value: "false", label: "Không", muc_do: "de", diem: 1 },
];

function numberOrNull(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function normalizeOptions(options = []) {
  return options
    .map((option) => {
      const value = String(option.value ?? "").trim();
      const mucDo = option.muc_do || "trung_binh";
      const diem = DIFFICULTY_OPTIONS.find((item) => item.value === mucDo)?.diem || 2;
      return {
        value,
        label: String(option.label ?? value).trim() || value,
        muc_do: mucDo,
        diem,
      };
    })
    .filter((option) => option.value);
}

function normalizeRanges(ranges = []) {
  return ranges
    .map((range) => {
      const mucDo = range.muc_do || "trung_binh";
      const diem = DIFFICULTY_OPTIONS.find((item) => item.value === mucDo)?.diem || 2;
      return {
        min: Number(range.min) || 0,
        max: Number(range.max) || 0,
        muc_do: mucDo,
        diem,
      };
    })
    .filter((range) => range.max >= range.min);
}

function requirementToForm(field) {
  return {
    ...emptyRequirement,
    field_key: field.field_key || "",
    label: field.label || "",
    hint: field.hint || "",
    type: field.type || "select",
    required: Boolean(field.required),
    active: field.active !== false,
    thu_tu: field.thu_tu || 0,
    default_value: field.default_value ?? "",
    min_value: field.min_value ?? "",
    max_value: field.max_value ?? "",
    options: Array.isArray(field.options) ? field.options : [],
    cau_hinh_do_kho_number: Array.isArray(field.cau_hinh_do_kho_number) ? field.cau_hinh_do_kho_number : [],
    multiselect_rule: field.multiselect_rule || "max",
  };
}

function normalizeRequirementPayload(form, categoryId) {
  const payload = {
    ma_loai_du_an: categoryId,
    field_key: form.field_key.trim(),
    label: form.label.trim(),
    hint: form.hint.trim(),
    type: form.type,
    required: Boolean(form.required),
    active: Boolean(form.active),
    thu_tu: Number(form.thu_tu) || 0,
    default_value: form.default_value === "" ? null : form.default_value,
    min_value: numberOrNull(form.min_value),
    max_value: numberOrNull(form.max_value),
    options: [],
    cau_hinh_do_kho_number: [],
    multiselect_rule: form.multiselect_rule || "max",
  };

  if (form.type === "number") {
    payload.cau_hinh_do_kho_number = normalizeRanges(form.cau_hinh_do_kho_number);
  }

  if (form.type === "boolean") {
    payload.options = normalizeOptions(form.options.length > 0 ? form.options : defaultBooleanOptions);
  } else if (["select", "multiselect"].includes(form.type)) {
    payload.options = normalizeOptions(form.options);
  }

  return payload;
}

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

function mergeCategoryRequirementCounts(categories, summaries) {
  const countMap = new Map((summaries || []).map((item) => [String(item._id), item]));
  return (categories || []).map((category) => {
    const summary = countMap.get(String(category._id));
    return summary
      ? {
          ...category,
          so_field: summary.so_field ?? summary.so_yc ?? category.so_field ?? 0,
          so_field_active: summary.so_field_active ?? category.so_field_active ?? 0,
        }
      : category;
  });
}

export default function BackendConfigPanel() {
  const [activeTab, setActiveTab] = useState("skills");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [requirements, setRequirements] = useState([]);
  const [skills, setSkills] = useState([]);
  const [levels, setLevels] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [requirementForm, setRequirementForm] = useState(emptyRequirement);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingRequirementId, setEditingRequirementId] = useState("");
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [levelForm, setLevelForm] = useState({ ten_cap_do: "junior", mo_ta: "", luong_mac_dinh_theo_gio: 150000 });
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((item) => item._id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const loadAll = async () => {
    setError("");
    try {
      const [categoryDocs, requirementSummaries, skillDocs, levelDocs] = await Promise.all([
        backendApi.allCategories(),
        backendApi.requirementCategoriesSummary().catch(() => []),
        backendApi.skills(),
        backendApi.levels(),
      ]);
      const categoriesWithCounts = mergeCategoryRequirementCounts(categoryDocs, requirementSummaries);
      setCategories(categoriesWithCounts);
      setSkills(skillDocs);
      setLevels(levelDocs);
      setSelectedCategoryId((current) => (categoriesWithCounts.some((item) => item._id === current) ? current : ""));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được cấu hình backend"));
    }
  };

  const loadRequirements = async (categoryId) => {
    if (!categoryId) {
      setRequirements([]);
      return;
    }

    try {
      setRequirements(await backendApi.requirementsByCategory(categoryId));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được field yêu cầu"));
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadRequirements(selectedCategoryId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message) => setToast(message);

  const setCategoryField = (key, value) => {
    setCategoryForm((prev) => ({
      ...prev,
      [key]: key === "slug" ? cleanSlug(value) : value,
    }));
  };

  const setRequirementField = (key, value) => {
    setRequirementForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setEditingCategoryId("");
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (!categoryForm.slug.trim()) {
      setError("Nhập slug loại dự án");
      return;
    }
    if (!categoryForm.ten_hien_thi.trim()) {
      setError("Nhập tên hiển thị loại dự án");
      return;
    }

    setSaving("category");
    setError("");
    try {
      const payload = {
        ...categoryForm,
        slug: cleanSlug(categoryForm.slug),
        ten_hien_thi: categoryForm.ten_hien_thi.trim(),
        thu_tu: Number(categoryForm.thu_tu) || 0,
        active: Boolean(categoryForm.active),
        base_hours: Number(categoryForm.base_hours) || 8,
        tech_cost_base: Number(categoryForm.tech_cost_base) || 0,
      };
      if (editingCategoryId) await backendApi.updateCategory(editingCategoryId, payload);
      else await backendApi.createCategory(payload);
      notify(editingCategoryId ? "Đã cập nhật loại dự án" : "Đã thêm loại dự án");
      resetCategoryForm();
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được loại dự án"));
    } finally {
      setSaving("");
    }
  };

  const editCategory = (category) => {
    setActiveTab("categories");
    setEditingCategoryId(category._id);
    setCategoryForm({
      slug: category.slug || "",
      ten_hien_thi: category.ten_hien_thi || "",
      mo_ta: category.mo_ta || "",
      icon: category.icon || "",
      thu_tu: category.thu_tu || 1,
      active: category.active !== false,
      base_hours: category.base_hours ?? category.gio_co_ban ?? 8,
      tech_cost_base: category.tech_cost_base ?? 0,
    });
  };

  const toggleCategory = async (category) => {
    setSaving(category._id);
    setError("");
    try {
      await backendApi.toggleCategory(category._id);
      notify("Đã cập nhật trạng thái loại dự án");
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không đổi được trạng thái loại dự án"));
    } finally {
      setSaving("");
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Xóa loại dự án "${category.ten_hien_thi}"?`)) return;
    setSaving(category._id);
    setError("");
    try {
      await backendApi.deleteCategory(category._id);
      if (selectedCategoryId === category._id) setSelectedCategoryId("");
      notify("Đã xóa loại dự án");
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được loại dự án"));
    } finally {
      setSaving("");
    }
  };

  const openRequirementCategory = (category) => {
    setSelectedCategoryId(category._id);
    setRequirementForm(emptyRequirement);
    setEditingRequirementId("");
    setShowRequirementForm(false);
  };

  const openAddRequirement = () => {
    setEditingRequirementId("");
    setRequirementForm({ ...emptyRequirement, thu_tu: requirements.length + 1 });
    setShowRequirementForm(true);
  };

  const closeRequirementForm = () => {
    setRequirementForm(emptyRequirement);
    setEditingRequirementId("");
    setShowRequirementForm(false);
  };

  const saveRequirement = async (event) => {
    event.preventDefault();
    if (!selectedCategoryId) return;
    if (!requirementForm.field_key.trim()) {
      setError("Nhập field key");
      return;
    }
    if (!requirementForm.label.trim()) {
      setError("Nhập label cho field");
      return;
    }

    setSaving("requirement");
    setError("");
    try {
      const payload = normalizeRequirementPayload(requirementForm, selectedCategoryId);
      if (editingRequirementId) await backendApi.updateRequirement(editingRequirementId, payload);
      else await backendApi.createRequirement(payload);
      notify(editingRequirementId ? "Đã cập nhật field yêu cầu" : "Đã thêm field yêu cầu");
      closeRequirementForm();
      await loadRequirements(selectedCategoryId);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được field yêu cầu"));
    } finally {
      setSaving("");
    }
  };

  const editRequirement = (field) => {
    setRequirementForm(requirementToForm(field));
    setEditingRequirementId(field._id);
    setShowRequirementForm(true);
  };

  const toggleRequirement = async (field) => {
    setSaving(field._id);
    setError("");
    try {
      await backendApi.toggleRequirement(field._id);
      await loadRequirements(selectedCategoryId);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không đổi được trạng thái field"));
    } finally {
      setSaving("");
    }
  };

  const deleteRequirement = async (field) => {
    if (!window.confirm(`Xóa yêu cầu "${field.label}"?`)) return;
    setSaving(field._id);
    setError("");
    try {
      await backendApi.deleteRequirement(field._id);
      notify("Đã xóa field yêu cầu");
      await loadRequirements(selectedCategoryId);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được field yêu cầu"));
    } finally {
      setSaving("");
    }
  };

  const moveRequirement = async (field, index, direction) => {
    const neighbor = requirements[index + direction];
    if (!neighbor) return;

    setSaving(field._id);
    setError("");
    try {
      const neighborOrder = Number(neighbor.thu_tu ?? index + direction);
      const nextOrder = direction < 0 ? neighborOrder - 1 : neighborOrder + 1;
      await backendApi.sortRequirement(field._id, nextOrder);
      await loadRequirements(selectedCategoryId);
    } catch (err) {
      setError(getErrorMessage(err, "Không sắp xếp được field"));
    } finally {
      setSaving("");
    }
  };

  const createSkill = async (event) => {
    event.preventDefault();
    if (!skillName.trim()) return;

    setSaving("skill");
    setError("");
    try {
      await backendApi.createSkill({ ten_ky_nang: skillName.trim() });
      setSkillName("");
      notify("Đã thêm kỹ năng");
      setSkills(await backendApi.skills());
    } catch (err) {
      setError(getErrorMessage(err, "Không tạo được kỹ năng"));
    } finally {
      setSaving("");
    }
  };

  const deleteSkill = async (skill) => {
    if (!window.confirm(`Xóa kỹ năng "${skill.ten_ky_nang}"?`)) return;

    setSaving(skill._id);
    setError("");
    try {
      await backendApi.deleteSkill(skill._id);
      setSkills(await backendApi.skills());
    } catch (err) {
      setError(getErrorMessage(err, "Không xóa được kỹ năng"));
    } finally {
      setSaving("");
    }
  };

  const saveLevel = async (event) => {
    event.preventDefault();
    setSaving("level");
    setError("");
    try {
      const existing = levels.find((item) => item.ten_cap_do === levelForm.ten_cap_do);
      const payload = {
        ...levelForm,
        luong_mac_dinh_theo_gio: Number(levelForm.luong_mac_dinh_theo_gio) || 0,
      };
      if (existing) await backendApi.updateLevel(existing._id, payload);
      else await backendApi.createLevel(payload);
      notify("Đã lưu cấp độ");
      setLevels(await backendApi.levels());
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được cấp độ"));
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="settings-backend-grid">
      {toast ? <div className="settings-toast success backend-toast">{toast}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <div className="backend-topbar">
        <div>
          <div className="card-title">Dữ liệu backend</div>
          <div className="card-subtitle">Quản lý các danh mục mà form tạo dự án, nhân sự và engine ước tính đang dùng.</div>
        </div>
        <button className="btn btn-secondary btn-sm ripple" type="button" onClick={loadAll}>
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      <div className="backend-section-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`backend-section-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "skills" && (
        <SkillsSection
          skillName={skillName}
          skills={skills}
          saving={saving}
          onNameChange={setSkillName}
          onCreate={createSkill}
          onDelete={deleteSkill}
        />
      )}

      {activeTab === "levels" && (
        <LevelsSection
          levelForm={levelForm}
          levels={levels}
          saving={saving}
          onFormChange={setLevelForm}
          onSave={saveLevel}
        />
      )}

      {activeTab === "categories" && (
        <CategoriesSection
          categoryForm={categoryForm}
          categories={categories}
          editingCategoryId={editingCategoryId}
          saving={saving}
          onFieldChange={setCategoryField}
          onSave={saveCategory}
          onReset={resetCategoryForm}
          onEdit={editCategory}
          onToggle={toggleCategory}
          onDelete={deleteCategory}
        />
      )}

      {activeTab === "requirements" && (
        <RequirementsSection
          categories={categories}
          selectedCategory={selectedCategory}
          requirements={requirements}
          requirementForm={requirementForm}
          editingRequirementId={editingRequirementId}
          showRequirementForm={showRequirementForm}
          saving={saving}
          onBack={() => {
            setSelectedCategoryId("");
            closeRequirementForm();
          }}
          onSelectCategory={openRequirementCategory}
          onOpenAdd={openAddRequirement}
          onFieldChange={setRequirementField}
          onSave={saveRequirement}
          onCancel={closeRequirementForm}
          onEdit={editRequirement}
          onToggle={toggleRequirement}
          onDelete={deleteRequirement}
          onMove={moveRequirement}
        />
      )}
    </div>
  );
}

function SkillsSection({ skillName, skills, saving, onNameChange, onCreate, onDelete }) {
  return (
    <div className="backend-two-col">
      <form className="card hover-lift backend-sub-card" onSubmit={onCreate}>
        <div className="card-title">Thêm kỹ năng mới</div>
        <div className="card-subtitle">Dùng để gắn vào nhân viên và hỗ trợ phân công theo năng lực.</div>
        <label className="backend-field">
          Tên kỹ năng
          <input className="form-input" value={skillName} onChange={(event) => onNameChange(event.target.value)} placeholder="After Effects, Blender..." />
        </label>
        <button className="btn btn-primary ripple" type="submit" disabled={saving === "skill"}>
          <Plus size={16} /> {saving === "skill" ? "Đang thêm..." : "Thêm kỹ năng"}
        </button>
      </form>

      <div className="card hover-lift backend-sub-card">
        <div className="backend-card-head">
          <div>
            <div className="card-title">Danh sách kỹ năng</div>
            <div className="card-subtitle">{skills.length} kỹ năng đang có trong hệ thống.</div>
          </div>
        </div>
        <div className="backend-chip-list">
          {skills.map((skill) => (
            <span key={skill._id} className="backend-chip">
              {skill.ten_ky_nang}
              <button type="button" onClick={() => onDelete(skill)} disabled={saving === skill._id}>
                x
              </button>
            </span>
          ))}
          {skills.length === 0 ? <div className="backend-empty">Chưa có kỹ năng nào.</div> : null}
        </div>
      </div>
    </div>
  );
}

function LevelsSection({ levelForm, levels, saving, onFormChange, onSave }) {
  return (
    <div className="backend-two-col">
      <form className="card hover-lift backend-sub-card" onSubmit={onSave}>
        <div className="card-title">Cấp độ nhân viên</div>
        <div className="card-subtitle">Lương mặc định theo giờ được dùng khi tạo nhân viên và tính chi phí nhân sự.</div>
        <label className="backend-field">
          Cấp độ
          <select className="form-select" value={levelForm.ten_cap_do} onChange={(event) => onFormChange((prev) => ({ ...prev, ten_cap_do: event.target.value }))}>
            {EMPLOYEE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="backend-field">
          Lương mặc định/giờ
          <input
            type="number"
            min={0}
            step={5000}
            className="form-input"
            value={levelForm.luong_mac_dinh_theo_gio}
            onChange={(event) => onFormChange((prev) => ({ ...prev, luong_mac_dinh_theo_gio: event.target.value }))}
          />
        </label>
        <label className="backend-field">
          Mô tả
          <input className="form-input" value={levelForm.mo_ta} onChange={(event) => onFormChange((prev) => ({ ...prev, mo_ta: event.target.value }))} />
        </label>
        <button className="btn btn-primary ripple" type="submit" disabled={saving === "level"}>
          <Save size={16} /> Lưu cấp độ
        </button>
      </form>

      <div className="card hover-lift backend-sub-card">
        <div className="card-title">Cấp độ hiện tại</div>
        <div className="backend-list-stack">
          {levels.map((level) => (
            <button
              key={level._id}
              className="backend-list-item"
              type="button"
              onClick={() =>
                onFormChange({
                  ten_cap_do: level.ten_cap_do,
                  mo_ta: level.mo_ta || "",
                  luong_mac_dinh_theo_gio: level.luong_mac_dinh_theo_gio || 0,
                })
              }
            >
              <span>
                <strong>{level.ten_cap_do}</strong>
                <small>{level.mo_ta || "Chưa có mô tả"}</small>
              </span>
              <b>{formatVnd(level.luong_mac_dinh_theo_gio)}/h</b>
            </button>
          ))}
          {levels.length === 0 ? <div className="backend-empty">Chưa có cấp độ nhân viên.</div> : null}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({
  categoryForm,
  categories,
  editingCategoryId,
  saving,
  onFieldChange,
  onSave,
  onReset,
  onEdit,
  onToggle,
  onDelete,
}) {
  return (
    <div className="backend-two-col wide-right">
      <form className="card hover-lift backend-sub-card" onSubmit={onSave}>
        <div className="backend-card-head">
          <div>
            <div className="card-title">{editingCategoryId ? "Sửa loại dự án" : "Thêm loại dự án"}</div>
            <div className="card-subtitle">Có cả giờ cơ bản và chi phí kỹ thuật nền để engine ước tính dùng trực tiếp.</div>
          </div>
          {editingCategoryId ? (
            <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onReset}>
              <X size={14} /> Hủy
            </button>
          ) : null}
        </div>

        <div className="backend-form-grid">
          <label className="backend-field">
            Slug
            <input className="form-input" value={categoryForm.slug} onChange={(event) => onFieldChange("slug", event.target.value)} placeholder="video_quang_cao" required />
          </label>
          <label className="backend-field">
            Tên hiển thị
            <input className="form-input" value={categoryForm.ten_hien_thi} onChange={(event) => onFieldChange("ten_hien_thi", event.target.value)} required />
          </label>
          <label className="backend-field">
            Icon
            <input className="form-input" value={categoryForm.icon} onChange={(event) => onFieldChange("icon", event.target.value)} placeholder="🎬" />
          </label>
          <label className="backend-field">
            Thứ tự
            <input type="number" className="form-input" value={categoryForm.thu_tu} onChange={(event) => onFieldChange("thu_tu", event.target.value)} />
          </label>
          <label className="backend-field">
            Giờ cơ bản
            <input type="number" min={1} className="form-input" value={categoryForm.base_hours} onChange={(event) => onFieldChange("base_hours", event.target.value)} />
          </label>
          <label className="backend-field">
            Chi phí kỹ thuật nền
            <input type="number" min={0} step={10000} className="form-input" value={categoryForm.tech_cost_base} onChange={(event) => onFieldChange("tech_cost_base", event.target.value)} />
          </label>
          <label className="backend-field backend-span-2">
            Mô tả
            <textarea className="form-textarea" rows={2} value={categoryForm.mo_ta} onChange={(event) => onFieldChange("mo_ta", event.target.value)} />
          </label>
          <label className="backend-check backend-span-2">
            <input type="checkbox" checked={categoryForm.active} onChange={(event) => onFieldChange("active", event.target.checked)} />
            Đang bật
          </label>
        </div>
        <button className="btn btn-primary ripple" type="submit" disabled={saving === "category"}>
          <Save size={16} /> {editingCategoryId ? "Cập nhật loại dự án" : "Thêm loại dự án"}
        </button>
      </form>

      <div className="card hover-lift backend-sub-card">
        <div className="card-title">Danh sách loại dự án</div>
        <div className="backend-list-stack">
          {categories.map((category) => (
            <div key={category._id} className={`backend-list-item category-item ${category.active === false ? "inactive" : ""}`}>
              <span>
                <strong>
                  {category.icon ? `${category.icon} ` : ""}
                  {category.ten_hien_thi}
                </strong>
                <small>
                  {category.slug} · {Number(category.base_hours ?? category.gio_co_ban ?? 0)}h · kỹ thuật {formatVnd(category.tech_cost_base || 0)}
                </small>
              </span>
              <div className="backend-item-actions">
                <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => onEdit(category)}>
                  <Edit2 size={14} /> Sửa
                </button>
                <button className="btn btn-secondary btn-sm ripple" type="button" onClick={() => onToggle(category)} disabled={saving === category._id}>
                  {category.active === false ? <Eye size={14} /> : <EyeOff size={14} />}
                  {category.active === false ? "Bật" : "Tắt"}
                </button>
                <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => onDelete(category)} disabled={saving === category._id}>
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 ? <div className="backend-empty">Chưa có loại dự án nào.</div> : null}
        </div>
      </div>
    </div>
  );
}

function RequirementsSection({
  categories,
  selectedCategory,
  requirements,
  requirementForm,
  editingRequirementId,
  showRequirementForm,
  saving,
  onBack,
  onSelectCategory,
  onOpenAdd,
  onFieldChange,
  onSave,
  onCancel,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}) {
  if (!selectedCategory) {
    return (
      <div className="card hover-lift backend-sub-card">
        <div className="card-title">Chọn loại dự án</div>
        <div className="card-subtitle">Mỗi loại dự án có bộ field yêu cầu riêng. Chọn một loại để cấu hình chi tiết.</div>
        <div className="requirement-category-grid">
          {categories.map((category) => (
            <button key={category._id} className="req-category-card" type="button" onClick={() => onSelectCategory(category)}>
              <span className="req-category-icon">{category.icon || <List size={20} />}</span>
              <span>
                <strong>{category.ten_hien_thi}</strong>
                <small>{category.slug}</small>
              </span>
              <b>
                {Number(category.so_field ?? category.so_yc ?? 0)} field
                {category.so_field_active !== undefined ? <small>{Number(category.so_field_active || 0)} bật</small> : null}
              </b>
            </button>
          ))}
          {categories.length === 0 ? <div className="backend-empty">Chưa có loại dự án. Hãy tạo ở tab Loại dự án trước.</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="requirements-workspace">
      <div className="requirements-toolbar">
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onBack}>
          <ArrowLeft size={14} /> Quay lại
        </button>
        <div className="requirements-title">
          <strong>
            {selectedCategory.icon ? `${selectedCategory.icon} ` : ""}
            {selectedCategory.ten_hien_thi}
          </strong>
          <span>{requirements.length} field yêu cầu</span>
        </div>
        <button className="btn btn-primary btn-sm ripple" type="button" onClick={onOpenAdd}>
          <Plus size={14} /> Thêm field
        </button>
      </div>

      {showRequirementForm ? (
        <RequirementForm
          form={requirementForm}
          isEditing={Boolean(editingRequirementId)}
          saving={saving === "requirement"}
          onFieldChange={onFieldChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : null}

      <div className="backend-list-stack">
        {requirements.map((field, index) => (
          <RequirementCard
            key={field._id}
            field={field}
            index={index}
            total={requirements.length}
            saving={saving === field._id}
            onEdit={() => onEdit(field)}
            onToggle={() => onToggle(field)}
            onDelete={() => onDelete(field)}
            onMove={(direction) => onMove(field, index, direction)}
          />
        ))}
        {requirements.length === 0 ? (
          <div className="backend-empty large">
            Loại dự án này chưa có field yêu cầu.
            <button className="btn btn-primary btn-sm ripple" type="button" onClick={onOpenAdd}>
              <Plus size={14} /> Thêm field đầu tiên
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RequirementCard({ field, index, total, saving, onEdit, onToggle, onDelete, onMove }) {
  const type = FIELD_TYPES.find((item) => item.value === field.type);

  return (
    <div className={`req-field-card ${field.active === false ? "inactive" : ""}`}>
      <div className="req-sort">
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => onMove(-1)} disabled={index === 0 || saving}>
          <ChevronUp size={14} />
        </button>
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={() => onMove(1)} disabled={index === total - 1 || saving}>
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="req-field-main">
        <div className="req-field-title">
          <strong>{field.label}</strong>
          {field.required ? <span className="req-badge required">Bắt buộc</span> : null}
          <span className="req-badge">{type?.label || field.type}</span>
          {field.active === false ? <span className="req-badge muted">Đang tắt</span> : null}
        </div>
        <div className="req-field-sub">
          {field.field_key}
          {field.hint ? ` · ${field.hint}` : ""}
        </div>
        <FieldDifficultyPreview field={field} />
      </div>
      <div className="backend-item-actions">
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onToggle} disabled={saving}>
          {field.active === false ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onEdit}>
          <Edit2 size={14} />
        </button>
        <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={onDelete} disabled={saving}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function RequirementForm({ form, isEditing, saving, onFieldChange, onSave, onCancel }) {
  const typeInfo = FIELD_TYPES.find((item) => item.value === form.type);

  return (
    <form className="card hover-lift backend-sub-card requirement-form" onSubmit={onSave}>
      <div className="backend-card-head">
        <div>
          <div className="card-title">{isEditing ? "Sửa field yêu cầu" : "Thêm field yêu cầu"}</div>
          <div className="card-subtitle">{typeInfo?.desc}</div>
        </div>
        <button className="btn btn-ghost btn-sm ripple" type="button" onClick={onCancel}>
          <X size={14} /> Hủy
        </button>
      </div>

      <div className="backend-form-grid">
        <label className="backend-field">
          Field key
          <input
            className="form-input"
            value={form.field_key}
            onChange={(event) => onFieldChange("field_key", cleanSlug(event.target.value))}
            placeholder="so_luong_video"
            required
          />
        </label>
        <label className="backend-field">
          Label
          <input className="form-input" value={form.label} onChange={(event) => onFieldChange("label", event.target.value)} placeholder="Số lượng video" required />
        </label>
        <label className="backend-field">
          Loại field
          <select className="form-select" value={form.type} onChange={(event) => onFieldChange("type", event.target.value)}>
            {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="backend-field">
          Thứ tự
          <input type="number" min={0} className="form-input" value={form.thu_tu} onChange={(event) => onFieldChange("thu_tu", event.target.value)} />
        </label>
        <label className="backend-field backend-span-2">
          Hint / mô tả
          <textarea className="form-textarea" rows={2} value={form.hint} onChange={(event) => onFieldChange("hint", event.target.value)} />
        </label>
        <div className="field-switches backend-span-2">
          <label className="backend-check">
            <input type="checkbox" checked={form.required} onChange={(event) => onFieldChange("required", event.target.checked)} />
            Bắt buộc
          </label>
          <label className="backend-check">
            <input type="checkbox" checked={form.active} onChange={(event) => onFieldChange("active", event.target.checked)} />
            Đang bật
          </label>
        </div>
      </div>

      {form.type === "number" ? (
        <NumberConfig
          minValue={form.min_value}
          maxValue={form.max_value}
          ranges={form.cau_hinh_do_kho_number}
          onMinValue={(value) => onFieldChange("min_value", value)}
          onMaxValue={(value) => onFieldChange("max_value", value)}
          onRangesChange={(ranges) => onFieldChange("cau_hinh_do_kho_number", ranges)}
        />
      ) : null}

      {form.type === "select" ? <OptionsConfig options={form.options} onOptionsChange={(options) => onFieldChange("options", options)} /> : null}

      {form.type === "multiselect" ? (
        <OptionsConfig
          isMulti
          options={form.options}
          multiRule={form.multiselect_rule}
          onMultiRuleChange={(value) => onFieldChange("multiselect_rule", value)}
          onOptionsChange={(options) => onFieldChange("options", options)}
        />
      ) : null}

      {form.type === "boolean" ? <BooleanConfig options={form.options} onOptionsChange={(options) => onFieldChange("options", options)} /> : null}

      <FieldDifficultyPreview field={form} />

      <div className="backend-form-actions">
        <button className="btn btn-primary ripple" type="submit" disabled={saving}>
          <Save size={16} /> {saving ? "Đang lưu..." : "Lưu field"}
        </button>
        <button className="btn btn-ghost ripple" type="button" onClick={onCancel}>
          <X size={16} /> Hủy
        </button>
      </div>
    </form>
  );
}

function NumberConfig({ minValue, maxValue, ranges, onMinValue, onMaxValue, onRangesChange }) {
  const addRange = () => {
    const last = ranges[ranges.length - 1];
    onRangesChange([
      ...ranges,
      {
        min: last ? Number(last.max) + 1 : 1,
        max: last ? Number(last.max) + 10 : 10,
        muc_do: "de",
        diem: 1,
      },
    ]);
  };

  const updateRange = (index, key, value) => {
    onRangesChange(
      ranges.map((range, current) => {
        if (current !== index) return range;
        if (key === "muc_do") {
          const diem = DIFFICULTY_OPTIONS.find((item) => item.value === value)?.diem || 1;
          return { ...range, muc_do: value, diem };
        }
        return { ...range, [key]: value };
      }),
    );
  };

  const removeRange = (index) => onRangesChange(ranges.filter((_, current) => current !== index));

  return (
    <div className="field-config-box">
      <div className="field-config-head">
        <strong>Cấu hình khoảng độ khó</strong>
        <button className="btn btn-secondary btn-sm ripple" type="button" onClick={addRange}>
          <Plus size={14} /> Thêm khoảng
        </button>
      </div>
      <div className="backend-form-grid compact">
        <label className="backend-field">
          Giá trị min cho phép
          <input type="number" className="form-input" value={minValue ?? ""} onChange={(event) => onMinValue(event.target.value)} placeholder="Không giới hạn" />
        </label>
        <label className="backend-field">
          Giá trị max cho phép
          <input type="number" className="form-input" value={maxValue ?? ""} onChange={(event) => onMaxValue(event.target.value)} placeholder="Không giới hạn" />
        </label>
      </div>
      <div className="config-row-list">
        {ranges.map((range, index) => (
          <div key={`${index}-${range.min}-${range.max}`} className="number-range-row">
            <label>
              Min
              <input type="number" className="form-input" value={range.min} onChange={(event) => updateRange(index, "min", event.target.value)} />
            </label>
            <label>
              Max
              <input type="number" className="form-input" value={range.max} onChange={(event) => updateRange(index, "max", event.target.value)} />
            </label>
            <DifficultySelect value={range.muc_do} onChange={(value) => updateRange(index, "muc_do", value)} />
            <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => removeRange(index)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {ranges.length === 0 ? <div className="backend-empty">Chưa cấu hình khoảng độ khó cho field số.</div> : null}
      </div>
    </div>
  );
}

function OptionsConfig({ options, onOptionsChange, isMulti = false, multiRule = "max", onMultiRuleChange }) {
  const addOption = () => onOptionsChange([...options, { value: "", label: "", muc_do: "de", diem: 1 }]);
  const removeOption = (index) => onOptionsChange(options.filter((_, current) => current !== index));
  const updateOption = (index, key, value) => {
    onOptionsChange(
      options.map((option, current) => {
        if (current !== index) return option;
        if (key === "muc_do") {
          const diem = DIFFICULTY_OPTIONS.find((item) => item.value === value)?.diem || 1;
          return { ...option, muc_do: value, diem };
        }
        return { ...option, [key]: value };
      }),
    );
  };

  return (
    <div className="field-config-box">
      <div className="field-config-head">
        <strong>Các lựa chọn và độ khó</strong>
        <button className="btn btn-secondary btn-sm ripple" type="button" onClick={addOption}>
          <Plus size={14} /> Thêm lựa chọn
        </button>
      </div>
      {isMulti ? (
        <label className="backend-field multiselect-rule">
          Quy tắc tổng hợp khi chọn nhiều
          <select className="form-select" value={multiRule} onChange={(event) => onMultiRuleChange(event.target.value)}>
            <option value="max">Lấy mức cao nhất</option>
            <option value="average">Lấy trung bình</option>
            <option value="sum">Cộng tất cả</option>
          </select>
        </label>
      ) : null}
      <div className="config-row-list">
        {options.map((option, index) => (
          <div key={`${index}-${option.value}`} className="option-editor-row">
            <label>
              Value
              <input className="form-input" value={option.value ?? ""} onChange={(event) => updateOption(index, "value", event.target.value)} placeholder="4k" />
            </label>
            <label>
              Nhãn hiển thị
              <input className="form-input" value={option.label ?? ""} onChange={(event) => updateOption(index, "label", event.target.value)} placeholder="4K" />
            </label>
            <DifficultySelect value={option.muc_do} onChange={(value) => updateOption(index, "muc_do", value)} />
            <button className="btn btn-ghost btn-sm ripple danger-text" type="button" onClick={() => removeOption(index)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {options.length === 0 ? <div className="backend-empty">Chưa có lựa chọn nào.</div> : null}
      </div>
    </div>
  );
}

function BooleanConfig({ options, onOptionsChange }) {
  const trueOption = options.find((option) => String(option.value) === "true") || defaultBooleanOptions[0];
  const falseOption = options.find((option) => String(option.value) === "false") || defaultBooleanOptions[1];

  const update = (key, mucDo) => {
    const diem = DIFFICULTY_OPTIONS.find((item) => item.value === mucDo)?.diem || 1;
    onOptionsChange([
      key === "true" ? { ...trueOption, muc_do: mucDo, diem } : trueOption,
      key === "false" ? { ...falseOption, muc_do: mucDo, diem } : falseOption,
    ]);
  };

  return (
    <div className="field-config-box">
      <div className="field-config-head">
        <strong>Cấu hình Có / Không</strong>
      </div>
      <div className="boolean-config-grid">
        <div className="boolean-row">
          <span>Có</span>
          <DifficultySelect value={trueOption.muc_do} onChange={(value) => update("true", value)} />
        </div>
        <div className="boolean-row">
          <span>Không</span>
          <DifficultySelect value={falseOption.muc_do} onChange={(value) => update("false", value)} />
        </div>
      </div>
    </div>
  );
}

function DifficultySelect({ value, onChange }) {
  return (
    <label className="difficulty-select">
      Độ khó
      <select className="form-select" value={value || "de"} onChange={(event) => onChange(event.target.value)}>
        {DIFFICULTY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.diem} điểm)
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldDifficultyPreview({ field }) {
  const ranges = field.cau_hinh_do_kho_number || [];
  const options = field.options || [];

  if (field.type === "number" && ranges.length > 0) {
    return (
      <div className="difficulty-preview">
        {ranges.map((range, index) => (
          <span key={`${range.min}-${range.max}-${index}`}>
            {range.min}-{range.max}: {DIFFICULTY_LABELS[range.muc_do] || range.muc_do}
          </span>
        ))}
      </div>
    );
  }

  if (["select", "multiselect", "boolean"].includes(field.type) && options.length > 0) {
    return (
      <div className="difficulty-preview">
        {options.map((option, index) => (
          <span key={`${option.value}-${index}`}>
            {String(option.label || option.value)}: {DIFFICULTY_LABELS[option.muc_do] || option.muc_do}
          </span>
        ))}
      </div>
    );
  }

  return null;
}
