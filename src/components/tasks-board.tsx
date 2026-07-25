"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Task, Member } from "@/types";
import { Plus, Loader2, Calendar, User, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { t, type Locale } from "@/lib/i18n/translations";
import { useLocale } from "@/lib/i18n/locale-context";

const COLUMNS = [
  { key: "pending", color: "bg-amber-500" },
  { key: "in_progress", color: "bg-blue-500" },
  { key: "completed", color: "bg-emerald-500" },
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

interface TasksBoardProps {
  tasks: Task[];
  members: Member[];
}

export function TasksBoard({ tasks, members }: TasksBoardProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  const dateLocale = locale === "en" ? enUS : es;

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    const member = members.find((m) => m.id === id);
    return member?.full_name || null;
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as Task["status"] });
      router.refresh();
    } catch {
      toast.error(t("tasks.error_update", locale));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("tasks.confirm_delete", locale))) return;
    try {
      await deleteTask(id);
      toast.success(t("tasks.deleted", locale));
      router.refresh();
    } catch {
      toast.error(t("tasks.error_delete", locale));
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

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
      setShowForm(false);
      setEditingTask(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tasks.error_save", locale));
    } finally {
      setSaving(false);
    }
  }

  const getColumnTasks = (status: string) => tasks.filter((task) => task.status === status);

  return (
    <div>
      <PageHeader
        badge="COSTTAS HOLDING"
        title={t("tasks.title", locale)}
        subtitle={t("tasks.subtitle", locale)}
        breadcrumbs={[{ label: t("tasks.title", locale) }]}
      >
        <button
          onClick={() => { setEditingTask(null); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t("tasks.new_button", locale)}
        </button>
      </PageHeader>

      {showForm && (
        <div className="mb-8 max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">{editingTask ? t("tasks.edit_title", locale) : t("tasks.new_title", locale)}</h3>
            <div className="space-y-2">
              <input
                name="title"
                required
                defaultValue={editingTask?.title || ""}
                placeholder={t("tasks.placeholder_title", locale)}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                name="status"
                defaultValue={editingTask?.status || "pending"}
                className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm"
              >
                <option value="pending">{t("tasks.status_pending", locale)}</option>
                <option value="in_progress">{t("tasks.status_in_progress", locale)}</option>
                <option value="completed">{t("tasks.status_completed", locale)}</option>
              </select>
              <select
                name="priority"
                defaultValue={editingTask?.priority || "medium"}
                className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm"
              >
                <option value="low">{t("tasks.priority_low", locale)}</option>
                <option value="medium">{t("tasks.priority_medium", locale)}</option>
                <option value="high">{t("tasks.priority_high", locale)}</option>
                <option value="urgent">{t("tasks.priority_urgent", locale)}</option>
              </select>
              <select
                name="module"
                defaultValue={editingTask?.module || ""}
                className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm"
              >
                <option value="">{t("tasks.module_label", locale)}</option>
                <option value="documents">{t("tasks.module_documents", locale)}</option>
                <option value="fba">{t("tasks.module_fba", locale)}</option>
                <option value="general">{t("tasks.module_general", locale)}</option>
              </select>
              <input
                name="due_date"
                type="date"
                defaultValue={editingTask?.due_date?.split("T")[0] || ""}
                className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                name="assigned_to"
                defaultValue={editingTask?.assigned_to || ""}
                className="px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm"
              >
                <option value="">{t("tasks.unassigned", locale)}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <textarea
                name="description"
                rows={2}
                defaultValue={editingTask?.description || ""}
                placeholder={t("tasks.placeholder_description", locale)}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingTask ? t("tasks.update", locale) : t("tasks.create", locale)}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingTask(null); }} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground">
                {t("tasks.cancel", locale)}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = getColumnTasks(col.key);
          return (
            <div key={col.key} className="bg-card border border-border rounded-xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold text-foreground">{t(`tasks.status_${col.key}`, locale)}</h3>
                <span className="ms-auto text-xs text-muted-foreground">{columnTasks.length}</span>
              </div>
              <div
                className="p-2 space-y-2 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) handleStatusChange(taskId, col.key);
                }}
              >
                {columnTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">{t("tasks.column_empty", locale)}</p>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                      className="bg-muted/50 border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-muted/80 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <PriorityDot priority={task.priority} locale={locale} />
                              <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(task.due_date), "dd/MM", { locale: dateLocale })}
                                </span>
                              )}
                              {getMemberName(task.assigned_to) && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getMemberName(task.assigned_to)}
                                </span>
                              )}
                              {task.module && (
                                <span className="uppercase tracking-wider">{task.module}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingTask(task); setShowForm(true); }}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[10px]"
                          >
                            {t("tasks.edit_short", locale)}
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-[10px]"
                          >
                            {t("tasks.delete_short", locale)}
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
    </div>
  );
}
