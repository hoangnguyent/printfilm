import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AdminLedger, PageResult } from "@/api/client";
import { listAdminLedger } from "@/api/finance";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminEntityLink } from "@/components/admin/AdminEntityLink";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminUserSearchSelect } from "@/components/admin/AdminUserSearchSelect";
import { PageSection } from "@/components/admin/PageSection";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fenToYuan } from "@/lib/utils";

type LedgerRes = PageResult<AdminLedger>;

type DirectionFilter = "" | "credit" | "debit";

/** Label adjustment direction: positive for credit, negative for debit */
function directionLabel(deltaFen: number): string {
  return deltaFen >= 0 ? "Credit" : "Debit";
}

/** Admin balance adjustments: show wallet ledger entries with ref_type=admin */
export function AdjustRecordsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [direction, setDirection] = useState<DirectionFilter>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LedgerRes | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      try {
        // Admin ledger entries use kind=adjust for debits and kind=grant for credits.
        setData(await listAdminLedger(nextPage, {
          refType: "admin",
          userId,
          kind: direction === "credit" ? "grant" : direction === "debit" ? "adjust" : "",
          dateFrom,
          dateTo,
        }));
      } catch (err) {
        setData(null);
        toast.error(err instanceof Error ? err.message : "Failed to load adjustment records");
      } finally {
        setLoading(false);
      }
    },
    [page, userId, direction, dateFrom, dateTo],
  );

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const rows = data?.items ?? [];

  return (
    <div className="admin-page">
      <PageHeader description="Balance adjustments made from user management, including the operator and note" />

      <AdminFilterBar>
        <AdminUserSearchSelect value={userId} onChange={setUserId} />
        <Select
          value={direction}
          onChange={(e) => setDirection(e.target.value as DirectionFilter)}
        >
          <option value="">All directions</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </Select>
        <AdminDateRangeFilter
          from={dateFrom}
          to={dateTo}
          onChange={({ from, to }) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          className="admin-filter-action"
          onClick={() => {
            setPage(1);
            void load(1);
          }}
        >
          Filter
        </Button>
      </AdminFilterBar>

      <PageSection
        title="Manual Balance Adjustments"
        description={data ? `${data.meta.total} records` : undefined}
        bodyClassName="!pt-0"
      >
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="!text-center text-[var(--admin-muted)]">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="!text-center text-[var(--admin-muted)]">
                    No manual adjustment records
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <AdminEntityLink kind="user" id={row.user_id} label={row.user_email ?? undefined} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.delta_fen >= 0 ? "success" : "secondary"}>
                        {directionLabel(row.delta_fen)}
                      </Badge>
                    </TableCell>
                    <TableCell className={row.delta_fen >= 0 ? "text-emerald-700" : "text-red-600"}>
                      {row.delta_fen >= 0 ? "+" : ""}¥{fenToYuan(row.delta_fen)}
                    </TableCell>
                    <TableCell>¥{fenToYuan(row.balance_after)}</TableCell>
                    <TableCell>
                      {row.ref_id && /^\d+$/.test(row.ref_id) ? (
                        <AdminEntityLink
                          kind="user"
                          id={Number(row.ref_id)}
                          label={row.operator_email ?? undefined}
                        />
                      ) : (
                        row.operator_email || "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate" title={row.note || undefined}>
                      {row.note || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data ? (
          <PaginationBar
            page={data.meta.page}
            pageSize={data.meta.page_size}
            total={data.meta.total}
            onPageChange={setPage}
          />
        ) : null}
      </PageSection>
    </div>
  );
}
