"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProjectStages } from "@/lib/actions/projects";
import type { ProjectStage } from "@/lib/validators/project";

export function StagesChecklist({
  projectId,
  initialStages,
}: {
  projectId: string;
  initialStages: ProjectStage[];
}) {
  const [stages, setStages] = useState<ProjectStage[]>(initialStages);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  const persist = (next: ProjectStage[]) => {
    const snapshot = stages;
    setStages(next);
    startTransition(async () => {
      const result = await updateProjectStages({ projectId, stages: next });
      if (!result.ok) {
        toast.error(result.error);
        setStages(snapshot);
      }
    });
  };

  const addStage = () => {
    const name = newName.trim();
    if (!name) return;
    const order = stages.length === 0 ? 0 : Math.max(...stages.map((s) => s.order)) + 1;
    persist([...stages, { name, done: false, order }]);
    setNewName("");
  };

  const toggleStage = (idx: number, done: boolean) => {
    persist(stages.map((s, i) => (i === idx ? { ...s, done } : s)));
  };

  const renameStage = (idx: number, name: string) => {
    persist(stages.map((s, i) => (i === idx ? { ...s, name } : s)));
  };

  const removeStage = (idx: number) => {
    persist(stages.filter((_, i) => i !== idx));
  };

  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Пока нет этапов. Добавь первый ниже — он сразу сохранится.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((stage) => {
            const idx = stages.indexOf(stage);
            return (
              <li
                key={`${stage.order}-${stage.name}-${idx}`}
                className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-background-overlay"
              >
                <Checkbox
                  checked={stage.done}
                  onCheckedChange={(v) => toggleStage(idx, v === true)}
                  aria-label={stage.name}
                />
                <Input
                  defaultValue={stage.name}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== stage.name) renameStage(idx, next);
                  }}
                  className={`h-7 border-transparent bg-transparent px-1 text-sm focus-visible:border-border ${
                    stage.done ? "text-foreground-subtle line-through" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-70 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Удалить этап"
                  onClick={() => removeStage(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addStage();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Новый этап"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!newName.trim() || isPending}>
          <Plus className="size-3.5" />
          Добавить
        </Button>
      </form>
    </div>
  );
}
