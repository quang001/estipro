import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, DollarSign, FolderKanban, Trophy, Users, Zap } from "lucide-react";
import { backendApi, formatDate, formatVnd, getErrorMessage, mapProject, roleLabel } from "../../services/api";
import "../../styles/pages/statistics/DashboardPage.css";

const RISK_COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#64748b"];

function statusChartData(statusMap = {}) {
  const labels = {
    draft: "Nháp",
    quoted: "Báo giá",
    approved: "Duyệt",
    in_progress: "Đang làm",
    review: "Review",
    completed: "Hoàn thành",
    cancelled: "Hủy",
  };
  const data = Object.entries(statusMap).map(([key, value]) => ({ name: labels[key] || key, value }));
  return data.length ? data : [{ name: "Chưa có dữ liệu", value: 1 }];
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardResult, revenueResult, performanceResult, projectResult] = await Promise.allSettled([
        backendApi.dashboard(),
        backendApi.revenue(),
        backendApi.performance(),
        backendApi.projects(),
      ]);
      setDashboard(dashboardResult.status === "fulfilled" ? dashboardResult.value : null);
      setRevenue(revenueResult.status === "fulfilled" && Array.isArray(revenueResult.value) ? revenueResult.value : []);
      setPerformance(performanceResult.status === "fulfilled" && Array.isArray(performanceResult.value) ? performanceResult.value : []);
      setProjects(
        projectResult.status === "fulfilled" && Array.isArray(projectResult.value)
          ? projectResult.value
              .map((project) => {
                try {
                  return mapProject(project);
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
          : [],
      );
      if ([dashboardResult, revenueResult, performanceResult, projectResult].every((result) => result.status === "rejected")) {
        throw dashboardResult.reason;
      }
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dashboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rankedEmployees = useMemo(
    () =>
      [...performance]
        .sort((left, right) => (right.diem_tb || 0) - (left.diem_tb || 0) || (right.so_du_an || 0) - (left.so_du_an || 0))
        .slice(0, 8),
    [performance],
  );

  const chartData = useMemo(() => {
    if (revenue.length) {
      return revenue.map((item) => ({
        month: item.thang,
        estimated: item.doanh_thu || 0,
        actual: item.loi_nhuan || 0,
      }));
    }
    return projects.slice(0, 8).map((project) => ({
      month: project.name.slice(0, 12),
      estimated: project.budget,
      actual: project.cost,
    }));
  }, [projects, revenue]);

  const kpis = [
    {
      label: "Tổng dự án",
      value: dashboard?.tong_du_an ?? 0,
      change: `${dashboard?.tong_khach_hang ?? 0} khách hàng`,
      icon: <FolderKanban size={20} />,
      color: "blue",
    },
    {
      label: "Đang chạy / Review",
      value: `${dashboard?.theo_trang_thai?.in_progress || 0} / ${dashboard?.theo_trang_thai?.review || 0}`,
      change: `${dashboard?.sap_deadline?.length || 0} sắp deadline`,
      icon: <Zap size={20} />,
      color: "purple",
    },
    {
      label: "Doanh thu dự kiến",
      value: formatVnd(dashboard?.tong_doanh_thu_du_kien || 0),
      change: `Lợi nhuận ${formatVnd(dashboard?.tong_loi_nhuan_thuc_te || 0)}`,
      icon: <DollarSign size={20} />,
      color: "green",
    },
    {
      label: "Nhân sự",
      value: dashboard?.tong_nhan_vien ?? 0,
      change: dashboard?.do_chinh_xac_uoc_tinh ? `Ước tính đúng ${dashboard.do_chinh_xac_uoc_tinh}%` : "Chưa có mẫu ML",
      icon: <Users size={20} />,
      color: "orange",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <p className="page-subtitle">Dashboard tổng hợp từ doanh thu, hiệu suất và dự án.</p>
      </div>

      {loading && <div className="card">Đang tải dashboard...</div>}
      {error && <div className="card error-card">{error}</div>}

      {!loading && !error && (
        <>
          <div className="kpi-grid">
            {kpis.map((k, i) => (
              <div key={k.label} className={`kpi-card ${k.color} reveal is-visible`} data-reveal style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">
                  {k.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({k.change})</span>
                </div>
              </div>
            ))}
          </div>

          <div className="chart-grid">
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title">Doanh thu / Chi phí theo dữ liệu backend</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="liqEstFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4facfe" stopOpacity={0.38} />
                      <stop offset="55%" stopColor="#00f2fe" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="liqActFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" stopOpacity={0.32} />
                      <stop offset="55%" stopColor="#8b5cf6" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatVnd(value)} />
                  <Tooltip formatter={(value) => formatVnd(value)} />
                  <Area type="monotone" dataKey="estimated" name="Doanh thu/Đề xuất" stroke="#4facfe" strokeWidth={2} fill="url(#liqEstFill)" dot={false} />
                  <Area type="monotone" dataKey="actual" name="Lợi nhuận/Chi phí" stroke="#667eea" strokeWidth={2} fill="url(#liqActFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title">Phân bổ trạng thái dự án</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChartData(dashboard?.theo_trang_thai)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {statusChartData(dashboard?.theo_trang_thai).map((_, i) => (
                      <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-bottom-grid">
            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={16} color="#fbbf24" /> Top nhân viên
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Nhân viên</th>
                    <th>Vai trò</th>
                    <th>Điểm TB</th>
                    <th>Dự án</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedEmployees.map((emp, index) => (
                    <tr key={emp._id}>
                      <td>
                        <div className={`rank-num ${index < 3 ? `rank-${index + 1}` : ""}`}>{index + 1}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{emp.ho_ten}</td>
                      <td style={{ color: "#64748b" }}>{roleLabel(emp.vai_tro)}</td>
                      <td style={{ color: "#4facfe", fontWeight: 700 }}>{emp.diem_tb ?? "N/A"}</td>
                      <td>{emp.so_du_an}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card hover-lift reveal is-visible" data-reveal>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} color="#f97316" /> Sắp deadline
              </div>
              <div className="deadline-list">
                {(dashboard?.sap_deadline || []).slice(0, 6).map((item) => (
                  <div key={item._id} className="deadline-row">
                    <div>
                      <strong>{item.ten_du_an}</strong>
                      <span>{item.khach_hang || "Chưa có khách hàng"}</span>
                    </div>
                    <div>{formatDate(item.deadline)}</div>
                  </div>
                ))}
                {(dashboard?.sap_deadline || []).length === 0 && <div className="deadline-empty">Không có dự án nào tới deadline trong 7 ngày.</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
