import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Ban, Layers, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api, type AdminTaskListRes, type AdminTaskRow, type AdminTaskStats } from "@/api/client";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { AdminUserSearchSelect } from "@/components/admin/AdminUserSearchSelect";
import { StatCard } from "@/components/admin/StatCard";
import { PageSection } from "@/components/admin/PageSection";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskListRow } from "@/components/tasks/TaskListRow";
import { PageHeader, Toolbar } from "@/components/ui/page";
import { PaginationBar } from "@/components/PaginationBar";
import { useAdminDetailQuery } from "@/hooks/useAdminDetailQuery";
import { useTaskClock } from "@/hooks/useTaskClock";
import { canCancelTask, taskBilling, taskUpstream } from "@/lib/taskObservability";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { taskDomainLabel, taskTypeLabel } from "@/lib/statusLabels";

const REFRESH_MS = 15000;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

function formatElapsed(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "No record";
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m ${value % 60}s`;
  return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
}

// 统一任务平台监控页
export function QueuesPage() {
  /*
   * stats 平台聚合统计
   * data 分页任务列表
   * loading 首次加载
   * refreshing 刷新中
   * page / pageSize 分页
   * q 搜索关键词
   * domain / status 筛选
   * viewTab 快捷视图
   * cancelLoading 取消中的任务 id
   */
  const [stats, setStats] = useState<AdminTaskStats | null>(null);
  const [data, setData] = useState<AdminTaskListRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [taskType, setTaskType] = useState("");
  const [viewTab, setViewTab] = useState<"all" | "active">("all");
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const apiOnlyNode = stats?.scheduler === "disabled";
  const taskDetail = useAdminDetailQuery("task");
  const taskViews = useMemo(() => (data?.items || []).map((task) => ({ task, upstream: taskUpstream(task), billing: taskBilling(task) })), [data]);
  const now = useTaskClock(data?.items.some((task) => !TERMINAL_STATUSES.has(task.status)) ?? false);

  const loadStats = useCallback(async () => {
    const res = await api<AdminTaskStats>("/api/admin/tasks/stats");
    setStats(res);
  }, []);

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (domain) params.set("domain", domain);
        if (status) params.set("status", status);
        if (filterUserId) params.set("user_id", String(filterUserId));
        if (taskType.trim()) params.set("task_type", taskType.trim());
        if (q.trim()) params.set("q", q.trim());
        if (viewTab === "active" && !status) params.set("active_only", "true");
        const res = await api<AdminTaskListRes>(`/api/admin/tasks?${params}`);
        setData(res);
      } catch (err) {
        if (!silent) {
          toast.error(err instanceof Error ? err.message : "Failed to load tasks");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [domain, filterUserId, page, pageSize, q, status, taskType, viewTab],
  );

  const refreshAll = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        await Promise.all([loadStats(), loadTasks(true)]);
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Refresh failed");
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [loadStats, loadTasks],
  );

  useEffect(() => {
    void refreshAll();
  }, [page, pageSize, domain, status, q, viewTab, filterUserId, taskType, refreshAll]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshAll(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshAll]);

  function openDetail(taskId: number) {
    taskDetail.open(taskId);
  }

  const handleCancel = useCallback(
    async (task: AdminTaskRow) => {
      if (!canCancelTask(task)) return;
      if (!window.confirm(`Cancel task #${task.id} (${taskTypeLabel(task.task_type)})?`)) return;
      setCancelLoading(task.id);
      try {
        await api(`/api/admin/tasks/${task.id}/cancel`, { method: "POST" });
        toast.success("Cancellation request submitted");
        await refreshAll(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel task");
      } finally {
        setCancelLoading(null);
      }
    },
    [refreshAll],
  );

  const domainOptions = useMemo(() => {
    const fromStats = stats?.domains.map((d) => d.domain) ?? [];
    return Array.from(new Set(fromStats));
  }, [stats]);

  return (
    <div className="admin-page">
      <PageHeader
        description={`Unified task platform · Auto-refresh every ${REFRESH_MS / 1000}s · ${apiOnlyNode ? "API-only node / tasks handled by worker nodes" : `Node concurrency ${stats?.scheduler_running_jobs ?? 0}/${stats?.max_concurrency ?? 0}`}`}
        actions={
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => void refreshAll()}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        }
      />

      {loading && !stats ? (
        <div className="admin-panel flex items-center justify-center py-16 text-[var(--admin-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pending"
              value={stats?.pending_count ?? 0}
              hint={`Ready ${stats?.pending_ready_count ?? "—"} · Deferred ${stats?.pending_deferred_count ?? "—"} · Delayed ${stats?.pending_delayed_count ?? "—"}`}
              icon={Layers}
              tone="warn"
            />
            <StatCard
              label="Active"
              value={stats?.active_count ?? 0}
              hint={`Running ${stats?.running_count ?? 0} · Polling ${stats?.awaiting_poll_count ?? 0} · Cancelling ${stats?.cancel_requested_count ?? 0}`}
              icon={Activity}
              tone="info"
            />
            <StatCard
              label="Node Worker Slots"
              value={
                apiOnlyNode ? <span className="text-lg">API Only</span> : <>
                  {stats?.scheduler_running_jobs ?? 0}
                  <span className="text-lg text-[var(--admin-muted)]"> / {stats?.max_concurrency ?? 0}</span>
                </>
              }
              hint={apiOnlyNode ? "Tasks handled by worker nodes" : `Leased across all nodes: ${stats?.leased_count ?? 0}`}
              icon={RefreshCw}
            />
            <div className="admin-panel admin-stat-card tone-success">
              <div className="admin-stat-icon">
                <Ban className="h-5 w-5" />
              </div>
              <div className="admin-stat-label">Completed Task Stats</div>
              <div className="admin-stat-value !text-base !leading-relaxed">
                Succeeded {stats?.succeeded_count ?? 0} · Failed {stats?.failed_count ?? 0} · Cancelled{" "}
                {stats?.cancelled_count ?? 0}
              </div>
              <div className="admin-stat-hint">
                Updated {stats?.fetched_at ? new Date(stats.fetched_at).toLocaleTimeString() : "—"}
              </div>
            </div>
          </div>

          <div className="admin-panel mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-xs text-[var(--admin-muted)]">
            <span className={cn("admin-status-pill", stats?.runtime_healthy === undefined ? "" : stats.runtime_healthy ? "is-done" : "is-fail")}>
              {apiOnlyNode ? "API-only node" : `Runtime: ${stats?.runtime_healthy === undefined ? "Unknown" : stats.runtime_healthy ? "Healthy" : "Unhealthy"}`}
            </span>
            {apiOnlyNode ? <span>API-only node / tasks handled by worker nodes</span> : <>
              <span>Scheduler {stats?.scheduler ?? "—"} · Poller {stats?.poller ?? "—"} · Watchdog {stats?.watchdog ?? "—"}</span>
              <span>Last successful schedule: {stats?.scheduler_success_age_sec == null ? "No record" : `${formatElapsed(stats.scheduler_success_age_sec)} ago`}</span>
              <span>Consecutive failures: {stats?.scheduler_consecutive_failures ?? "—"}</span>
            </>}
            <span>Oldest ready task waiting: {formatElapsed(stats?.oldest_ready_wait_sec)}</span>
            <span>Deferred tasks are waiting for prerequisites or capacity; delayed tasks are not due for scheduling yet.</span>
          </div>

          {(stats?.domains.length ?? 0) > 0 ? (
            <PageSection title="Tasks by Domain" bodyClassName="!pt-0">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {stats?.domains.map((d) => (
                  <div key={d.domain} className="admin-domain-card">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{taskDomainLabel(d.domain)}</div>
                        <div className="mt-0.5 font-mono text-xs text-[var(--admin-muted)]">{d.domain}</div>
                      </div>
                      <span
                        className={cn(
                          "admin-status-pill",
                          d.pending + d.active > 0 ? "is-warn" : "is-done",
                        )}
                      >
                        {d.pending + d.active}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--admin-muted)]">
                      Pending {d.pending} · Active {d.active} · Succeeded {d.succeeded}
                    </div>
                  </div>
                ))}
              </div>
            </PageSection>
          ) : null}

          <PageSection
            title="Task List"
            actions={
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["active", `Active (${stats?.pending_count ?? 0}+${stats?.active_count ?? 0})`],
                    ["all", "All"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn("admin-tab !min-h-[30px] !px-3 !text-xs", viewTab === key && "is-active")}
                    onClick={() => {
                      setViewTab(key);
                      setPage(1);
                      if (key === "active") setStatus("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
            bodyClassName="space-y-4 !pt-0"
          >
            <Toolbar>
              <select
                className="admin-select"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All domains</option>
                {domainOptions.map((d) => (
                  <option key={d} value={d}>
                    {taskDomainLabel(d)}
                  </option>
                ))}
              </select>
              <select
                className="admin-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  if (e.target.value) setViewTab("all");
                }}
              >
                <option value="">All statuses</option>
                {Object.entries({
                  pending: "Pending",
                  leased: "Leased",
                  running: "Running",
                  awaiting_poll: "Awaiting Poll",
                  cancel_requested: "Cancelling",
                  succeeded: "Succeeded",
                  failed: "Failed",
                  cancelled: "Cancelled",
                }).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <AdminUserSearchSelect
                value={filterUserId}
                onChange={(id) => {
                  setFilterUserId(id);
                  setPage(1);
                }}
              />
              <input
                className="admin-input"
                placeholder="Task type"
                value={taskType}
                onChange={(e) => {
                  setTaskType(e.target.value);
                  setPage(1);
                }}
              />
              <AdminSearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Task type / user email / dedupe_key"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setQ(searchInput);
                    setPage(1);
                  }
                }}
              />
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-filter-action"
                onClick={() => {
                  setQ(searchInput);
                  setPage(1);
                }}
              >
                Search
              </button>
            </Toolbar>

            <div className="admin-table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Task / Model</th>
                    <th>Status</th>
                    <th>Upstream</th>
                    <th>Billing</th>
                    <th>Duration</th>
                    <th>User / Reference</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="admin-empty !py-10">
                          <div className="admin-empty-title">No tasks found</div>
                          <div className="admin-empty-desc">Switch to “All” to view task history</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    taskViews.map(({ task, upstream, billing }) => (
                      <TaskListRow
                        key={task.id}
                        task={task}
                        upstream={upstream}
                        billing={billing}
                        now={now}
                        cancelling={cancelLoading === task.id}
                        onOpen={openDetail}
                        onCancel={(row) => void handleCancel(row)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {data?.meta ? (
              <PaginationBar
                page={page}
                pageSize={pageSize}
                total={data.meta.total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            ) : null}
          </PageSection>
        </>
      )}

      <TaskDetailDialog
        taskId={taskDetail.id}
        open={taskDetail.isOpen}
        onOpenChange={(open) => {
          if (!open) taskDetail.close();
        }}
        onCancelled={() => void refreshAll(true)}
      />
    </div>
  );
}
