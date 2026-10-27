import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { AdminTaskDetail } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { formatTaskDuration, taskBilling, taskDurations, taskStatusTone, taskUpstream } from "@/lib/taskObservability";
import { taskStatusLabel } from "@/lib/statusLabels";
import { cn, fenToYuan } from "@/lib/utils";

type TaskDetailSummaryProps = {
  task: AdminTaskDetail;
  now: number;
  onJump: (tab: "upstream" | "billing") => void;
};

function money(value: number | null | undefined): string {
  return value == null ? "—" : `¥${fenToYuan(value)}`;
}

// Copyable monospace text with long IDs truncated visually and the full value in the title.
export function CopyText({ value, className }: { value: string; className?: string }) {
  async function copy(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed. Select the text manually.");
    }
  }
  return (
    <span className={cn("task-copy", className)} title={value}>
      <span className="truncate">{value}</span>
      <button type="button" aria-label="Copy" onClick={(e) => void copy(e)}>
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}

// Keep key metrics visible at the top of the detail dialog without repeating them in the overview.
export function TaskDetailSummary({ task, now, onJump }: TaskDetailSummaryProps) {
  const tone = taskStatusTone(task.status);
  const duration = taskDurations(task, now);
  const billing = taskBilling(task);
  const upstream = taskUpstream(task);
  const waitingActivation = task.status === "pending" && task.next_action_at === null;
  const charged = billing.settled || (billing.chargedFen ?? 0) > 0;
  return (
    <div className={cn("task-summary", `is-${tone}`)}>
      <div className="task-summary-item">
        <span className="task-summary-label">Status</span>
        <div className="flex items-center gap-2">
          <span className={`admin-status-pill is-${tone}`}>{waitingActivation ? "Deferred" : taskStatusLabel(task.status)}</span>
          <span className="text-xs tabular-nums text-[var(--admin-muted)]">{task.progress_percent}%</span>
        </div>
        <div className="task-progress"><span style={{ width: `${task.progress_percent}%` }} /></div>
        <span className="task-summary-sub font-mono">{task.current_step_key || "Step not recorded"}{task.current_step_status ? ` · ${task.current_step_status}` : ""}</span>
      </div>

      <div className="task-summary-item">
        <span className="task-summary-label">{upstream.modelFromRequest ? "Model in Request" : "Model Selected for Task"}</span>
        <span className="task-summary-value break-all">{upstream.model || "Not recorded"}</span>
        <span className="task-summary-sub">Provider · {upstream.provider || "Not recorded"}</span>
      </div>

      <div className="task-summary-item">
        <span className="task-summary-label">Upstream<button type="button" className="task-summary-jump" onClick={() => onJump("upstream")}>View Requests</button></span>
        <Badge variant={upstream.latest?.phase === "failed" ? "destructive" : upstream.records.length ? "info" : "secondary"}>{upstream.phase}</Badge>
        {upstream.providerTaskId ? <CopyText value={upstream.providerTaskId} className="task-summary-sub" /> : <span className="task-summary-sub">Upstream Task ID not recorded</span>}
      </div>

      <div className="task-summary-item">
        <span className="task-summary-label">Duration{duration.live ? <span className="task-live-dot" title="Timer running" /> : null}</span>
        <span className="task-summary-value tabular-nums">{formatTaskDuration(duration.totalMs)}</span>
        <span className="task-summary-sub tabular-nums">
          Waiting {formatTaskDuration(duration.waitingMs)} · Running {duration.runningMs == null && !task.started_at && duration.live ? "Not started" : formatTaskDuration(duration.runningMs)}
        </span>
      </div>

      <div className="task-summary-item">
        <span className="task-summary-label">Billing · {billing.settled ? "Settled" : "Unsettled"}<button type="button" className="task-summary-jump" onClick={() => onJump("billing")}>Details</button></span>
        <span className="task-summary-value tabular-nums">{charged ? money(billing.chargedFen) : (billing.frozenFen ?? 0) > 0 ? `Frozen ${money(billing.frozenFen)}` : "Not charged"}</span>
        <span className="task-summary-sub tabular-nums">
          Estimated {money(billing.estimateFen)}{charged ? ` · Refunded ${money(billing.refundedFen)}` : ""}
        </span>
      </div>
    </div>
  );
}
