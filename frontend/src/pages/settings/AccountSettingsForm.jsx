import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, Sparkles, Upload, UserRound } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { assetUrl, authApi, getErrorMessage } from "../../services/api";
import "../../styles/pages/settings/AccountSettingsForm.css";

const emptyAccount = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  location: "",
  timezone: "GMT+7",
  bio: "",
  avatar: "",
  avatarUrl: "",
  twoFactorEnabled: false,
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const roleLabels = {
  admin: "Admin",
  manager: "Manager",
  employee: "Staff",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function accountFromUser(user) {
  return {
    ...emptyAccount,
    fullName: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: roleLabels[user?.backendRole] || user?.backendRole || user?.role || "",
    department: user?.department || "",
    location: user?.location || "",
    timezone: user?.timezone || "GMT+7",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
    avatarUrl: user?.avatarUrl || "",
    twoFactorEnabled: Boolean(user?.twoFactorEnabled),
  };
}

export default function AccountSettingsForm() {
  const { refreshMe } = useAuth();
  const [account, setAccount] = useState(emptyAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const summary = useMemo(() => {
    const parts = [account.role, account.department].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Tài khoản hệ thống";
  }, [account.role, account.department]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      authApi
        .me()
        .then((user) => {
          if (!cancelled) setAccount(accountFromUser(user));
        })
        .catch((err) => {
          if (!cancelled) showToast("error", getErrorMessage(err, "Không tải được tài khoản"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showToast]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleChange = (field, value) => {
    setAccount((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    const errors = [];

    if (!account.fullName.trim()) errors.push("Vui lòng nhập họ và tên.");
    if (!emailPattern.test(account.email.trim())) errors.push("Email chưa đúng định dạng.");
    if (account.phone.trim() && account.phone.trim().length < 8) errors.push("Số điện thoại cần tối thiểu 8 ký tự.");

    const hasPasswordInput = account.currentPassword || account.newPassword || account.confirmPassword;
    if (hasPasswordInput) {
      if (!account.currentPassword) errors.push("Nhập mật khẩu hiện tại để đổi mật khẩu.");
      if (account.newPassword.length < 8) errors.push("Mật khẩu mới phải có ít nhất 8 ký tự.");
      if (!/[a-zA-Z]/.test(account.newPassword) || !/[0-9]/.test(account.newPassword)) errors.push("Mật khẩu mới phải chứa cả chữ và số.");
      if (account.newPassword !== account.confirmPassword) errors.push("Mật khẩu mới và xác nhận chưa khớp.");
    }

    return errors;
  };

  const handleAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("error", "Avatar chỉ hỗ trợ PNG, JPG hoặc WEBP.");
      return;
    }
    if (file.size > 1024 * 1024) {
      showToast("error", "Avatar tối đa 1MB để tránh lưu quá nhiều dữ liệu.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const updatedUser = await authApi.uploadAvatar(file);
      setAccount((current) => ({ ...current, ...accountFromUser(updatedUser) }));
      await refreshMe();
      showToast("success", "Đã cập nhật avatar.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không upload được avatar"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();

    if (errors.length > 0) {
      showToast("error", errors[0]);
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await authApi.updateProfile({
        ho_ten: account.fullName,
        email: account.email,
        phone: account.phone,
        department: account.department,
        location: account.location,
        timezone: account.timezone,
        bio: account.bio,
        two_factor_enabled: account.twoFactorEnabled,
      });

      if (account.currentPassword || account.newPassword || account.confirmPassword) {
        await authApi.changePassword(account.currentPassword, account.newPassword);
      }

      setAccount({
        ...accountFromUser(updatedUser),
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await refreshMe();
      showToast("success", "Đã lưu account từ dữ liệu backend.");
    } catch (err) {
      showToast("error", getErrorMessage(err, "Không lưu được account"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card account-card">
      <div className="account-toast-area" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`account-toast ${toast.type}`}>
            <Sparkles size={14} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>

      <div className="card-title" style={{ display: "flex", gap: 8 }}>
        <UserRound size={18} color="#667eea" /> Account chi tiết
      </div>
      <div className="card-divider" />

      {loading ? (
        <div className="account-loading">Đang tải account từ backend...</div>
      ) : (
        <form id="account-settings-form" className="account-form" onSubmit={handleSubmit}>
          <div className="account-header">
            <div className={`account-avatar ${account.avatarUrl ? "has-image" : ""}`}>
              {account.avatarUrl ? <img src={assetUrl(account.avatarUrl)} alt={account.fullName || "Avatar"} /> : account.avatar || account.fullName.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="account-header-meta">
              <strong>{account.fullName || "Chưa đặt tên"}</strong>
              <span>{summary}</span>
              {account.username ? <small>@{account.username}</small> : null}
            </div>
            <input ref={fileInputRef} className="account-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarSelected} />
            <button className="btn btn-secondary btn-sm account-upload-btn" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
              <Upload size={14} /> {uploadingAvatar ? "Đang upload..." : "Đổi avatar"}
            </button>
          </div>

          <div className="account-grid">
            <label className="setting-group">
              <span>Họ và tên</span>
              <div className="input-wrapper input-prefix">
                <UserRound size={14} />
                <input value={account.fullName} onChange={(event) => handleChange("fullName", event.target.value)} />
              </div>
            </label>
            <label className="setting-group">
              <span>Email</span>
              <div className="input-wrapper input-prefix">
                <Mail size={14} />
                <input value={account.email} onChange={(event) => handleChange("email", event.target.value)} />
              </div>
            </label>
            <label className="setting-group">
              <span>Số điện thoại</span>
              <div className="input-wrapper input-prefix">
                <Phone size={14} />
                <input value={account.phone} onChange={(event) => handleChange("phone", event.target.value)} />
              </div>
            </label>
            <label className="setting-group">
              <span>Địa điểm</span>
              <div className="input-wrapper input-prefix">
                <MapPin size={14} />
                <input value={account.location} onChange={(event) => handleChange("location", event.target.value)} />
              </div>
            </label>
            <label className="setting-group">
              <span>Phòng ban</span>
              <div className="input-wrapper input-prefix">
                <ShieldCheck size={14} />
                <input value={account.department} onChange={(event) => handleChange("department", event.target.value)} />
              </div>
            </label>
            <label className="setting-group">
              <span>Timezone</span>
              <div className="input-wrapper input-prefix">
                <ClockIcon />
                <input value={account.timezone} onChange={(event) => handleChange("timezone", event.target.value)} />
              </div>
            </label>
          </div>

          <label className="setting-group">
            <span>Giới thiệu ngắn</span>
            <textarea className="account-textarea" rows={4} value={account.bio} onChange={(event) => handleChange("bio", event.target.value)} />
          </label>

          <div className="account-password-card">
            <div className="account-password-title">
              <LockKeyhole size={15} /> Đổi mật khẩu
            </div>
            <div className="account-password-grid">
              <label>
                <span>Mật khẩu hiện tại</span>
                <div className="input-wrapper input-prefix">
                  <LockKeyhole size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={account.currentPassword}
                    onChange={(event) => handleChange("currentPassword", event.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </label>
              <label>
                <span>Mật khẩu mới</span>
                <div className="input-wrapper input-prefix">
                  <LockKeyhole size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={account.newPassword}
                    onChange={(event) => handleChange("newPassword", event.target.value)}
                    placeholder="Ít nhất 8 ký tự, có chữ và số"
                  />
                </div>
              </label>
              <label>
                <span>Xác nhận mật khẩu</span>
                <div className="input-wrapper input-prefix">
                  <LockKeyhole size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={account.confirmPassword}
                    onChange={(event) => handleChange("confirmPassword", event.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </label>
            </div>
            <div className="account-password-footer">
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              </button>
              <button className="account-2fa" type="button" onClick={() => handleChange("twoFactorEnabled", !account.twoFactorEnabled)}>
                <span>Xác thực 2 lớp</span>
                <div className={`toggle-switch ${account.twoFactorEnabled ? "on" : ""}`}>
                  <div className="toggle-knob" />
                </div>
              </button>
            </div>
          </div>

          <div className="account-actions">
            <div className="account-meta-note">Username và vai trò do backend quản lý, không sửa trực tiếp tại form này.</div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.3V7.4L9.2 8.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
