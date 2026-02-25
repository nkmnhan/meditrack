import { useState } from "react";
import {
  CheckCircle2,
  LogIn,
  Play,
  CheckCheck,
  XCircle,
  UserX,
  Loader2,
} from "lucide-react";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";
import { CompleteAppointmentDialog } from "./CompleteAppointmentDialog";
import { clsxMerge } from "@/shared/utils/clsxMerge";
import type { AppointmentStatus } from "../types";

interface AppointmentStatusActionsProps {
  readonly appointmentId: string;
  readonly currentStatus: AppointmentStatus;
  readonly canBeCancelled: boolean;
  readonly isStaff: boolean;
  readonly isPatient: boolean;
}

interface ActionButtonConfig {
  readonly status: AppointmentStatus;
  readonly label: string;
  readonly icon: React.ElementType;
  readonly colorClass: string;
}

const ACTION_BUTTONS: ActionButtonConfig[] = [
  {
    status: "Confirmed",
    label: "Confirm",
    icon: CheckCircle2,
    colorClass: "bg-primary-700 hover:bg-primary-800 text-white",
  },
  {
    status: "CheckedIn",
    label: "Check In",
    icon: LogIn,
    colorClass: "bg-secondary-700 hover:bg-secondary-800 text-white",
  },
  {
    status: "InProgress",
    label: "Start",
    icon: Play,
    colorClass: "bg-warning-600 hover:bg-warning-700 text-white",
  },
  {
    status: "Completed",
    label: "Complete",
    icon: CheckCheck,
    colorClass: "bg-success-600 hover:bg-success-700 text-white",
  },
  {
    status: "NoShow",
    label: "No Show",
    icon: UserX,
    colorClass: "bg-error-600 hover:bg-error-700 text-white",
  },
  {
    status: "Cancelled",
    label: "Cancel",
    icon: XCircle,
    colorClass: "border border-error-300 text-error-700 hover:bg-error-50",
  },
];

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
  canBeCancelled,
  isStaff,
  isPatient,
}: AppointmentStatusActionsProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  const {
    getAllowedTransitions,
    executeTransition,
    isAnyActionLoading,
  } = useAppointmentActions();

  const allowedTransitions = getAllowedTransitions(currentStatus);

  // Patient can only cancel their own appointment
  const visibleTransitions = allowedTransitions.filter((transition) => {
    if (isPatient && !isStaff) {
      return transition === "Cancelled" && canBeCancelled;
    }
    // Staff: show cancel only if it can be cancelled
    if (transition === "Cancelled") return canBeCancelled;
    // Staff: hide reschedule (handled via form, not a status button)
    if (transition === "Rescheduled") return false;
    return true;
  });

  if (visibleTransitions.length === 0) return null;

  async function handleAction(targetStatus: AppointmentStatus) {
    if (targetStatus === "Cancelled") {
      setIsCancelDialogOpen(true);
      return;
    }
    if (targetStatus === "Completed") {
      setIsCompleteDialogOpen(true);
      return;
    }

    try {
      await executeTransition(appointmentId, targetStatus);
    } catch {
      alert(`Failed to update appointment status. Please try again.`);
    }
  }

  async function handleCancelConfirm(reason: string) {
    try {
      await executeTransition(appointmentId, "Cancelled", { reason });
      setIsCancelDialogOpen(false);
    } catch {
      alert("Failed to cancel appointment. Please try again.");
    }
  }

  async function handleCompleteConfirm(notes: string) {
    try {
      await executeTransition(appointmentId, "Completed", { notes });
      setIsCompleteDialogOpen(false);
    } catch {
      alert("Failed to complete appointment. Please try again.");
    }
  }

  return (
    <>
      <div className="border-t border-neutral-200 pt-4">
        <p className="mb-3 text-xs font-medium text-neutral-500">Actions</p>
        <div className="flex flex-wrap gap-2">
          {visibleTransitions.map((targetStatus) => {
            const buttonConfig = ACTION_BUTTONS.find(
              (button) => button.status === targetStatus,
            );
            if (!buttonConfig) return null;

            const Icon = buttonConfig.icon;
            return (
              <button
                key={targetStatus}
                type="button"
                disabled={isAnyActionLoading}
                onClick={() => handleAction(targetStatus)}
                className={clsxMerge(
                  "inline-flex items-center gap-2",
                  "h-10 rounded-lg px-4 py-2",
                  "text-sm font-medium",
                  "transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  buttonConfig.colorClass,
                )}
              >
                {isAnyActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {buttonConfig.label}
              </button>
            );
          })}
        </div>
      </div>

      {isCancelDialogOpen && (
        <CancelAppointmentDialog
          onConfirm={handleCancelConfirm}
          onCancel={() => setIsCancelDialogOpen(false)}
          isLoading={isAnyActionLoading}
        />
      )}

      {isCompleteDialogOpen && (
        <CompleteAppointmentDialog
          onConfirm={handleCompleteConfirm}
          onCancel={() => setIsCompleteDialogOpen(false)}
          isLoading={isAnyActionLoading}
        />
      )}
    </>
  );
}
