import {
  Clapperboard,
  Film,
  Image,
  MessageSquareText,
  Mic,
  Palette,
  Video,
  Webhook,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AdminUsageBucket } from "@/api/client";
import type { DashboardMetric } from "@/pages/dashboard/DashboardFilters";
import type { DashboardInsightItem, DashboardInsightTone } from "@/pages/dashboard/DashboardInsightGrid";
import { formatDashboardMetric, readBucketMetric } from "@/pages/dashboard/dashboardMetrics";

const CAPABILITY_META: Record<string, { label: string; icon: LucideIcon; tone: DashboardInsightTone }> = {
  llm: { label: "LLM Text", icon: MessageSquareText, tone: "purple" },
  image: { label: "Image Generation", icon: Image, tone: "blue" },
  video: { label: "Video", icon: Video, tone: "teal" },
  tts: { label: "Voiceover", icon: Mic, tone: "sand" },
  unknown: { label: "Other", icon: Wrench, tone: "slate" },
};

const DOMAIN_META: Record<string, { label: string; icon: LucideIcon; tone: DashboardInsightTone }> = {
  drama: { label: "Drama", icon: Film, tone: "teal" },
  kepu: { label: "AI Short Video", icon: Clapperboard, tone: "blue" },
  api: { label: "Open API", icon: Webhook, tone: "purple" },
  tools: { label: "Tools", icon: Wrench, tone: "sand" },
  studio: { label: "Studio", icon: Palette, tone: "mint" },
  unknown: { label: "Other", icon: Wrench, tone: "slate" },
};

function buildInsightItems(
  rows: AdminUsageBucket[],
  metric: DashboardMetric,
  metaMap: Record<string, { label: string; icon: LucideIcon; tone: DashboardInsightTone }>,
  labelForKey?: (key: string) => string,
): DashboardInsightItem[] {
  const prepared = [...rows]
    .map((row) => ({
      row,
      value: readBucketMetric(row, metric),
    }))
    .filter((item) => item.value > 0);
  const total = prepared.reduce((sum, item) => sum + item.value, 0);

  return prepared
    .sort((a, b) => b.value - a.value)
    .map(({ row, value }) => {
      const meta = metaMap[row.key] ?? metaMap.unknown;
      const sharePct = total > 0 ? ((value / total) * 100).toFixed(1) : null;
      const shareHint = sharePct ? `${sharePct}% of total` : undefined;
      return {
        key: row.key,
        label: labelForKey?.(row.key) ?? meta.label,
        value: formatDashboardMetric(value, metric),
        hint: [shareHint, `${row.calls.toLocaleString()} calls`].filter(Boolean).join(" · "),
        icon: meta.icon,
        tone: meta.tone,
      };
    });
}

/** 能力分布洞察卡片 */
export function buildCapabilityInsights(
  rows: AdminUsageBucket[],
  metric: DashboardMetric,
): DashboardInsightItem[] {
  return buildInsightItems(rows, metric, CAPABILITY_META);
}

/** 领域分布洞察卡片 */
export function buildDomainInsights(
  rows: AdminUsageBucket[],
  metric: DashboardMetric,
  labelForKey: (key: string) => string,
): DashboardInsightItem[] {
  return buildInsightItems(rows, metric, DOMAIN_META, labelForKey);
}
