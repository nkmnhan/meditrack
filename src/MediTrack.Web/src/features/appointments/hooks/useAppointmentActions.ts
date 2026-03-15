import {
  useConfirmAppointmentMutation,
  useCheckInAppointmentMutation,
  useStartAppointmentMutation,
  useCompleteAppointmentMutation,
  useCancelAppointmentMutation,
  useMarkNoShowMutation,
} from "../store/appointmentApi";
import type { AppointmentStatus } from "../types";
import { STATUS_TRANSITIONS } from "../constants";

export function useAppointmentActions() {
  const [confirmAppointment, { isLoading: isConfirming }] = useConfirmAppointmentMutation();
  const [checkInAppointment, { isLoading: isCheckingIn }] = useCheckInAppointmentMutation();
  const [startAppointment, { isLoading: isStarting }] = useStartAppointmentMutation();
  const [completeAppointment, { isLoading: isCompleting }] = useCompleteAppointmentMutation();
  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [markNoShow, { isLoading: isMarkingNoShow }] = useMarkNoShowMutation();

  const isAnyActionLoading =
    isConfirming || isCheckingIn || isStarting || isCompleting || isCancelling || isMarkingNoShow;

  function getAllowedTransitions(currentStatus: AppointmentStatus): AppointmentStatus[] {
    return STATUS_TRANSITIONS[currentStatus] ?? [];
  }

  async function executeTransition(
    appointmentId: string,
    targetStatus: AppointmentStatus,
    payload?: { reason?: string; notes?: string },
  ): Promise<void> {
    switch (targetStatus) {
      case "Confirmed":
        await confirmAppointment(appointmentId).unwrap();
        break;
      case "CheckedIn":
        await checkInAppointment(appointmentId).unwrap();
        break;
      case "InProgress":
        await startAppointment(appointmentId).unwrap();
        break;
      case "Completed":
        await completeAppointment({
          id: appointmentId,
          data: { notes: payload?.notes },
        }).unwrap();
        break;
      case "Cancelled":
        if (!payload?.reason) {
          throw new Error("Cancellation reason is required");
        }
        await cancelAppointment({
          id: appointmentId,
          data: { reason: payload.reason },
        }).unwrap();
        break;
      case "NoShow":
        await markNoShow(appointmentId).unwrap();
        break;
      default:
        throw new Error(`Unsupported transition to status: ${targetStatus}`);
    }
  }

  return {
    getAllowedTransitions,
    executeTransition,
    isAnyActionLoading,
    isConfirming,
    isCheckingIn,
    isStarting,
    isCompleting,
    isCancelling,
    isMarkingNoShow,
  };
}
