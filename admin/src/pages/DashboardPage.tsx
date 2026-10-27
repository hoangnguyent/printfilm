import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Banknote,
  Clapperboard,
  Film,
  Layers,
  Receipt,
  Settings,
  Shapes,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { PageSection } from "@/components/admin/PageSection";
import { PageHeader } from "@/components/ui/page";
import { api, type AdminOrder, type AdminStats, type AdminUpstreamUsage, type PageMeta } from "@/api/client";
import { AdminEntityLink } from "@/components/admin/AdminEntityLink";
import { fenToYuan } from "@/lib/utils";
import { projectStatusLabel, taskDomainLabel } from "@/lib/statusLabels";
import { Button } from "@/components/ui/button";
import {
  buildStatsQuery,
  dashboardRangeLabel,
  DashboardFilters,
  DEFAULT_DASHBOARD_FILTERS,
  PROJECTS_DASHBOARD_FILTERS,
  type DashboardFilterState,
} from "@/pages/dashboard/DashboardFilters";
import { DashboardKpiCard } from "@/pages/dashboard/DashboardKpiCard";
import { DashboardInsightGrid } from "@/pages/dashboard/DashboardInsightGrid";
import { DashboardPeriodKpis } from "@/pages/dashboard/DashboardPeriodKpis";
import { DashboardSectionTabs, type DashboardSection } from "@/pages/dashboard/DashboardSectionTabs";
import { buildDomainInsights } from "@/pages/dashboard/dashboardInsightMaps";
import { buildFinanceInsights, buildProjectInsights } from "@/pages/dashboard/dashboardSectionInsights";
import { sumDailyUsage } from "@/pages/dashboard/dashboardMetrics";
import { UsageDistributionChart } from "@/pages/dashboard/UsageDistributionChart";
import { TopUsersRankingChart } from "@/pages/dashboard/TopUsersRankingChart";
import { UsageTrendChart } from "@/pages/dashboard/UsageTrendChart";

type OrderRes = { items: AdminOrder[]; meta: PageMeta };

const CAPABILITY_LABELS: Record<string, string> = {
  llm: "LLM Text",
  image: "Image Generation",
  video: "Video",
  tts: "Voiceover",
  unknown: "Other",
  other: "Other",
};

function statusClass(status: string): string {
  if (status === "DONE") return "is-done";
  if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") return "is-fail";
  if (status === "SCRIPTING" || status === "IMAGING" || status === "VIDEOING" || status === "COMPOSING") {
    return "is-run";
  }
  return "is-warn";
}

function capabilityLabel(key: string): string {
  return CAPABILITY_LABELS[key] ?? key;
}

function domainChartLabel(key: string): string {
  if (key === "kepu") return "AI Short Video";
  return taskDomainLabel(key);
}

