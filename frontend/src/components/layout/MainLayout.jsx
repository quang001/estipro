import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart2,
  Bell,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { ROLES, assetUrl, backendApi, formatDate, formatVnd, getErrorMessage } from "../../services/api";
import "../../styles/layout/MainLayout.css";

function setRippleFromEvent(event) {
  const target = event.target?.closest?.(".btn.ripple");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left;
  const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top;
  target.style.setProperty("--ripple-x", `${x}px`);
  target.style.setProperty("--ripple-y", `${y}px`);
}

export default function MainLayout() {
  const { user: currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  const allNavItems = useMemo(
    () => [
      { key: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { key: "/projects", icon: <FolderKanban size={18} />, label: "Dự án", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { key: "/tasks", icon: <CheckSquare size={18} />, label: "Công việc", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF] },
      { key: "/employees", icon: <Users size={18} />, label: "Nhân sự", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { key: "/statistics", icon: <BarChart2 size={18} />, label: "Báo cáo", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { key: "/marketing", icon: <Handshake size={18} />, label: "Khách hàng", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { key: "/settings", icon: <Settings size={18} />, label: "Cài đặt", roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF] },
    ],
    [],
  );

  const navItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(currentUser?.role)),
    [allNavItems, currentUser?.role],
  );

  const pageTitle =
    {
      "/": "Tổng quan hệ thống",
      "/projects": "Quản lý dự án",
      "/tasks": "Công việc của tôi",
      "/employees": "Phân công nhân sự",
      "/statistics": "Báo cáo & phân tích",
      "/marketing": "Khách hàng & Marketing",
      "/settings": "Cài đặt hệ thống",
    }[location.pathname] || "Dashboard";

  useEffect(() => {
    let cancelled = false;
    backendApi
      .dashboard()
      .then((data) => {
        if (cancelled) return;
        const deadlineItems = (data.sap_deadline || []).slice(0, 8).map((item) => ({
          id: item._id,
          type: "warning",
          title: "Sắp tới deadline",
          msg: `${item.ten_du_an} · ${item.khach_hang || "Chưa có khách"} · ${formatVnd(item.gia_de_xuat || 0)}`,
          time: formatDate(item.deadline),
          read: false,
        }));
        setNotifications(deadlineItems);
      })
      .catch((err) => {
        if (!cancelled) {
          setNotifications([
            {
              id: "dashboard-error",
              type: "penalty",
              title: "Không tải được cảnh báo",
              msg: getErrorMessage(err),
              time: "Vừa xong",
              read: false,
            },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 },
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [location.pathname]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="layout"
      onPointerDown={setRippleFromEvent}
      onClick={(event) => {
        const clicked = event.target?.closest?.("a.nav-item");
        if (clicked) setNotifOpen(false);
      }}
    >
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">E</div>
          <div className="logo-text">
            EstiPro Admin
            <br />
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>{currentUser?.backendRole || currentUser?.role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.key} to={item.key} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <div className={`emp-avatar mini ${currentUser?.avatarUrl ? "has-image" : ""}`}>
                {currentUser?.avatarUrl ? <img src={assetUrl(currentUser.avatarUrl)} alt={currentUser?.name || "Avatar"} /> : currentUser?.avatar}
              </div>
              <div>
                <div className="sidebar-user-name">{currentUser?.name}</div>
                <div className="sidebar-user-email">{currentUser?.email}</div>
              </div>
            </div>
          )}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} type="button">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      <div className={`main-area ${collapsed ? "collapsed" : ""}`}>
        <div className="topbar">
          <div className="topbar-title">{pageTitle}</div>
          <div className="search-bar">
            <Search size={16} color="#94a3b8" />
            <input placeholder="Tìm kiếm..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setNotifOpen(!notifOpen)} type="button" aria-label="Thông báo">
              <Bell size={18} />
              {unread > 0 && <span className="notif-badge">{unread}</span>}
            </button>
            <button className="icon-btn" type="button" aria-label="Chế độ tối">
              <Moon size={18} />
            </button>
            <button className="icon-btn" onClick={logout} type="button" aria-label="Đăng xuất">
              <LogOut size={18} />
            </button>
            <div className={`avatar-btn ${currentUser?.avatarUrl ? "has-image" : ""}`} title={currentUser?.name}>
              {currentUser?.avatarUrl ? <img src={assetUrl(currentUser.avatarUrl)} alt={currentUser?.name || "Avatar"} /> : currentUser?.avatar}
            </div>
          </div>
        </div>
        <Outlet context={{ currentUser }} />
      </div>

      <div className={`notif-panel ${notifOpen ? "open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Thông báo</span>
          <button className="btn btn-ghost btn-sm ripple" onClick={() => setNotifOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>
        {notifications.length === 0 && <div className="notif-empty">Chưa có cảnh báo mới từ backend.</div>}
        {notifications.map((n) => (
          <div key={n.id} className="notif-item">
            <div className={`notif-type ${n.type}`}>{n.title}</div>
            <div style={{ fontSize: 12.5, color: "#1e2235", margin: "4px 0" }}>{n.msg}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
