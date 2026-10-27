import {
  Activity,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clapperboard,
  Film,
  Layers,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AdminStats, AdminUpstreamUsage } from "@/api/client";
import type { DashboardInsightItem } from "@/pages/dashboard/DashboardInsightGrid";
import { calcProfitFen, sumDailyUsage, sumProjectStatuses } from "@/pages/dashboard/dashboardMetrics";
import { fenToYuan } from "@/lib/utils";
import { projectStatusLabel } from "@/lib/statusLabels";

/** Icon metrics for the finance dashboard tab */
export function buildFinanceInsights(
  stats: AdminStats | null,
  upstream: AdminUpstreamUsage | null,
): DashboardInsightItem[] {
  if (!stats) return [];

  const monthCharge = stats.usage_charge_month_fen ?? 0;
  const monthCost = stats.usage_cost_month_fen ?? 0;
  const profitFen = calcProfitFen(monthCharge, monthCost);
  const recent = (upstream?.series ?? []).slice(-7);
  const localCost7 = recent.reduce((sum, row) => sum + row.local_cost_fen, 0);
  const officialCost7 = recent.reduce((sum, row) => sum + row.official_cost_fen, 0);
  const delta7 = localCost7 - officialCost7;

  const items: DashboardInsightItem[] = [
    {
      key: "paid-total",
      label: "Total Top-ups",
      value: `¥${fenToYuan(stats.order_paid_total_fen)}`,
      hint: `Today ¥${fenToYuan(stats.order_paid_today_fen)}`,
      icon: Banknote,
      tone: "blue",
    },
    {
      key: "charge-month",
      label: "Charges This Month",
      value: `¥${fenToYuan(monthCharge)}`,
      hint: `Today ¥${fenToYuan(stats.usage_charge_today_fen ?? 0)}`,
      icon: Zap,
      tone: "purple",
    },
    {
      key: "cost-month",
      label: "Cost This Month",
      value: `¥${fenToYuan(monthCost)}`,
      hint: `Today ¥${fenToYuan(stats.usage_cost_today_fen ?? 0)}`,
      icon: Wallet,
      tone: "sand",
    },
    {
      key: "profit-month",
      label: "Gross Profit This Month",
      value: `¥${fenToYuan(profitFen)}`,
      hint: monthCharge > 0 ? `Margin ${((profitFen / monthCharge) * 100).toFixed(1)}%` : undefined,
      icon: Percent,
      tone: profitFen >= 0 ? "mint" : "rose",
    },
  ];

  if (upstream?.configured && officialCost7 > 0) {
    items.push({
      key: "upstream-delta",
      label: "Cost Difference (Last 7 Days)",
      value: `¥${fenToYuan(delta7)}`,
      hint: `Local ¥${fenToYuan(localCost7)} / Official ¥${fenToYuan(officialCost7)}`,
      icon: delta7 >= 0 ? TrendingUp : TrendingDown,
      tone: delta7 >= 0 ? "teal" : "rose",
    });
  }

  items.push({
    key: "paid-today",
    label: "Received Today",
    value: `¥${fenToYuan(stats.order_paid_today_fen)}`,
    hint: "Top-up orders",
    icon: CircleDollarSign,
    tone: "teal",
  });

  return items;
}

const STATUS_META: Record<string, { icon: LucideIcon; tone: DashboardInsightItem["tone"] }> = {
  DONE: { icon: CheckCircle2, tone: "mint" },
  DRAFT: { icon: Layers, tone: "slate" },
  FAILED: { icon: TrendingDown, tone: "rose" },
  SCRIPTING: { icon: Clapperboard, tone: "blue" },
  IMAGING: { icon: Film, tone: "purple" },
  VIDEOING: { icon: Activity, tone: "teal" },
};

/** Icon metrics for the project operations tab */
export function buildProjectInsights(stats: AdminStats | null, periodDaily: ReturnType<typeof sumDailyUsage>): DashboardInsightItem[] {
  if (!stats) return [];

  const kepuTotal = sumProjectStatuses(stats.project_status_counts);
  const items: DashboardInsightItem[] = [
    {
      key: "kepu-total",
      label: "Short Video Projects",
      value: kepuTotal,
      hint: `${stats.drama_project_count ?? 0} drama projects`,
      icon: Clapperboard,
      tone: "blue",
    },
    {
      key: "drama-total",
      label: "Drama Projects",
      value: stats.drama_project_count ?? 0,
      hint: "All projects",
      icon: Film,
      tone: "teal",
    },
    {
      key: "calls-today",
      label: "Calls Today",
      value: (stats.usage_calls_today ?? 0).toLocaleString(),
      hint: `This month: ${stats.usage_calls_month ?? 0}`,
      icon: Activity,
      tone: "mint",
    },
    {
      key: "calls-total",
      label: "Total Calls",
      value: (stats.usage_calls_total ?? 0).toLocaleString(),
      hint: `Selected period: ${periodDaily.calls.toLocaleString()}`,
      icon: Layers,
      tone: "slate",
    },
  ];

  const statusEntries = Object.entries(stats.project_status_counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  for (const [status, count] of statusEntries) {
    const meta = STATUS_META[status] ?? { icon: Layers, tone: "sand" as const };
    items.push({
      key: `status-${status}`,
      label: projectStatusLabel(status),
      value: count,
      hint: kepuTotal > 0 ? `${((count / kepuTotal) * 100).toFixed(1)}% of short video projects` : undefined,
      icon: meta.icon,
      tone: meta.tone,
    });
  }

  return items;
}
