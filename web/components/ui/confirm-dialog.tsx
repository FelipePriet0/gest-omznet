"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title = "Confirmar ação",
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="z-[200] max-w-[440px] rounded-2xl bg-white dark:bg-zinc-950" overlayClassName="z-[199]">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">{title}</DialogTitle>
          {/* Always render a description to satisfy aria-describedby */}
          <DialogDescription className={description ? "text-zinc-600 dark:text-zinc-400" : "sr-only"}>
            {description || "Confirme para continuar ou cancele para voltar."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button variant="secondary" onClick={onCancel}> {cancelText} </Button>
          <Button variant="primary" onClick={onConfirm}> {confirmText} </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