/** 管理端仪表盘：板块切换 + 渐变 KPI + 可筛选用量图表 */
export function DashboardPage() {
  const [section, setSection] = useState<DashboardSection>("overview");
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTERS);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [upstreamUsage, setUpstreamUsage] = useState<AdminUpstreamUsage | null>(null);
  const [upstreamSyncing, setUpstreamSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUpstreamUsage = useCallback(async () => {
    try {
      const data = await api<AdminUpstreamUsage>("/api/admin/stats/upstream-usage?days=30");
      setUpstreamUsage(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load official usage");
    }
  }, []);

  const syncUpstreamUsage = useCallback(async () => {
    setUpstreamSyncing(true);
    try {
      await api("/api/admin/stats/upstream-usage/sync?days=30", { method: "POST" });
      toast.success("Official usage refreshed");
      await loadUpstreamUsage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setUpstreamSyncing(false);
    }
  }, [loadUpstreamUsage]);

  const loadData = useCallback(async (nextFilters: DashboardFilterState) => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        api<AdminStats>(buildStatsQuery(nextFilters)),
        api<OrderRes>("/api/admin/orders?page=1&page_size=8&status=paid"),
      ]);
      setStats(s);
      setOrders(o.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const kpiReady = Boolean(stats);
  const kpiPlaceholder = loading ? "…" : "—";
  const statsFilters = section === "projects" ? PROJECTS_DASHBOARD_FILTERS : filters;
  const projectsRangeLabel = dashboardRangeLabel(PROJECTS_DASHBOARD_FILTERS.days);

  useEffect(() => {
    void loadData(statsFilters);
  }, [statsFilters, loadData]);

  useEffect(() => {
    void loadUpstreamUsage();
  }, [loadUpstreamUsage]);

  const statusEntries = Object.entries(stats?.project_status_counts ?? {}).sort((a, b) => b[1] - a[1]);
  const daily = stats?.daily_usage ?? [];
  const byCapability = stats?.usage_by_capability ?? [];
  const byDomain = stats?.usage_by_domain ?? [];
  const topUsers = stats?.top_users_by_charge ?? [];
  const rangeLabel = dashboardRangeLabel(filters.days);
  const showUsageFilters = section === "overview" || section === "usage";
  const domainInsights = buildDomainInsights(byDomain, filters.metric, domainChartLabel);
  const financeInsights = buildFinanceInsights(stats, upstreamUsage);
  const projectInsights = buildProjectInsights(stats, sumDailyUsage(daily));
  const metricHint =
    filters.metric === "cost" ? "Upstream Cost" : filters.metric === "calls" ? "Call Count" : "Amount Charged";

  return (
    <div className="admin-page admin-dashboard-page">
      <PageHeader description="Overview of users, top-ups, AI usage, and costs" />

      <div className="admin-dashboard-kpi-grid">
        <DashboardKpiCard
          label="Total Users"
          value={kpiReady ? stats!.user_count : kpiPlaceholder}
          hint="All registered users"
          icon={Users}
          tone="teal"
        />
        <DashboardKpiCard
          label="Total Paid"
          value={kpiReady ? `¥${fenToYuan(stats!.order_paid_total_fen)}` : kpiPlaceholder}
          hint="Lifetime top-ups"
          icon={Banknote}
          tone="blue"
        />
        <DashboardKpiCard
          label="AI Charges This Month"
          value={kpiReady ? `¥${fenToYuan(stats!.usage_charge_month_fen ?? 0)}` : kpiPlaceholder}
          hint={kpiReady ? `Today ¥${fenToYuan(stats!.usage_charge_today_fen ?? 0)}` : "Today's charges"}
          icon={Zap}
          tone="purple"
        />
        <DashboardKpiCard
          label="Upstream Cost This Month"
          value={kpiReady ? `¥${fenToYuan(stats!.usage_cost_month_fen ?? 0)}` : kpiPlaceholder}
          hint={kpiReady ? `Today ¥${fenToYuan(stats!.usage_cost_today_fen ?? 0)}` : "Cost summary"}
          icon={Wallet}
          tone="sand"
        />
      </div>

      <DashboardSectionTabs value={section} onChange={setSection} />

      {showUsageFilters ? <DashboardFilters value={filters} onChange={setFilters} /> : null}
      {showUsageFilters ? <DashboardPeriodKpis stats={stats} filters={filters} loading={loading} /> : null}

      {section === "overview" ? (
        <>
          <div className="admin-dashboard-charts">
            <PageSection
              title={`${rangeLabel} Usage Trend`}
              description={loading ? "Loading…" : "Daily trend for the selected filters"}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-main admin-dashboard-glass min-h-0"
            >
              <UsageTrendChart data={daily} metric={filters.metric} />
            </PageSection>

            <PageSection
              title="Usage by Capability"
              description={`${rangeLabel} · ${metricHint}`}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-side admin-dashboard-glass min-h-0"
            >
              <UsageDistributionChart
                data={byCapability}
                metric={filters.metric}
                labelForKey={capabilityLabel}
                variant="donut"
              />
            </PageSection>
          </div>

          <PageSection
            title={`Top 3 Users by Spend (${rangeLabel})`}
            actions={
              <Link to="/orders?tab=usage" className="admin-link">
                More →
              </Link>
            }
            bodyClassName="!pt-2"
            className="admin-dashboard-glass min-h-0"
          >
            <TopUsersRankingChart users={topUsers.slice(0, 3)} metric={filters.metric} />
          </PageSection>

          <div className="admin-dashboard-charts">
            <PageSection
              title="Usage by Domain"
              description={`${rangeLabel} · ${metricHint}`}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-main admin-dashboard-glass min-h-0"
            >
              <UsageDistributionChart
                data={byDomain}
                metric={filters.metric}
                labelForKey={domainChartLabel}
                variant="bar"
              />
            </PageSection>
            <PageSection
              title="Domain Insights"
              description={`${rangeLabel} · ${metricHint}`}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-side admin-dashboard-glass min-h-0"
            >
              <DashboardInsightGrid items={domainInsights} columns={2} />
            </PageSection>
          </div>
        </>
      ) : null}

      {section === "usage" ? (
        <>
          <div className="admin-dashboard-charts">
            <PageSection
              title={`${rangeLabel} Usage Trend`}
              description={loading ? "Loading…" : "Daily charges, costs, and calls"}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-main admin-dashboard-glass min-h-0"
            >
              <UsageTrendChart data={daily} metric={filters.metric} />
            </PageSection>

            <PageSection
              title="Usage by Capability"
              description={`${rangeLabel} · ${metricHint}`}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-side admin-dashboard-glass min-h-0"
            >
              <UsageDistributionChart
                data={byCapability}
                metric={filters.metric}
                labelForKey={capabilityLabel}
                variant="donut"
              />
            </PageSection>
          </div>

          <div className="admin-dashboard-charts">
            <PageSection
              title="Usage by Domain"
              description={`${rangeLabel} · ${metricHint}`}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-main admin-dashboard-glass min-h-0"
            >
              <UsageDistributionChart
                data={byDomain}
                metric={filters.metric}
                labelForKey={domainChartLabel}
                variant="bar"
              />
            </PageSection>
            <PageSection
              title={`User Spend Ranking (${rangeLabel})`}
              actions={
                <Link to="/orders?tab=usage" className="admin-link">
                  Usage Details →
                </Link>
              }
              description={metricHint}
              bodyClassName="!pt-2"
              className="admin-dashboard-chart-side admin-dashboard-glass min-h-0"
            >
              <TopUsersRankingChart users={topUsers} metric={filters.metric} />
            </PageSection>
          </div>
        </>
      ) : null}

      {section === "finance" ? (
        <div className="admin-dashboard-body admin-dashboard-body--finance">
          <PageSection
            title="Financial Overview"
            description="Top-ups, charges, costs, and gross margin"
            actions={
              <Link to="/finance" className="admin-link">
                Finance →
              </Link>
            }
            bodyClassName="!pt-2"
            className="admin-dashboard-glass min-h-0 admin-dashboard-body--full"
          >
            <DashboardInsightGrid items={financeInsights} columns={3} />
          </PageSection>

          <PageSection
            title="TokenFree Usage Comparison"
            description={
              upstreamUsage?.configured
                ? `Local cost vs. TokenFree New API usage over the last 30 days${upstreamUsage.last_sync_at ? ` · Last synced ${new Date(upstreamUsage.last_sync_at).toLocaleString()}` : ""}`
                : "TokenFree API key is not configured. Add it under System Settings → Models, then refresh."
            }
            actions={
              upstreamUsage?.configured ? (
                <Button type="button" size="sm" variant="outline" disabled={upstreamSyncing} onClick={() => void syncUpstreamUsage()}>
                  {upstreamSyncing ? "Refreshing…" : "Refresh Official Data"}
                </Button>
              ) : null
            }
            bodyClassName="!pt-0"
            className="admin-dashboard-glass min-h-0"
          >
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Local Cost</th>
                    <th>Local Tokens</th>
                    <th>Official Tokens</th>
                    <th>Official Cost</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(upstreamUsage?.series ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="!text-center text-[var(--admin-muted)]">
                        No comparison data
                      </td>
                    </tr>
                  ) : (
                    [...(upstreamUsage?.series ?? [])].reverse().slice(0, 14).map((row) => (
                      <tr key={row.date}>
                        <td className="font-mono text-xs">{row.date}</td>
                        <td>¥{fenToYuan(row.local_cost_fen)}</td>
                        <td>{row.local_tokens.toLocaleString()}</td>
                        <td>{row.official_tokens > 0 ? row.official_tokens.toLocaleString() : "—"}</td>
                        <td>{row.official_cost_fen > 0 ? `¥${fenToYuan(row.official_cost_fen)}` : "—"}</td>
                        <td>
                          {row.official_cost_fen > 0
                            ? `¥${fenToYuan(row.delta_fen)}${row.delta_pct != null ? ` (${row.delta_pct}%)` : ""}`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PageSection>

          <PageSection
            title="Recent Orders"
            description="Showing paid orders only"
            actions={
              <Link to="/orders" className="admin-link">
                View All →
              </Link>
            }
            bodyClassName="!pt-0"
            className="admin-dashboard-glass min-h-0"
          >
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="!text-center text-[var(--admin-muted)]">
                        No paid orders
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <AdminEntityLink kind="user" id={o.user_id} label={o.user_email ?? undefined} />
                        </td>
                        <td className="font-semibold text-[var(--admin-forest)]">¥{fenToYuan(o.amount_fen)}</td>
                        <td className="text-xs text-[var(--admin-muted)]">
                          {o.paid_at ? new Date(o.paid_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </PageSection>
        </div>
      ) : null}

      {section === "projects" ? (
        <>
          <PageSection
            title="Operations Overview"
            description="Project volume, usage, and status distribution"
            bodyClassName="!pt-2"
            className="admin-dashboard-glass min-h-0"
          >
            <DashboardInsightGrid items={projectInsights} columns={4} />
          </PageSection>

          <div className="admin-dashboard-project-row">
            <PageSection
              title="AI Short Video Project Status"
              description={`${stats?.drama_project_count ?? 0} drama projects`}
              bodyClassName="!pt-2"
              className="admin-dashboard-glass min-h-0"
            >
              <div className="flex flex-wrap gap-1.5">
                {statusEntries.length === 0 ? (
                  <span className="text-xs text-[var(--admin-muted)]">No data</span>
                ) : (
                  statusEntries.map(([status, count]) => (
                    <span key={status} className={`admin-status-pill !px-2.5 !py-1 !text-[11px] ${statusClass(status)}`}>
                      {projectStatusLabel(status)} {count}
                    </span>
                  ))
                )}
              </div>
            </PageSection>

            <PageSection title="Usage Statistics" bodyClassName="!pt-2" className="admin-dashboard-glass min-h-0">
              <div className="admin-dashboard-stat-grid">
                <div>
                  <div className="admin-dashboard-stat-grid-label">Calls Today</div>
                  <div className="admin-dashboard-stat-grid-value">
                    {kpiReady ? stats!.usage_calls_today ?? 0 : kpiPlaceholder}
                  </div>
                </div>
                <div>
                  <div className="admin-dashboard-stat-grid-label">Calls This Month</div>
                  <div className="admin-dashboard-stat-grid-value">
                    {kpiReady ? stats!.usage_calls_month ?? 0 : kpiPlaceholder}
                  </div>
                </div>
                <div>
                  <div className="admin-dashboard-stat-grid-label">Total Calls</div>
                  <div className="admin-dashboard-stat-grid-value">
                    {kpiReady ? stats!.usage_calls_total ?? 0 : kpiPlaceholder}
                  </div>
                </div>
              </div>
            </PageSection>
          </div>

          <PageSection title={`Usage by Domain (${projectsRangeLabel})`} bodyClassName="!pt-2" className="admin-dashboard-glass min-h-0">
            <UsageDistributionChart
              data={byDomain}
              metric="charge"
              labelForKey={domainChartLabel}
              variant="bar"
            />
          </PageSection>

          <PageSection title="Quick Links" bodyClassName="!pt-2" className="admin-dashboard-glass">
            <div className="admin-dashboard-tools">
              <Link to="/templates" className="admin-dashboard-tool-btn">
                <Shapes className="h-5 w-5" />
                <span>Templates</span>
              </Link>
              <Link to="/orders?tab=usage" className="admin-dashboard-tool-btn">
                <Receipt className="h-5 w-5" />
                <span>Orders & Usage</span>
              </Link>
              <Link to="/users" className="admin-dashboard-tool-btn">
                <Users className="h-5 w-5" />
                <span>Users</span>
              </Link>
              <Link to="/projects" className="admin-dashboard-tool-btn">
                <Clapperboard className="h-5 w-5" />
                <span>AI Short Video</span>
              </Link>
              <Link to="/drama-projects" className="admin-dashboard-tool-btn">
                <Film className="h-5 w-5" />
                <span>Drama Projects</span>
              </Link>
              <Link to="/queues" className="admin-dashboard-tool-btn">
                <Layers className="h-5 w-5" />
                <span>Task Queue</span>
              </Link>
              <Link to="/settings" className="admin-dashboard-tool-btn">
                <Settings className="h-5 w-5" />
                <span>System Settings</span>
              </Link>
              <Link to="/orders" className="admin-dashboard-tool-btn">
                <Activity className="h-5 w-5" />
                <span>Finance Ledger</span>
              </Link>
            </div>
          </PageSection>
        </>
      ) : null}
    </div>
  );
}
