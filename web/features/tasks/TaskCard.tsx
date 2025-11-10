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
        isDone 
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90" 
          : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
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
          className={clsx(
            "mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border focus:ring-2",
            isDone 
              ? "border-white/80 text-white focus:ring-white/50" 
              : "border-blue-400 text-blue-600 focus:ring-blue-500"
          )}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div
              className={clsx(
                "flex-1 whitespace-pre-line break-words break-all text-sm",
                isDone ? "text-white line-through" : "text-blue-900"
              )}
            >
              <span
                className={clsx(
                  "font-semibold",
                  isDone ? "text-white" : "text-blue-900"
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
                className={clsx(
                  "rounded-full p-1 transition focus:outline-none focus-visible:ring-2",
                  isDone 
                    ? "text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/50" 
                    : "text-blue-400 hover:bg-blue-100 hover:text-blue-700 focus-visible:ring-blue-500"
                )}
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
                isDone ? "text-white line-through" : "text-blue-700"
              )}
            >
              <span
                className={clsx(
                  "font-semibold",
                  isDone ? "text-white" : "text-blue-800"
                )}
              >
                Prazo:
              </span>{" "}
              <span className={clsx("font-normal", isDone ? "text-white" : "text-blue-700")}>
                {dueTxt}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

