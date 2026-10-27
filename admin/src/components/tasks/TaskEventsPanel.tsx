import type { AdminTaskDetail } from "@/api/client";
import { PaginationBar } from "@/components/PaginationBar";
import { Button } from "@/components/ui/button";
import { useTaskEventPage } from "@/hooks/useTaskEventPage";
import { prettyJson } from "@/lib/jsonPreview";
import { redactTaskData, redactTaskText } from "@/lib/taskObservability";

// Paginate task history instead of rendering all events at once.
export function TaskEventsPanel({ task }: { task: AdminTaskDetail }) {
  const refreshToken = `${task.events_total}:${task.updated_at}:${task.status}`;
  const history = useTaskEventPage(task.id, refreshToken);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--admin-muted)]">Events are paginated by descending ID. History remains in the database and is not lost when details are truncated.</p>
        <Button size="sm" variant="outline" disabled={history.loading} onClick={history.refresh}>Refresh Events</Button>
      </div>
      {history.error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{history.error}<Button className="ml-3" variant="outline" size="sm" onClick={history.refresh}>Retry</Button></div> : null}
      {history.loading ? <p className="py-8 text-center text-sm text-[var(--admin-muted)]" role="status">Loading events…</p> : !history.error ? (
        <div className="task-detail-events">
          {history.data?.items.length ? history.data.items.map((event) => (
            <div key={event.id} className="task-detail-event">
              <div className="task-detail-event-head">
                <span className="font-mono text-xs">#{event.id} · {event.event_type}</span>
                <span className="text-[11px] text-[var(--admin-muted)]">{event.created_at ? new Date(event.created_at).toLocaleString() : "Not recorded"}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--admin-muted)]">
                {event.status ? <span>status={event.status}</span> : null}
                {event.phase ? <span>phase={event.phase}</span> : null}
              </div>
              {event.message ? <p className="mt-1 text-sm">{redactTaskText(event.message)}</p> : null}
              {event.payload ? <details className="mt-3"><summary className="cursor-pointer text-xs text-[var(--admin-muted)]">Event Data (Redacted)</summary><pre className="task-detail-json task-detail-json--compact mt-2">{prettyJson(redactTaskData(event.payload))}</pre></details> : null}
            </div>
          )) : <p className="text-sm text-[var(--admin-muted)]">No events on this page</p>}
        </div>
      ) : null}
      {history.data ? <PaginationBar page={history.page} pageSize={history.pageSize} total={history.data.total} onPageChange={history.setPage} onPageSizeChange={history.changePageSize} pageSizeOptions={[20, 50, 100]} /> : null}
    </div>
  );
}
