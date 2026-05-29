import { useOutletContext } from "react-router-dom";
import { Lock } from "lucide-react";

export default function RoleGate({
  allow = [],
  title = "Không có quyền truy cập",
  subtitle = "Trang này bị giới hạn theo phân quyền tài khoản.",
}) {
  const { currentUser } = useOutletContext();
  const ok = allow.length === 0 || allow.includes(currentUser?.role);

  if (ok) return null;

  return (
    <div className="page">
      <div className="card hover-lift reveal is-visible" data-reveal style={{ maxWidth: 840, margin: "0 auto" }}>
        <div className="card-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Lock size={16} /> {title}
        </div>
        <div className="card-subtitle">{subtitle}</div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ color: "#334155", lineHeight: 1.5 }}>
            Role hiện tại: <strong>{currentUser?.backendRole || currentUser?.role}</strong>
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Role được lấy từ JWT backend sau khi đăng nhập.</div>
        </div>
      </div>
    </div>
  );
}
