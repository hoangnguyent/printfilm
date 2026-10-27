import { AdminChipFilter } from "@/components/admin/AdminChipFilter";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";

/** 仪表盘筛选维度 */
export type DashboardDays = "1" | "7" | "14" | "30";
export type DashboardDomain = "all" | "drama" | "kepu" | "api" | "tools" | "studio";
export type DashboardCapability = "all" | "llm" | "image" | "video" | "tts";
export type DashboardMetric = "charge" | "cost" | "calls";

export type DashboardFilterState = {
  days: DashboardDays;
  domain: DashboardDomain;
  capability: DashboardCapability;
  metric: DashboardMetric;
};

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  days: "7",
  domain: "all",
  capability: "all",
  metric: "charge",
};

/** 运维 Tab 固定全量 30 日，不受隐藏筛选影响 */
export const PROJECTS_DASHBOARD_FILTERS: DashboardFilterState = {
  days: "30",
  domain: "all",
  capability: "all",
  metric: "charge",
};

const DAY_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

/** 图表 / 区块标题用的时间范围文案 */
export function dashboardRangeLabel(days: DashboardDays): string {
  if (days === "1") return "Today";
  return `Last ${days} days`;
}

const DOMAIN_OPTIONS = [
  { value: "all", label: "All domains" },
  { value: "drama", label: "Drama" },
  { value: "kepu", label: "AI Short Video" },
  { value: "api", label: "Open API" },
  { value: "tools", label: "Tools" },
  { value: "studio", label: "Studio" },
];

const CAPABILITY_OPTIONS = [
  { value: "all", label: "All capabilities" },
  { value: "llm", label: "LLM" },
  { value: "image", label: "Image Generation" },
  { value: "video", label: "Video" },
  { value: "tts", label: "Voiceover" },
];

const METRIC_OPTIONS = [
  { value: "charge", label: "Charges" },
  { value: "cost", label: "Cost" },
  { value: "calls", label: "Calls" },
];

type DashboardFiltersProps = {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
};

/** 仪表盘用量筛选条（两行紧凑布局） */
export function DashboardFilters({ value, onChange }: DashboardFiltersProps) {
  const patch = (partial: Partial<DashboardFilterState>) => onChange({ ...value, ...partial });

  return (
    <AdminFilterBar className="admin-dashboard-filters">
      <AdminChipFilter
        label="Time Range"
        value={value.days}
        options={DAY_OPTIONS}
        onChange={(days) => patch({ days: days as DashboardDays })}
        className="admin-chip-filter--segment"
      />
      <AdminChipFilter
        label="Business Domain"
        value={value.domain}
        options={DOMAIN_OPTIONS}
        onChange={(domain) => patch({ domain: domain as DashboardDomain })}
        className="admin-chip-filter--segment"
      />
      <AdminChipFilter
        label="Capability"
        value={value.capability}
        options={CAPABILITY_OPTIONS}
        onChange={(capability) => patch({ capability: capability as DashboardCapability })}
        className="admin-chip-filter--segment"
      />
      <AdminChipFilter
        label="Metric"
        value={value.metric}
        options={METRIC_OPTIONS}
        onChange={(metric) => patch({ metric: metric as DashboardMetric })}
        className="admin-chip-filter--segment"
      />
    </AdminFilterBar>
  );
}

/** 拼接 stats API 查询串 */
export function buildStatsQuery(filters: DashboardFilterState): string {
  const params = new URLSearchParams({
    days: filters.days,
    domain: filters.domain,
    capability: filters.capability,
    top_metric: filters.metric,
  });
  return `/api/admin/stats?${params.toString()}`;
}
