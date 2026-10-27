import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type AdminStats, type AdminUserRow, type PageMeta } from "@/api/client";
import { AdminField } from "@/components/admin/AdminField";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminListStats } from "@/components/admin/AdminListStats";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { UserDetailDrawer } from "@/components/admin/UserDetailDrawer";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminDetailQuery } from "@/hooks/useAdminDetailQuery";
import { formatAccountId } from "@/lib/admin-account";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { fenToYuan } from "@/lib/utils";

type ListRes = { items: AdminUserRow[]; meta: PageMeta };

// 用户管理：搜索、筛选、只读明细与编辑
export function UsersPage() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ListRes | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState({
    role: "user",
    /** increase=增加 / decrease=减少 */
    balance_dir: "increase" as "increase" | "decrease",
    /** 调账金额（元），空表示不改余额 */
    balance_amount_yuan: "",
    balance_note: "",
  });
  const [saving, setSaving] = useState(false);
  const userDetail = useAdminDetailQuery("user");

  async function load(nextPage = page, nextQ = q, nextSize = pageSize) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(nextSize),
      });
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (roleFilter) params.set("role", roleFilter);
      const res = await api<ListRes>(`/api/admin/users?${params}`);
      setData(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    void api<AdminStats>("/api/admin/stats?days=7")
      .then(setStats)
      .catch((err) => {
        setStats(null);
        toast.error(err instanceof Error ? err.message : "Failed to load statistics");
      });
  }, []);

  useEffect(() => {
    if (!userDetail.id || !data?.items) return;
    const hit = data.items.find((u) => u.id === userDetail.id);
    if (hit) setDetailUser(hit);
  }, [userDetail.id, data?.items]);

  function openEdit(user: AdminUserRow) {
    setEditing(user);
    setForm({
      role: user.role || "user",
      balance_dir: "increase",
      balance_amount_yuan: "",
      balance_note: "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: {
        role: string;
        balance_delta_fen?: number;
        balance_note?: string;
      } = { role: form.role };

      const amountRaw = form.balance_amount_yuan.trim();
      if (amountRaw) {
        const amountYuan = parseFloat(amountRaw);
        if (Number.isNaN(amountYuan) || amountYuan < 0) {
          throw new Error("Adjustment amount must be a non-negative number");
        }
        const amountFen = Math.round(amountYuan * 100);
        if (amountFen > 0) {
          const signed = form.balance_dir === "decrease" ? -amountFen : amountFen;
          if (form.balance_dir === "decrease" && signed + editing.balance_fen < 0) {
            throw new Error("Balance cannot be negative after the deduction");
          }
          payload.balance_delta_fen = signed;
          payload.balance_note = form.balance_note || undefined;
        }
      }

      await api(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success(payload.balance_delta_fen ? "Balance adjusted and saved" : "Saved");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function applyFilters() {
    setPage(1);
    void load(1, q, pageSize);
  }

  return (
    <div className="admin-list-page">
      <PageHeader description="Search users and manage roles and balances" />

      <AdminFilterBar>
        <AdminSearchInput
          value={q}
          onChange={setQ}
          placeholder="Search email / name / account ID"
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </Select>
        <Button size="sm" className="admin-filter-action" onClick={applyFilters} disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </Button>
      </AdminFilterBar>

      <AdminListStats
        items={[
          { label: "Total Users", value: stats?.user_count ?? (loading ? "…" : "—") },
          {
            label: "Calls This Month",
            value: stats != null ? (stats.usage_calls_month ?? 0) : loading ? "…" : "—",
            hint: stats ? `Today: ${stats.usage_calls_today ?? 0}` : undefined,
          },
          {
            label: "Total Calls",
            value: stats != null ? (stats.usage_calls_total ?? 0) : loading ? "…" : "—",
          },
        ]}
      />

      <div className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>On Hold</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs text-[#909399]">{formatAccountId(u.id)}</TableCell>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.nickname || "—"}</TableCell>
                <TableCell className="text-xs">{u.phone || "—"}</TableCell>
                <TableCell className="tabular-nums">¥{fenToYuan(u.balance_fen)}</TableCell>
                <TableCell className="tabular-nums">¥{fenToYuan(u.frozen_fen)}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "success" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetailUser(u);
                        userDetail.open(u.id);
                      }}
                    >
                      View
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <EmptyState title="No users found" description="Try searching for another term" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && (
          <PaginationBar
            page={data.meta.page}
            pageSize={pageSize}
            total={data.meta.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </div>

      <UserDetailDrawer
        userId={userDetail.id}
        open={userDetail.isOpen}
        onOpenChange={(open) => {
          if (!open) userDetail.close();
        }}
        initialUser={detailUser}
      />

      <AdminModal
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        size="md"
        title="Edit User"
        subtitle={editing?.email}
        footer={
          <Button className="w-full sm:w-auto" disabled={saving} onClick={() => void saveEdit()}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        }
      >
        <div className="admin-form-grid admin-form-grid--2">
          <AdminField label="Role">
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </Select>
          </AdminField>
          <AdminField label="Current Balance" hint="Read-only">
            <Input value={editing ? `¥${fenToYuan(editing.balance_fen)}` : "—"} disabled readOnly />
          </AdminField>
          <AdminField label="Adjustment">
            <Select
              value={form.balance_dir}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  balance_dir: e.target.value === "decrease" ? "decrease" : "increase",
                }))
              }
            >
              <option value="increase">Add</option>
              <option value="decrease">Deduct</option>
            </Select>
          </AdminField>
          <AdminField
            label="Adjustment Amount (CNY)"
            hint={
              form.balance_amount_yuan.trim()
                ? form.balance_dir === "increase"
                  ? "This amount will be added to the balance"
                  : "This amount will be deducted from the balance"
                : "Leave blank to keep the balance unchanged"
            }
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.balance_amount_yuan}
              onChange={(e) => setForm((f) => ({ ...f, balance_amount_yuan: e.target.value }))}
              placeholder="e.g. 100"
            />
          </AdminField>
          <AdminField label="Adjustment Note" hint="Optional; recorded in the ledger only when the balance changes">
            <Input
              value={form.balance_note}
              onChange={(e) => setForm((f) => ({ ...f, balance_note: e.target.value }))}
              placeholder="Admin note"
            />
          </AdminField>
        </div>
      </AdminModal>
    </div>
  );
}
