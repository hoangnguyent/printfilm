import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { OssSettingsPanel } from "@/components/settings/OssSettingsPanel";
import { PaymentSettingsPanel } from "@/components/settings/PaymentSettingsPanel";
import { RoutingSettingsPanel } from "@/components/settings/RoutingSettingsPanel";
import { RuntimeSettingsPanel } from "@/components/settings/RuntimeSettingsPanel";
import { SiteSettingsPanel } from "@/components/settings/SiteSettingsPanel";
import {
  SettingsSaveProvider,
  useSettingsSaveSlot,
} from "@/components/settings/SettingsSaveContext";
import { cn } from "@/lib/utils";

type SettingsTab = "routing" | "runtime" | "oss" | "payment" | "site";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "routing", label: "Models" },
  { id: "runtime", label: "Runtime" },
  { id: "oss", label: "Storage (OSS)" },
  { id: "payment", label: "Payments & Billing" },
  { id: "site", label: "Site & Tools" },
];

// 页头：标题 + 统一保存按钮
function SettingsPageHeader() {
  const { action } = useSettingsSaveSlot();
  return (
    <header className="settings-page-hero">
      <div className="min-w-0">
        <h1 className="settings-page-title">System Settings</h1>
        <p className="settings-head-desc">
          Configure the TokenFree API key, runtime, OSS, payments, billing, and site settings. Secrets are encrypted; leave a field blank to keep its current value.
        </p>
      </div>
      {action ? (
        <button
          type="button"
          className="admin-btn admin-btn-primary settings-save-btn"
          disabled={action.saving}
          onClick={() => void action.onSave()}
        >
          {action.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {action.label ?? "Save"}
        </button>
      ) : null}
    </header>
  );
}

// 系统设置内容区
function SettingsPageInner() {
  const [tab, setTab] = useState<SettingsTab>("routing");

  return (
    <div className="settings-page admin-page">
      <SettingsPageHeader />

      <div className="settings-tabs" role="tablist" aria-label="System settings sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn("settings-tab", tab === id && "is-active")}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="settings-main">
        {tab === "routing" ? <RoutingSettingsPanel /> : null}
        {tab === "runtime" ? <RuntimeSettingsPanel /> : null}
        {tab === "oss" ? <OssSettingsPanel /> : null}
        {tab === "payment" ? <PaymentSettingsPanel /> : null}
        {tab === "site" ? <SiteSettingsPanel /> : null}
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <SettingsSaveProvider>
      <SettingsPageInner />
    </SettingsSaveProvider>
  );
}
