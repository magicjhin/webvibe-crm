"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/forms/Field";
import { StatusBadge } from "@/components/data/StatusBadge";
import { DateDisplay } from "@/components/data/DateDisplay";
import { EmptyState } from "@/components/data/EmptyState";
import {
  createTask,
  deleteTask,
  toggleTaskDone,
  updateTask,
} from "@/lib/actions/tasks";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/validators/task";
import { formatDateOnly, parseDateOnly } from "@/lib/dates/parse";

const STATUS_LABEL: Record<(typeof TASK_STATUSES)[number], string> = {
  todo: "К работе",
  in_progress: "В работе",
  waiting_client: "Ждёт клиента",
  review: "Ревью",
  done: "Готова",
};
const PRIORITY_LABEL: Record<(typeof TASK_PRIORITIES)[number], string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочно",
};

export type TaskItem = {
  id: string;
  title: string;
  status: (typeof TASK_STATUSES)[number];
  priority: (typeof TASK_PRIORITIES)[number];
  dueAt: Date | null;
  description: string | null;
};

export function TasksInline({
  projectId,
  initialTasks,
}: {
  projectId: string;
  initialTasks: TaskItem[];
}) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<TaskItem | null>(null);

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const result = await createTask({ projectId, title });
      if (result.ok) {
        setTasks((prev) => [
          ...prev,
          {
            id: result.data.id,
            title,
            status: "todo",
            priority: "normal",
            dueAt: null,
            description: null,
          },
        ]);
        setNewTitle("");
      } else {
        toast.error(result.error);
      }
    });
  };

  const onToggle = (task: TaskItem) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    startTransition(async () => {
      const result = await toggleTaskDone(task.id);
      if (!result.ok) {
        toast.error(result.error);
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
        );
      }
    });
  };

  const onDelete = (id: string) => {
    const snapshot = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      const result = await deleteTask(id);
      if (!result.ok) {
        toast.error(result.error);
        setTasks(snapshot);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 ? (
        <EmptyState
          title="Задач пока нет"
          description="Добавь первую задачу через форму ниже."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="group flex items-center gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-background-overlay"
            >
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={() => onToggle(task)}
                aria-label={task.title}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate text-sm ${
                    task.status === "done"
                      ? "text-foreground-subtle line-through"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
                  <StatusBadge kind="task" value={task.status} />
                  <span>·</span>
                  <span>{PRIORITY_LABEL[task.priority]}</span>
                  {task.dueAt ? (
                    <>
                      <span>·</span>
                      <DateDisplay date={task.dueAt} mode="short" />
                    </>
                  ) : null}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Действия с ${task.title}`}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(task)}>
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
                    onSelect={() => onDelete(task.id)}
                  >
                    <Trash2 className="size-3.5" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Новая задача"
          className="h-8"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!newTitle.trim() || isPending}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Добавить
        </Button>
      </form>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать задачу</DialogTitle>
          </DialogHeader>
          {editing ? (
            // Re-mount the body when a different task opens so local form state
            // resets cleanly instead of needing manual sync effects.
            <TaskEditBody
              key={editing.id}
              task={editing}
              onClose={() => setEditing(null)}
              onSaved={(t) => {
                setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskEditBody({
  task,
  onClose,
  onSaved,
}: {
  task: TaskItem;
  onClose: () => void;
  onSaved: (t: TaskItem) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskItem["status"]>(task.status);
  const [priority, setPriority] = useState<TaskItem["priority"]>(task.priority);
  const [dueAt, setDueAt] = useState<string>(
    formatDateOnly(task.dueAt) ?? "",
  );
  const [description, setDescription] = useState(task.description ?? "");
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Введи название");
      return;
    }
    startTransition(async () => {
      const result = await updateTask({
        id: task.id,
        title: trimmedTitle,
        status,
        priority,
        dueAt: dueAt || null,
        description: description || null,
      });
      if (result.ok) {
        toast.success("Сохранено");
        onSaved({
          ...task,
          title: trimmedTitle,
          status,
          priority,
          dueAt: parseDateOnly(dueAt),
          description: description || null,
        });
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="grid gap-4">
        <Field id="task-title" label="Название" required>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="task-status" label="Статус">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="task-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="task-priority" label="Приоритет">
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as typeof priority)}
            >
              <SelectTrigger id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field id="task-due" label="Дедлайн">
          <Input
            id="task-due"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>
        <Field id="task-desc" label="Описание">
          <Textarea
            id="task-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : (
            "Сохранить"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
