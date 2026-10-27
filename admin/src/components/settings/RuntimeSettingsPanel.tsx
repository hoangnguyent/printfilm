import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { api, type AdminModelSettings } from "@/api/client";
import {
  LabeledControl,
  SettingsLoading,
  SettingsPanel,
  SettingsStatusBar,
  SettingsTabShell,
} from "@/components/settings/SettingsPanel";
import { Switch } from "@/components/ui/switch";

// Runtime configuration (concurrency, quality, mock mode, and other flat fields)
export function RuntimeSettingsPanel() {
  const [form, setForm] = useState<AdminModelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<AdminModelSettings>("/api/admin/settings/models");
      setForm(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statusItems = useMemo(
    () =>
      (form?.readiness ?? []).map((item) => ({
        id: item.capability,
        label: item.label,
        ready: item.ready,
        readyText: item.model || "Ready",
        pendingText: "Not ready",
      })),
    [form?.readiness],
  );

  function patchField<K extends keyof AdminModelSettings>(key: K, value: AdminModelSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const body = {
        ark_image_size: form.ark_image_size,
        ark_video_resolution: form.ark_video_resolution,
        ark_video_ratio: form.ark_video_ratio,
        seedance_duration_min: form.seedance_duration_min,
        seedance_duration_max: form.seedance_duration_max,
        ark_video_poll_interval: form.ark_video_poll_interval,
        ark_video_poll_timeout: form.ark_video_poll_timeout,
        pipeline_image_concurrency: form.pipeline_image_concurrency,
        pipeline_video_concurrency: form.pipeline_video_concurrency,
        pipeline_audio_concurrency: form.pipeline_audio_concurrency,
        task_runtime_max_concurrency: form.task_runtime_max_concurrency,
        task_user_max_concurrency: form.task_user_max_concurrency,
        task_poll_max_concurrency: form.task_poll_max_concurrency,
        drama_user_video_job_limit: form.drama_user_video_job_limit,
        drama_fragment_max_attempts: form.drama_fragment_max_attempts,
        ark_mock: form.ark_mock,
      };
      await api("/api/admin/settings/models", { method: "PATCH", body: JSON.stringify(body) });
      await load();
      toast.success("Runtime settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return <SettingsLoading />;
  }

  return (
    <SettingsTabShell onSave={() => void handleSave()} saving={saving}>
      <SettingsStatusBar
        title="Routing Status"
        items={
          statusItems.length > 0
            ? statusItems
            : [{ id: "empty", label: "Capability Routing", ready: false, pendingText: "Enter an API key and select models under Models first" }]
        }
        extra={
          <span className="settings-status-extra">
            {form.readiness?.every((item) => item.ready) ? "All four capabilities are ready" : "Enter a TokenFree API key and select models under Models"}
          </span>
        }
      />

      <div className="settings-routing-grid">
        <SettingsPanel
          className="settings-panel--compact"
          title="1. Quality & Defaults"
          description="Image size, video resolution, Seedance duration, and polling"
        >
          <div className="settings-field-grid">
            <LabeledControl label="Default Image Size">
              <input
                className="settings-input"
                value={form.ark_image_size}
                onChange={(e) => patchField("ark_image_size", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label="Default Video Resolution">
              <input
                className="settings-input"
                value={form.ark_video_resolution}
                onChange={(e) => patchField("ark_video_resolution", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label="Default Video Aspect Ratio">
              <input
                className="settings-input"
                value={form.ark_video_ratio}
                onChange={(e) => patchField("ark_video_ratio", e.target.value)}
              />
            </LabeledControl>
            <LabeledControl label="Seedance Minimum Duration (seconds)">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.seedance_duration_min}
                onChange={(e) => patchField("seedance_duration_min", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Seedance Maximum Duration (seconds)">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.seedance_duration_max}
                onChange={(e) => patchField("seedance_duration_max", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Video Polling Interval (seconds)">
              <input
                className="settings-input"
                type="number"
                step="0.5"
                value={form.ark_video_poll_interval}
                onChange={(e) => patchField("ark_video_poll_interval", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Video Polling Timeout (seconds)">
              <input
                className="settings-input"
                type="number"
                value={form.ark_video_poll_timeout}
                onChange={(e) => patchField("ark_video_poll_timeout", Number(e.target.value))}
              />
            </LabeledControl>
          </div>
        </SettingsPanel>

        <SettingsPanel
          className="settings-panel--compact"
          title="2. Concurrency & Limits"
          description="Pipeline concurrency, task slots, and drama storyboard limits"
        >
          <div className="settings-field-grid">
            <LabeledControl label="Image Generation Concurrency">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.pipeline_image_concurrency}
                onChange={(e) => patchField("pipeline_image_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Video Generation Concurrency">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.pipeline_video_concurrency}
                onChange={(e) => patchField("pipeline_video_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Voice Generation Concurrency">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.pipeline_audio_concurrency}
                onChange={(e) => patchField("pipeline_audio_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Task Runtime Slots (Global)">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.task_runtime_max_concurrency}
                onChange={(e) => patchField("task_runtime_max_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Task Slots per User">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.task_user_max_concurrency}
                onChange={(e) => patchField("task_user_max_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Selector Polling Concurrency">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.task_poll_max_concurrency}
                onChange={(e) => patchField("task_poll_max_concurrency", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="In-Flight Drama Videos per User">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.drama_user_video_job_limit}
                onChange={(e) => patchField("drama_user_video_job_limit", Number(e.target.value))}
              />
            </LabeledControl>
            <LabeledControl label="Maximum Storyboard Video Attempts">
              <input
                className="settings-input"
                type="number"
                min={1}
                value={form.drama_fragment_max_attempts}
                onChange={(e) => patchField("drama_fragment_max_attempts", Number(e.target.value))}
              />
            </LabeledControl>
          </div>
          <div className="settings-toggle-row mt-3">
            <div>
              <strong>ARK Mock Mode</strong>
              <span>Simulates generation in development without calling the upstream provider</span>
            </div>
            <Switch checked={form.ark_mock} onCheckedChange={(v) => patchField("ark_mock", v)} />
          </div>
        </SettingsPanel>
      </div>

      <SettingsPanel className="settings-panel--compact" title="3. Runtime Summary" description="Active Worker / Selector slots">
        <div className="settings-runtime-summary">
          <div className="settings-runtime-summary-row">
            <Activity className="h-4 w-4 text-[var(--admin-forest)]" />
            <span>
              Worker slots <strong>{form.task_runtime_max_concurrency}</strong> · Per-user{" "}
              <strong>{form.task_user_max_concurrency}</strong>
            </span>
          </div>
          <p className="settings-runtime-summary-hint">
            Selector runs up to {form.task_poll_max_concurrency} non-blocking upstream queries per cycle; awaiting_poll tasks do not occupy Worker slots.
          </p>
        </div>
      </SettingsPanel>
    </SettingsTabShell>
  );
}
