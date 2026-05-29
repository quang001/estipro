import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, DollarSign, TrendingUp } from "lucide-react";
import RoleGate from "../../components/common/RoleGate";
import { ROLES, backendApi, formatVnd, getErrorMessage, mapProject, roleLabel } from "../../services/api";
import "../../styles/pages/statistics/ReportsPage.css";

const RISK_COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#10b981", "#ef4444", "#64748b"];
const REPORT_PREVIEW_LIMIT = 10;

function statusRiskData(projects) {
  const overdue = projects.filter((project) => project.deadline && new Date(project.deadline) < new Date() && !["completed", "cancelled"].includes(project.status)).length;
  const highRisk = projects.filter((project) => Number(project.risk) >= 50).length;
  const inReview = projects.filter((project) => project.status === "review").length;
  const inProgress = projects.filter((project) => project.status === "in_progress").length;
  const data = [
    { name: "Quá deadline", value: overdue },
    { name: "Risk >= 50%", value: highRisk },
    { name: "Đang review", value: inReview },
    { name: "Đang chạy", value: inProgress },
  ].filter((item) => item.value > 0);
  return data.length ? data : [{ name: "Ổn định", value: 1 }];
}

export default function ReportsPage() {
  const { currentUser } = useOutletContext();
  const deny = currentUser?.role === ROLES.STAFF || currentUser?.role === ROLES.CLIENT;

  const [dashboard, setDashboard] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllFinance, setShowAllFinance] = useState(false);
  const [showAllStaff, setShowAllStaff] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, performanceData, projectDocs] = await Promise.all([backendApi.dashboard(), backendApi.performance(), backendApi.projects()]);
      setDashboard(dashboardData);
      setPerformance(performanceData);
      setProjects(projectDocs.map(mapProject));
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được báo cáo"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (deny) return undefined;
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [deny, loadData]);

  const performanceChart = useMemo(
    () =>
      performance.map((item) => ({
        name: item.ho_ten,
        score: item.diem_tb || 0,
        projects: item.so_du_an || 0,
        late: item.trung_binh_ngay_tre || 0,
      })),
    [performance],
  );

  const riskData = useMemo(() => statusRiskData(projects), [projects]);

  const financeData = useMemo(
    () =>
      projects.map((project) => {
        const estimate = project.raw?.uoc_tinh || {};
        const margin = Math.max(0, (estimate.gia_de_xuat || 0) - (estimate.tong_chi_phi_du_kien || 0));
        return {
          id: project.id,
          name: project.name,
          sw: estimate.chi_phi_ky_thuat || 0,
          rf: estimate.chi_phi_rui_ro || 0,
          st: margin,
          hm: estimate.chi_phi_nhan_su || 0,
          total: estimate.gia_de_xuat || estimate.tong_chi_phi_du_kien || 0,
        };
      }),
    [projects],
  );
  const visibleFinanceData = showAllFinance ? financeData : financeData.slice(0, REPORT_PREVIEW_LIMIT);
  const visiblePerformance = showAllStaff ? performance : performance.slice(0, REPORT_PREVIEW_LIMIT);

  if (deny)
    return (
      <RoleGate
        allow={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}
        title="Báo cáo chỉ dành cho Manager/Admin"
        subtitle="Backend đang bảo vệ báo cáo bằng JWT; frontend cũng chặn theo role đã đăng nhập."
      />
    );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Báo cáo & phân tích</h1>
        <p className="page-subtitle">
          {dashboard?.tong_du_an ?? 0} dự án · {dashboard?.tong_nhan_vien ?? 0} nhân sự · dữ liệu lấy từ toàn bộ hệ thống, cập nhật theo thời gian thực. Tải lại trang để làm mới dữ liệu.
        </p>
      </div>

      {loading && <div className="card">Đang tải báo cáo...</div>}
      {error && <div className="card error-card">{error}</div>}

      {!loading && !error && (
        <>
          <div className="reports-grid">
            <div className="card">
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <TrendingUp size={16} color="#10b981" /> Hiệu suất nhân sự
              </div>
              <div className="card-subtitle">Điểm trung bình, số dự án và số ngày trễ trung bình từ hiệu suất</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={performanceChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(79,172,254,0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="score" name="Điểm TB" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="projects" name="Số dự án" fill="#4facfe" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="late" name="Ngày trễ TB" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title" style={{ display: "flex", gap: 8 }}>
                <AlertOctagon size={16} color="#f97316" /> Risk analytics
              </div>
              <div className="card-subtitle">Phân bổ rủi ro từ deadline, trạng thái và phần trăm rủi ro ước tính</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ value }) => value} labelLine={false}>
                    {riskData.map((_, i) => (
                      <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="risk-legend">
                {riskData.map((d, i) => (
                  <div key={d.name} className="risk-legend-item">
                    <span className="color-dot" style={{ background: RISK_COLORS[i % RISK_COLORS.length] }} />
                    <span>{d.name}</span>
                    <strong style={{ color: RISK_COLORS[i % RISK_COLORS.length] }}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ display: "flex", gap: 8 }}>
              <DollarSign size={16} color="#4facfe" /> Phân tích chi phí dự án
            </div>
            <div className="card-subtitle">Chi phí lấy từ hệ thống. Đơn vị hiển thị rút gọn theo VND.</div>
            <div style={{ overflowX: "auto" }}>
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Tên dự án</th>
                    <th>Kỹ thuật</th>
                    <th>Rủi ro</th>
                    <th>Margin</th>
                    <th>Nhân sự</th>
                    <th>Giá đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFinanceData.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: "#8b5cf6" }}>{formatVnd(p.sw)}</td>
                      <td style={{ color: "#4facfe" }}>{formatVnd(p.rf)}</td>
                      <td style={{ color: "#10b981" }}>{formatVnd(p.st)}</td>
                      <td style={{ color: "#f97316" }}>{formatVnd(p.hm)}</td>
                      <td className="total-cell">{formatVnd(p.total)}</td>
                    </tr>
                  ))}
                  {financeData.length === 0 && (
                    <tr>
                      <td colSpan={6}>Chưa có dự án để phân tích chi phí.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {financeData.length > REPORT_PREVIEW_LIMIT ? (
              <button className="report-show-more" type="button" onClick={() => setShowAllFinance((value) => !value)}>
                {showAllFinance ? "Thu gọn" : `Xem thêm ${financeData.length - REPORT_PREVIEW_LIMIT} dự án`}
              </button>
            ) : null}
          </div>

          <div className="card reports-staff-table">
            <div className="card-title">Chi tiết nhân sự</div>
            <div style={{ overflowX: "auto" }}>
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Vai trò</th>
                    <th>Cấp độ</th>
                    <th>Trạng thái</th>
                    <th>Số dự án</th>
                    <th>Điểm TB</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePerformance.map((item) => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: 700 }}>{item.ho_ten}</td>
                      <td>{roleLabel(item.vai_tro)}</td>
                      <td>{item.cap_do || "N/A"}</td>
                      <td>{item.trang_thai}</td>
                      <td>{item.so_du_an}</td>
                      <td className="total-cell">{item.diem_tb ?? "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {performance.length > REPORT_PREVIEW_LIMIT ? (
              <button className="report-show-more" type="button" onClick={() => setShowAllStaff((value) => !value)}>
                {showAllStaff ? "Thu gọn" : `Xem thêm ${performance.length - REPORT_PREVIEW_LIMIT} nhân sự`}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
