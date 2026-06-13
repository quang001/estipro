import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BellRing,
  Blend,
  CreditCard,
  Database,
  Fingerprint,
  Lock,
  LockKeyhole,
  Save,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import AccountSettingsForm from "./AccountSettingsForm";
import BackendConfigPanel from "./BackendConfigPanel";
import { ROLES, backendApi, getErrorMessage } from "../../services/api";
import "../../styles/pages/settings/SettingsPage.css";

const InputField = ({ label, value, onChange, step, unit, disabled }) => (
  <div className={`setting-group ${disabled ? "is-disabled" : ""}`}>
    <label>{label}</label>
    <div className="input-wrapper">
      <input type="number" step={step} value={value} onChange={onChange} disabled={disabled} />
      {unit && <span className="unit">{unit}</span>}
    </div>
  </div>
);

function SettingToggle({ label, value, onChange, disabled }) {
  return (
    <div className={`toggle-row ${disabled ? "is-disabled" : ""}`}>
      <span>{label}</span>
      <div
        className={`toggle-switch ${value ? "on" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => (disabled ? undefined : onChange(!value))}
        role="switch"
        aria-checked={value}
      >
        <div className="toggle-knob" />
      </div>
    </div>
  );
}

function LockPill({ text }) {
  return (
    <div className="settings-lock-pill" title={text}>
      <Lock size={14} />
      <span>{text}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser } = useOutletContext();
  const role = currentUser?.role || ROLES.STAFF;

  const [activeTab, setActiveTab] = useState("account");
  const [toast, setToast] = useState(null);
  const [saved, setSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [settings, setSettings] = useState({
    // Finance (SUPER_ADMIN)
    profitMargin: 25,
    // HR rules (SUPER_ADMIN)
    bonusDeltaUp: 2,
    bonusDeltaDown: 2,
    promotionThreshold: 200,
    demotionZeroStar: 5,
    // Workflow (MANAGER+)
    dailyReview: true,
    maxReviewRounds: 2,
    aiRiskThreshold: 65,
    autoAssign: true,
    // Personal (ALL)
    compactMode: false,
    reduceMotion: false,
    weeklyDigest: true,
    clientStatusEmails: true,
  });

  const [notifs, setNotifs] = useState({
    projectCreated: true,
    budgetOver: true,
    aiRisk: true,
    deadlineReminder: false,
    weeklyReport: true,
    commentMention: true,
  });

  const tabs = useMemo(
    () => [
      { id: "account", label: "Account", icon: <UserRound size={16} />, allow: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CLIENT] },
      { id: "notifications", label: "Thông báo", icon: <BellRing size={16} />, allow: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CLIENT] },
      { id: "appearance", label: "Giao diện", icon: <Blend size={16} />, allow: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CLIENT] },
      { id: "backend", label: "Dữ liệu backend", icon: <Database size={16} />, allow: [ROLES.SUPER_ADMIN] },
      { id: "workflow", label: "Workflow", icon: <Settings2 size={16} />, allow: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { id: "finance", label: "Tài chính", icon: <CreditCard size={16} />, allow: [ROLES.SUPER_ADMIN] },
      { id: "security", label: "Bảo mật", icon: <Fingerprint size={16} />, allow: [ROLES.SUPER_ADMIN] },
    ],
    [],
  );

  const effectiveTab = useMemo(() => {
    const current = tabs.find((t) => t.id === activeTab);
    if (current && current.allow.includes(role)) return activeTab;
    const firstAllowed = tabs.find((t) => t.allow.includes(role));
    return firstAllowed?.id || "account";
  }, [activeTab, role, tabs]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    backendApi
      .systemSettings()
      .then((data) => {
        if (!cancelled) setSettings((current) => ({ ...current, ...data }));
      })
      .catch((err) => {
        if (!cancelled) setToast({ type: "lock", msg: getErrorMessage(err, "Không tải được cài đặt hệ thống") });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (effectiveTab === "finance") {
      setSavingSettings(true);
      try {
        const savedSettings = await backendApi.updateSystemSettings(settings);
        setSettings((current) => ({ ...current, ...savedSettings }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setToast({ type: "success", msg: "Đã lưu cài đặt hệ thống." });
      } catch (err) {
        setToast({ type: "lock", msg: getErrorMessage(err, "Không lưu được cài đặt hệ thống") });
      } finally {
        setSavingSettings(false);
      }
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setToast({ type: "success", msg: "Đã lưu cài đặt giao diện." });
  };

  // Hàm Helper giúp thay đổi state gọn gàng hơn
  const handleSettingChange = (field, val) => {
    setSettings((s) => ({ ...s, [field]: parseFloat(val) || 0 }));
  };

  const denyTabClick = (tab) => {
    setToast({
      type: "lock",
      msg:
        tab.id === "finance"
          ? "Tab Tài chính chỉ dành cho SUPER_ADMIN."
          : tab.id === "security"
            ? "Tab Bảo mật nâng cao chỉ dành cho SUPER_ADMIN."
            : tab.id === "workflow"
              ? "Tab Workflow chỉ dành cho MANAGER/SUPER_ADMIN."
              : "Tab này bị giới hạn theo role.",
    });
  };

  return (
    <div className="page">
      <div className="page-header settings-header">
        <div>
          <h1 className="page-title">Cài đặt</h1>
          <p className="page-subtitle">
            Role hiện tại: <strong>{role}</strong> · Tab bị giới hạn sẽ xám + có icon khóa
          </p>
        </div>
        <button
          className={`btn ${saved && effectiveTab !== "account" ? "btn-secondary" : "btn-primary"} ripple`}
          type={effectiveTab === "account" ? "submit" : "button"}
          form={effectiveTab === "account" ? "account-settings-form" : undefined}
          onClick={effectiveTab === "account" ? undefined : handleSave}
          disabled={savingSettings}
          style={{ width: 160, justifyContent: "center" }}
        >
          {savingSettings ? "Đang lưu..." : saved && effectiveTab !== "account" ? "✓ Đã lưu" : (<><Save size={16} /> Lưu thay đổi</>)}
        </button>
      </div>

      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          <Sparkles size={14} />
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="settings-shell">
        <aside className="settings-tabs card hover-lift reveal is-visible" data-reveal>
          <div className="settings-tabs-title">
            <ShieldCheck size={16} /> Settings Center
          </div>
          <div className="settings-tabs-list">
            {tabs.map((tab) => {
              const locked = !tab.allow.includes(role);
              const active = effectiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`settings-tab-btn ${active ? "active" : ""} ${locked ? "locked" : ""} btn ripple`}
                  type="button"
                  onClick={() => (locked ? denyTabClick(tab) : setActiveTab(tab.id))}
                >
                  <span className="settings-tab-icon">{tab.icon}</span>
                  <span className="settings-tab-text">{tab.label}</span>
                  <span className="settings-tab-right">{locked ? <LockKeyhole size={14} /> : <span className="settings-dot" />}</span>
                </button>
              );
            })}
          </div>
          <div className="settings-tabs-foot">
            {role === ROLES.MANAGER && <LockPill text="Manager: xem & chỉnh Workflow, không chạm Finance/Security" />}
            {role === ROLES.STAFF && <LockPill text="Staff: ưu tiên Account/Thông báo/Giao diện" />}
            {role === ROLES.CLIENT && <LockPill text="Client: chỉ thấy phần liên quan Portal/Thông báo" />}
            {role === ROLES.SUPER_ADMIN && <LockPill text="SUPER_ADMIN: full access" />}
          </div>
        </aside>

        <section className="settings-content">
          {effectiveTab === "account" && <AccountSettingsForm />}

          {effectiveTab === "notifications" && (
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <BellRing size={18} color="#f97316" /> Thông báo
              </div>
              <div className="card-subtitle">Cá nhân hóa cảnh báo để không bỏ lỡ pipeline quan trọng</div>
              <div className="card-divider" />

              <SettingToggle label="Dự án mới được tạo" value={notifs.projectCreated} onChange={(v) => setNotifs((n) => ({ ...n, projectCreated: v }))} />
              <SettingToggle label="Cảnh báo vượt ngân sách" value={notifs.budgetOver} onChange={(v) => setNotifs((n) => ({ ...n, budgetOver: v }))} disabled={role === ROLES.CLIENT} />
              <SettingToggle label="AI Risk Alert" value={notifs.aiRisk} onChange={(v) => setNotifs((n) => ({ ...n, aiRisk: v }))} />
              <SettingToggle label="Nhắc deadline" value={notifs.deadlineReminder} onChange={(v) => setNotifs((n) => ({ ...n, deadlineReminder: v }))} />
              <SettingToggle label="Báo cáo tuần" value={notifs.weeklyReport} onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))} disabled={role === ROLES.CLIENT} />
              <SettingToggle label="Mention/Comment" value={notifs.commentMention} onChange={(v) => setNotifs((n) => ({ ...n, commentMention: v }))} />

              {role === ROLES.CLIENT && (
                <div className="settings-note">
                  <Lock size={14} /> Một số loại thông báo nội bộ (ngân sách/finance) bị khóa với Client.
                </div>
              )}
            </div>
          )}

          {effectiveTab === "appearance" && (
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <Blend size={18} color="#4facfe" /> Giao diện & Trải nghiệm
              </div>
              <div className="card-subtitle">Tinh chỉnh UI theo thói quen làm việc (Liquid UI)</div>
              <div className="card-divider" />

              <div className="settings-split">
                <div className="settings-mini card hover-lift">
                  <div className="settings-mini-title">
                    <Sliders size={16} /> Cá nhân hóa
                  </div>
                  <SettingToggle label="Compact mode" value={settings.compactMode} onChange={(v) => setSettings((s) => ({ ...s, compactMode: v }))} />
                  <SettingToggle label="Reduce motion" value={settings.reduceMotion} onChange={(v) => setSettings((s) => ({ ...s, reduceMotion: v }))} />
                  <SettingToggle label="Weekly digest (email)" value={settings.weeklyDigest} onChange={(v) => setSettings((s) => ({ ...s, weeklyDigest: v }))} />
                </div>

                <div className="settings-mini card hover-lift">
                  <div className="settings-mini-title">
                    <Sparkles size={16} /> Client portal
                  </div>
                  <SettingToggle
                    label="Gửi email trạng thái dự án"
                    value={settings.clientStatusEmails}
                    onChange={(v) => setSettings((s) => ({ ...s, clientStatusEmails: v }))}
                    disabled={role === ROLES.STAFF}
                  />
                  <div className="settings-mini-hint">Staff không bật email portal (chỉ Manager/Admin).</div>
                </div>
              </div>
            </div>
          )}

          {effectiveTab === "backend" && <BackendConfigPanel />}

          {effectiveTab === "workflow" && (
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <Settings2 size={18} color="#8b5cf6" /> Workflow (Manager/Admin)
              </div>
              <div className="card-subtitle">Quy tắc review, auto-assign và ngưỡng AI Risk để điều phối dự án</div>
              <div className="card-divider" />

              <SettingToggle label="Daily review panel" value={settings.dailyReview} onChange={(v) => setSettings((s) => ({ ...s, dailyReview: v }))} />
              <SettingToggle label="Auto-assign theo skill" value={settings.autoAssign} onChange={(v) => setSettings((s) => ({ ...s, autoAssign: v }))} />
              <InputField
                label="Số vòng review tối đa"
                value={settings.maxReviewRounds}
                onChange={(e) => setSettings((s) => ({ ...s, maxReviewRounds: parseInt(e.target.value || "0", 10) }))}
                step={1}
                unit="vòng"
              />
              <InputField
                label="AI Risk Threshold"
                value={settings.aiRiskThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, aiRiskThreshold: parseInt(e.target.value || "0", 10) }))}
                step={1}
                unit="%"
              />

              <div className="settings-note">
                <Lock size={14} /> Tab Workflow chỉ có trên MANAGER/SUPER_ADMIN (role khác sẽ thấy bị khóa ở menu).
              </div>
            </div>
          )}

          {effectiveTab === "finance" && (
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <CreditCard size={18} color="#10b981" /> Tai chinh & HR Rules
              </div>
              <div className="card-subtitle">Thiet lap ti le loi nhuan mac dinh va quy tac diem nhan su (SUPER_ADMIN)</div>
              <div className="card-divider" />

              <div className="settings-split">
                <div className="card hover-lift settings-mini">
                  <div className="settings-mini-title">
                    <CreditCard size={16} /> Tai chinh
                  </div>
                  <InputField label="Profit margin target" value={settings.profitMargin} onChange={(e) => handleSettingChange("profitMargin", e.target.value)} step={1} unit="%" />
                </div>

                <div className="card hover-lift settings-mini">
                  <div className="settings-mini-title">
                    <Target size={16} /> HR Rules
                  </div>
                  <InputField label="Bonus Delta Tang" value={settings.bonusDeltaUp} onChange={(e) => handleSettingChange("bonusDeltaUp", e.target.value)} step={1} unit="diem" />
                  <InputField label="Bonus Delta Giam" value={settings.bonusDeltaDown} onChange={(e) => handleSettingChange("bonusDeltaDown", e.target.value)} step={1} unit="diem" />
                  <InputField label="Thang chuc" value={settings.promotionThreshold} onChange={(e) => handleSettingChange("promotionThreshold", e.target.value)} step={50} unit="diem" />
                </div>
              </div>

              <div className="cost-preview">
                <div className="preview-box green">
                  <div className="val">{settings.profitMargin}%</div>
                  <div className="lbl">Muc tieu loi nhuan</div>
                </div>
                <div className="preview-box blue">
                  <div className="val">{settings.promotionThreshold}</div>
                  <div className="lbl">Diem len cap</div>
                </div>
              </div>
            </div>
          )}

          {effectiveTab === "security" && (
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <Fingerprint size={18} color="#0ea5e9" /> Bảo mật & RBAC
              </div>
              <div className="card-subtitle">Audit log, khóa truy cập, và chính sách tài khoản (SUPER_ADMIN)</div>
              <div className="card-divider" />

              <div className="settings-split">
                <div className="settings-mini card hover-lift">
                  <div className="settings-mini-title">
                    <LockKeyhole size={16} /> Session
                  </div>
                  <SettingToggle label="Bắt buộc 2FA cho Admin" value={true} onChange={() => undefined} />
                  <SettingToggle label="Auto logout sau 30 phút" value={true} onChange={() => undefined} />
                  <div className="settings-mini-hint">Mock UI (tích hợp thật sẽ nằm backend).</div>
                </div>
                <div className="settings-mini card hover-lift">
                  <div className="settings-mini-title">
                    <ShieldCheck size={16} /> RBAC Policies
                  </div>
                  <div className="settings-policy">
                    <div className="settings-policy-row">
                      <strong>SUPER_ADMIN</strong>
                      <span>Full</span>
                    </div>
                    <div className="settings-policy-row">
                      <strong>MANAGER</strong>
                      <span>Workflow/Reports/Projects</span>
                    </div>
                    <div className="settings-policy-row">
                      <strong>STAFF</strong>
                      <span>Tasks/Personal</span>
                    </div>
                    <div className="settings-policy-row">
                      <strong>CLIENT</strong>
                      <span>Portal/Marketing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
