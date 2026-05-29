import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, AtSign, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getErrorMessage } from "../../services/api";
import "../../styles/pages/auth/LoginPage.css";

export default function LoginPage() {
  const { login, isAuthenticated, booting } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (!booting && isAuthenticated) navigate(from, { replace: true });
  }, [booting, from, isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-panel">
        <section className="login-marketing">
          <div className="brand-chip">
            <ShieldCheck size={14} /> EstiPro Admin
          </div>
          <h1>Đăng nhập hệ thống quản lý dự án.</h1>
          <p>Phiên đăng nhập dùng JWT từ backend. Các màn hình dashboard, dự án, nhân sự và báo cáo sẽ tải dữ liệu trực tiếp từ API.</p>

          <div className="login-points">
            <div className="login-point">
              <ShieldCheck size={16} /> admin / admin123
            </div>
            <div className="login-point">
              <LockKeyhole size={16} /> manager / manager123
            </div>
            <div className="login-point">
              <AtSign size={16} /> Backend mặc định: http://localhost:5000
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-header">
            <div>
              <h2>Đăng nhập</h2>
              <p>Nhập username và mật khẩu đã seed trong backend.</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Username
              <div className="login-input-wrap">
                <AtSign size={16} />
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" autoComplete="username" />
              </div>
            </label>

            <label>
              Mật khẩu
              <div className="login-input-wrap">
                <LockKeyhole size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện mật khẩu">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={submitting || !username.trim() || !password}>
              {submitting ? "Đang đăng nhập..." : "Vào dashboard"}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
