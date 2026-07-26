"use client";

import { useState, useMemo } from "react";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DataTableWrapper } from "@/components/ui/data-table-wrapper";
import { KpiCard } from "@/components/ui/kpi-card";
import { useMembers, useTasks, useBoardDecisions, useGovernanceSummary } from "@/hooks/use-governance";
import { useAuditLog } from "@/hooks/use-data";
import { MemberFormModal } from "@/components/member-form-modal";
import { MemberDetailModal } from "@/components/member-detail-modal";
import {
  Users, CheckSquare, FileText, Activity, Shield,
  UserCheck, Plus, GripVertical, Calendar, User as UserIcon,
  Loader2, X, LayoutGrid, List,
} from "lucide-react";
import { Member, Task, BoardDecision, AuditLogEntry } from "@/types";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

type Tab = "overview" | "members" | "tasks";

const TABS: { key: Tab; label: string; icon: typeof Shield }[] = [
  { key: "overview", label: "team.tab_overview", icon: Activity },
  { key: "members", label: "team.tab_members", icon: Users },
  { key: "tasks", label: "team.tab_tasks", icon: CheckSquare },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  editor: "bg-green-500/10 text-green-500 border-green-500/20",
  viewer: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export default function TeamPage() {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { members, isLoading: membersLoading, mutate: mutateMembers } = useMembers();
  const { tasks, isLoading: tasksLoading, mutate: mutateTasks } = useTasks();
  const { decisions, isLoading: decisionsLoading } = useBoardDecisions();
  const {
    activeMembers: summaryActiveMembers, totalOwnership,
    pendingTasks, completedTasks,
  } = useGovernanceSummary();

  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showTasksForm, setShowTasksForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const dateLocale = locale === "en" ? enUS : es;

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);
  const memberRoles = useMemo(() => {
    const counts = { admin: 0, editor: 0, viewer: 0 };
    for (const m of activeMembers) {
      if (m.role === "admin") counts.admin++;
      else if (m.role === "editor") counts.editor++;
      else if (m.role === "viewer") counts.viewer++;
    }
    return counts;
  }, [activeMembers]);

  const taskStats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { pending, inProgress, completed };
  }, [tasks]);

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((m) => m.id === id);
    return m?.full_name || null;
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as Task["status"] });
      mutateTasks();
      toast.success(t("tasks.updated", locale));
    } catch {
      toast.error(t("tasks.error_update", locale));
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm(t("tasks.confirm_delete", locale))) return;
    try {
      await deleteTask(id);
      toast.success(t("tasks.deleted", locale));
      mutateTasks();
    } catch {
      toast.error(t("tasks.error_delete", locale));
    }
  };

  async function handleTaskSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingTask(true);
    const form = new FormData(e.currentTarget);
    const data = {
      title: form.get("title") as string,
      description: (form.get("description") as string) || null,
      status: (form.get("status") as Task["status"]) || "pending",
      priority: (form.get("priority") as Task["priority"]) || "medium",
      assigned_to: (form.get("assigned_to") as string) || null,
      due_date: (form.get("due_date") as string) || null,
      module: (form.get("module") as string) || null,
    };
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
        toast.success(t("tasks.updated", locale));
      } else {
        await createTask(data);
        toast.success(t("tasks.created", locale));
      }
      setShowTasksForm(false);
      setEditingTask(null);
      mutateTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tasks.error_save", locale));
    } finally {
      setSavingTask(false);
    }
  }

  if (membersLoading && tasksLoading && decisionsLoading) {
    return <PageSkeleton kpiCount={6} rowCount={4} showCharts showSearch={false} />;
  }

  return (
    <div>
      <PageHeader
        badge={t("team.badge", locale)}
        title={t("team.title", locale)}
        subtitle={t("team.subtitle", locale)}
        breadcrumbs={[{ label: t("nav.team", locale) }]}
      >
        <div className="flex gap-2">
          {activeTab === "members" && (
            <button
              onClick={() => { setEditingMember(null); setShowMemberForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t("members.new_button", locale)}
            </button>
          )}
          {activeTab === "tasks" && (
            <button
              onClick={() => { setEditingTask(null); setShowTasksForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t("tasks.new_button", locale)}
            </button>
          )}
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tab.label, locale)}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <OverviewTab
          locale={locale}
          activeMembers={activeMembers}
          memberRoles={memberRoles}
          taskStats={taskStats}
          decisions={decisions}
          totalOwnership={totalOwnership}
          pendingTasks={pendingTasks}
          completedTasks={completedTasks}
          onSelectMember={(m) => setSelectedMember(m)}
        />
      )}

      {/* Tab: Members */}
      {activeTab === "members" && (
        <MembersTab
          locale={locale}
          members={members}
          onEdit={(m) => { setEditingMember(m); setShowMemberForm(true); }}
          onDelete={(id) => handleDeleteMember(id, mutateMembers, locale)}
          onSelect={(m) => setSelectedMember(m)}
        />
      )}

      {/* Tab: Tasks */}
      {activeTab === "tasks" && (
        <TasksTab
          locale={locale}
          localeFull={locale}
          tasks={tasks}
          dateLocale={dateLocale}
          getMemberName={getMemberName}
          onStatusChange={handleStatusChange}
          onEdit={(t) => { setEditingTask(t); setShowTasksForm(true); }}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Modals */}
      <MemberFormModal
        open={showMemberForm}
        onOpenChange={(o) => { setShowMemberForm(o); if (!o) setEditingMember(null); }}
        onSuccess={() => mutateMembers()}
        member={editingMember}
      />
      <MemberDetailModal
        open={!!selectedMember}
        onOpenChange={(o) => { if (!o) setSelectedMember(null); }}
        onSuccess={() => mutateMembers()}
        member={selectedMember}
        onEdit={() => { if (selectedMember) { setEditingMember(selectedMember); setShowMemberForm(true); } }}
      />

      {/* Task form inline */}
      {showTasksForm && (
        <TaskFormInline
          locale={locale}
          editingTask={editingTask}
          saving={savingTask}
          members={members}
          dateLocale={dateLocale}
          onSubmit={handleTaskSubmit}
          onCancel={() => { setShowTasksForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}

async function handleDeleteMember(id: string, mutate: () => void, locale: Locale) {
  if (!confirm(t("members.delete_confirm", locale))) return;
  try {
    const { deleteMember } = await import("@/lib/actions/members");
    await deleteMember(id);
    toast.success(t("members.deleted", locale));
    mutate();
  } catch {
    toast.error(t("members.error_delete", locale));
  }
}

/* ─── Overview Tab ─── */
function OverviewTab({
  locale, activeMembers, memberRoles, taskStats, decisions,
  totalOwnership, pendingTasks, completedTasks, onSelectMember,
}: {
  locale: Locale; activeMembers: Member[]; memberRoles: Record<string, number>;
  taskStats: Record<string, number>; decisions: BoardDecision[];
  totalOwnership: number; pendingTasks: number; completedTasks: number;
  onSelectMember: (m: Member) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label={t("team.kpi.active_members", locale)} value={String(activeMembers.length)} subtitle={t("team.kpi.of_team", locale)} icon={Users} accentColor="cyan" />
        <KpiCard label={t("team.kpi.total_ownership", locale)} value={`${(totalOwnership || 0).toFixed(1)}%`} subtitle={t("team.kpi.ownership_subtitle", locale)} icon={Shield} accentColor="green" />
        <KpiCard label={t("team.kpi.pending_tasks", locale)} value={String(taskStats.pending + taskStats.inProgress)} subtitle={`${taskStats.completed} ${t("team.kpi.completed_count", locale)}`} icon={CheckSquare} accentColor="amber" />
        <KpiCard label={t("team.kpi.decisions", locale)} value={String(decisions.length)} subtitle={t("team.kpi.approved_count", locale)} icon={FileText} accentColor="purple" />
        <KpiCard label={t("team.kpi.admins", locale)} value={String(memberRoles.admin)} subtitle={t("team.kpi.admins_subtitle", locale)} icon={UserCheck} accentColor="cyan" />
        <KpiCard label={t("team.kpi.editors", locale)} value={String(memberRoles.editor)} subtitle={t("team.kpi.editors_subtitle", locale)} icon={UserCheck} accentColor="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DataTableWrapper title={t("team.members", locale)} icon={Users}>
          <div className="p-3">
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("team.no_active_members", locale)}</p>
            ) : (
              <div className="space-y-1">
                {activeMembers.slice(0, 8).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMember(m)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors text-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                      {m.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.ownership_pct}% · {t(`role.${m.role}`, locale)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || ""}`}>
                      {t(`role.${m.role}`, locale)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DataTableWrapper>

        <RecentActivity locale={locale} />
      </div>

      {decisions.length > 0 && (
        <div className="mb-8">
          <DataTableWrapper title={t("team.recent_decisions", locale)} icon={FileText}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-3">{t("team.table.title", locale)}</th>
                    <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3">{t("team.table.status", locale)}</th>
                    <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3">{t("team.table.date", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.slice(0, 5).map((d) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">{d.title}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          d.status === "approved" ? "bg-green-500/10 text-green-500" :
                          d.status === "executed" ? "bg-blue-500/10 text-blue-500" :
                          d.status === "rejected" ? "bg-red-500/10 text-red-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {t(`status.${d.status}`, locale)}
                        </span>
                      </td>
                      <td className="p-3 text-end text-sm text-muted-foreground">
                        {d.decision_date ? new Date(d.decision_date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTableWrapper>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ locale }: { locale: Locale }) {
  const { log, isLoading } = useAuditLog();

  if (isLoading) {
    return (
      <DataTableWrapper title={t("team.recent_activity", locale)} icon={Activity}>
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DataTableWrapper>
    );
  }

  return (
    <DataTableWrapper title={t("team.recent_activity", locale)} icon={Activity}>
      <div className="p-3">
        {!log || log.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("team.no_activity", locale)}</p>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {log.slice(0, 10).map((entry: AuditLogEntry) => (
              <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/20">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  entry.action === "create" ? "bg-green-500" :
                  entry.action === "update" ? "bg-blue-500" :
                  entry.action === "delete" ? "bg-red-500" :
                  "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground capitalize">
                    <span className="font-medium">{entry.action}</span> {t("team.activity_on", locale)} {entry.entity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DataTableWrapper>
  );
}

/* ─── Members Tab ─── */
function MembersTab({
  locale, members, onEdit, onDelete, onSelect,
}: {
  locale: Locale; members: Member[];
  onEdit: (m: Member) => void;
  onDelete: (id: string) => void;
  onSelect: (m: Member) => void;
}) {
  return (
    <div>
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Users className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">{t("members.empty_title", locale)}</p>
          <p className="text-sm text-muted-foreground mb-3">{t("members.empty_subtitle", locale)}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-3">{t("members.table_name", locale)}</th>
                  <th scope="col" className="text-start text-xs font-medium text-muted-foreground p-3">{t("members.table_email", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3">{t("members.table_role", locale)}</th>
                  <th scope="col" className="text-end text-xs font-medium text-muted-foreground p-3">{t("members.table_participation", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3">{t("members.table_status", locale)}</th>
                  <th scope="col" className="text-center text-xs font-medium text-muted-foreground p-3">{t("members.table_actions", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <button onClick={() => onSelect(member)} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {member.full_name}
                      </button>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{member.email || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || ""}`}>
                        {t(`role.${member.role}`, locale)}
                      </span>
                    </td>
                    <td className="p-3 text-end">
                      <span className="text-sm font-display font-semibold text-foreground">
                        {member.ownership_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        member.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                        member.status === "deceased" ? "bg-rose-500/10 text-rose-400" :
                        "bg-amber-500/10 text-amber-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          member.status === "active" ? "bg-emerald-400" :
                          member.status === "deceased" ? "bg-rose-400" : "bg-amber-400"
                        }`} />
                        {t(`members.status_${member.status}`, locale)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(member)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title={t("members.edit", locale)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button
                          onClick={() => onDelete(member.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title={t("members.delete", locale)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <button onClick={() => onSelect(member)} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    {member.full_name}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(member)} className="p-1 rounded hover:bg-muted text-muted-foreground min-w-[44px] min-h-[44px]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    </button>
                    <button onClick={() => onDelete(member.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive min-w-[44px] min-h-[44px]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || ""}`}>
                    {t(`role.${member.role}`, locale)}
                  </span>
                  <span>{member.ownership_pct.toFixed(1)}%</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    member.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                    member.status === "deceased" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {t(`members.status_${member.status}`, locale)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tasks Tab ─── */
const TASK_COLUMNS = [
  { key: "pending", color: "bg-amber-500", icon: "○" },
  { key: "in_progress", color: "bg-blue-500", icon: "◎" },
  { key: "completed", color: "bg-emerald-500", icon: "●" },
] as const;

function PriorityDot({ priority, locale }: { priority: string; locale: Locale }) {
  const titles: Record<string, string> = {
    urgent: t("tasks.priority_dot_urgent", locale),
    high: t("tasks.priority_dot_high", locale),
    medium: t("tasks.priority_dot_medium", locale),
    low: t("tasks.priority_dot_low", locale),
  };
  if (priority === "urgent") return <span className="w-2 h-2 rounded-full bg-rose-500" title={titles.urgent} />;
  if (priority === "high") return <span className="w-2 h-2 rounded-full bg-amber-500" title={titles.high} />;
  if (priority === "medium") return <span className="w-2 h-2 rounded-full bg-blue-500" title={titles.medium} />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground" title={titles.low} />;
}

function TasksTab({
  locale, localeFull, tasks, dateLocale, getMemberName, onStatusChange, onEdit, onDelete,
}: {
  locale: Locale; localeFull: string; tasks: Task[]; dateLocale: import("date-fns").Locale;
  getMemberName: (id: string | null) => string | null;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {TASK_COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="bg-card border border-border rounded-xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <h3 className="text-sm font-semibold text-foreground">{t(`tasks.status_${col.key}`, locale)}</h3>
              <span className="ms-auto text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{columnTasks.length}</span>
            </div>
            <div
              className="p-2 space-y-2 min-h-[180px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) onStatusChange(taskId, col.key);
              }}
            >
              {columnTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{t("tasks.column_empty", locale)}</p>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                    className="bg-muted/30 border border-border/50 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <PriorityDot priority={task.priority} locale={locale} />
                            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.due_date), "dd/MM", { locale: dateLocale })}
                              </span>
                            )}
                            {getMemberName(task.assigned_to) && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {getMemberName(task.assigned_to)}
                              </span>
                            )}
                            {task.module && (
                              <span className="uppercase tracking-wider text-[9px]">{task.module}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => onEdit(task)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button
                          onClick={() => onDelete(task.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Task Form Inline ─── */
function TaskFormInline({
  locale, editingTask, saving, members, dateLocale, onSubmit, onCancel,
}: {
  locale: Locale; editingTask: Task | null; saving: boolean; members: Member[];
  dateLocale: import("date-fns").Locale; onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50" onClick={onCancel}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {editingTask ? t("tasks.edit_title", locale) : t("tasks.new_title", locale)}
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-muted text-muted-foreground min-w-[44px] min-h-[44px]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            name="title"
            required
            defaultValue={editingTask?.title || ""}
            placeholder={t("tasks.placeholder_title", locale)}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <select name="status" defaultValue={editingTask?.status || "pending"}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm">
              <option value="pending">{t("tasks.status_pending", locale)}</option>
              <option value="in_progress">{t("tasks.status_in_progress", locale)}</option>
              <option value="completed">{t("tasks.status_completed", locale)}</option>
            </select>
            <select name="priority" defaultValue={editingTask?.priority || "medium"}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm">
              <option value="low">{t("tasks.priority_low", locale)}</option>
              <option value="medium">{t("tasks.priority_medium", locale)}</option>
              <option value="high">{t("tasks.priority_high", locale)}</option>
              <option value="urgent">{t("tasks.priority_urgent", locale)}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="module" defaultValue={editingTask?.module || ""}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm">
              <option value="">{t("tasks.module_label", locale)}</option>
              <option value="documents">{t("tasks.module_documents", locale)}</option>
              <option value="fba">{t("tasks.module_fba", locale)}</option>
              <option value="general">{t("tasks.module_general", locale)}</option>
            </select>
            <input name="due_date" type="date" defaultValue={editingTask?.due_date?.split("T")[0] || ""}
              className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm" />
          </div>
          <select name="assigned_to" defaultValue={editingTask?.assigned_to || ""}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm">
            <option value="">{t("tasks.unassigned", locale)}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <textarea name="description" rows={2} defaultValue={editingTask?.description || ""}
            placeholder={t("tasks.placeholder_description", locale)}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground">
              {t("common.cancel", locale)}
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTask ? t("tasks.update", locale) : t("tasks.create", locale)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
