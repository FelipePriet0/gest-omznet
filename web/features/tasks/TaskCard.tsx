"use client";

import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import type { CardTask } from "./services";

type TaskCardProps = {
  task: CardTask;
  onToggle: (id: string, done: boolean) => void | Promise<void>;
  creatorName?: string | null;
  applicantName?: string | null;
  onEdit?: () => void;
};

export function TaskCard({ task, onToggle, applicantName, onEdit }: TaskCardProps) {
  const isDone = task.status === "completed";
  const dueTxt = task.deadline ? new Date(task.deadline).toLocaleString() : null;

  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm shadow-sm transition",
        isDone ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(task.id, e.target.checked);
          }}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div
              className={clsx(
                "flex-1 whitespace-pre-line break-words text-sm",
                isDone ? "text-emerald-700 line-through" : "text-sky-900"
              )}
            >
              <span
                className={clsx(
                  "font-semibold",
                  isDone ? "text-emerald-800" : "text-zinc-900"
                )}
              >
                Descrição:
              </span>{" "}
              {task.description}
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Mais ações da tarefa"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
          {dueTxt && (
            <div
              className={clsx(
                "text-xs font-medium",
                isDone ? "text-emerald-600 line-through" : "text-zinc-500"
              )}
            >
              <span
                className={clsx(
                  "font-semibold",
                  isDone ? "text-emerald-700" : "text-zinc-600"
                )}
              >
                Prazo:
              </span>{" "}
              <span className={clsx("font-normal", isDone ? "text-emerald-700" : "text-zinc-600")}>
                {dueTxt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

