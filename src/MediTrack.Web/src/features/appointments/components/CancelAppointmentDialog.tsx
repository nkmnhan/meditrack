import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface CancelAppointmentDialogProps {
  readonly onConfirm: (reason: string) => void;
  readonly onCancel: () => void;
  readonly isLoading: boolean;
}

export function CancelAppointmentDialog({
  onConfirm,
  onCancel,
  isLoading,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        role="button"
        tabIndex={-1}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50">
            <XCircle className="h-5 w-5 text-error-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Cancel Appointment</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-sm font-medium text-neutral-700"
            >
              Reason for cancellation <span className="text-error-600">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              required
              placeholder="Please provide a reason for cancellation..."
              className={clsxMerge(
                "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500",
                "resize-none",
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className={clsxMerge(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2",
                "text-sm font-medium text-white",
                "bg-error-600 hover:bg-error-700",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
