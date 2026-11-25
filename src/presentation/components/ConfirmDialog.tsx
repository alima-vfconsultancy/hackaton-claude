import { useEffect, useRef } from 'react';

export function ConfirmDialog({
  open, title, message, confirmLabel, danger, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-black/50" aria-labelledby="dlg-title">
      <h2 id="dlg-title" className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-base">{message}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
