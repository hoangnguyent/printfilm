import type { AdminTopUser, AdminUsageBucket } from "@/api/client";
import type { DashboardMetric } from "@/pages/dashboard/DashboardFilters";
import { UsageDistributionChart } from "@/pages/dashboard/UsageDistributionChart";

/** Convert user rankings to chart data buckets. */
export function topUsersToBuckets(users: AdminTopUser[]): AdminUsageBucket[] {
  return users.map((user) => ({
    key: String(user.user_id),
    calls: user.calls,
    charge_fen: user.charge_fen,
    cost_fen: user.cost_fen ?? 0,
  }));
}

/** Short user label for the chart's Y axis. */
export function topUserChartLabel(userId: string, users: AdminTopUser[]): string {
  const user = users.find((item) => String(item.user_id) === userId);
  const email = user?.email ?? "";
  const local = email.split("@")[0]?.trim();
  if (local) return local.length > 12 ? `${local.slice(0, 11)}…` : local;
  return `ID ${userId}`;
}

type TopUsersRankingChartProps = {
  users: AdminTopUser[];
  metric: DashboardMetric;
};

/** User spending rankings shown as a horizontal bar chart. */
export function TopUsersRankingChart({ users, metric }: TopUsersRankingChartProps) {
  const rows = topUsersToBuckets(users);
  if (rows.length === 0) {
    return <div className="admin-chart-empty">No rankings available</div>;
  }

  return (
    <UsageDistributionChart
      data={rows}
      metric={metric}
      labelForKey={(key) => topUserChartLabel(key, users)}
      variant="bar"
      chartHeight={Math.max(220, rows.length * 36)}
      yAxisWidth={96}
    />
  );
}
