import { BarChart3, Clapperboard, LayoutDashboard, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Main dashboard sections */
export type DashboardSection = "overview" | "usage" | "finance" | "projects";

const SECTIONS: {
  id: DashboardSection;
  label: string;
  desc: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", desc: "Key metrics and trends", icon: LayoutDashboard },
  { id: "usage", label: "Usage Analysis", desc: "Calls and distribution", icon: BarChart3 },
  { id: "finance", label: "Finance", desc: "Top-ups and costs", icon: Wallet },
  { id: "projects", label: "Project Operations", desc: "Production and quick links", icon: Clapperboard },
];

type DashboardSectionTabsProps = {
  value: DashboardSection;
  onChange: (next: DashboardSection) => void;
};

/** Dashboard section switcher */
export function DashboardSectionTabs({ value, onChange }: DashboardSectionTabsProps) {
  return (
    <div className="admin-dashboard-section-tabs" role="tablist" aria-label="Dashboard sections">
      {SECTIONS.map((item) => {
        const active = value === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn("admin-dashboard-section-tab", active && "is-active")}
            onClick={() => onChange(item.id)}
          >
            <span className="admin-dashboard-section-tab-icon">
              <Icon className="h-4 w-4" />
            </span>
            <span className="admin-dashboard-section-tab-text">
              <span className="admin-dashboard-section-tab-label">{item.label}</span>
              <span className="admin-dashboard-section-tab-desc">{item.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
