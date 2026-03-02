import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { useRoles } from "@/shared/auth/useRoles";
import { StaffRoles, UserRole } from "@/shared/auth/roles";
import { useAppointmentCalendar } from "../hooks/useAppointmentCalendar";
import { CalendarToolbar } from "./CalendarToolbar";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { AppointmentDetailPanel } from "./AppointmentDetailPanel";
import { AppointmentForm } from "./AppointmentForm";
import { Breadcrumb } from "@/shared/components";

export function AppointmentCalendarPage() {
  const { hasAnyRole, hasRole } = useRoles();
  const isStaff = hasAnyRole(StaffRoles);
  const isPatient = hasRole(UserRole.Patient);

  // UI state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  // Memoized callbacks — useCalendarApp captures callbacks on first initialization only,
  // so we must provide stable references via useCallback. Inline arrow functions would be
  // recreated on every render, causing stale closures that don't reflect state changes.
  const handleEventClick = useCallback((appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  }, []);

  const handleDateTimeClick = useCallback((dateTime: Date) => {
    if (isStaff) {
      setFormDefaultDate(dateTime);
      setIsFormOpen(true);
    }
  }, [isStaff]);

  const {
    calendar,
    isLoading,
    isFetching,
    error,
  } = useAppointmentCalendar({
    providerId: selectedProviderId ?? undefined,
    onEventClick: handleEventClick,
    onDateTimeClick: handleDateTimeClick,
  });

  // Close panels on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isFormOpen) {
          setIsFormOpen(false);
        } else if (selectedAppointmentId) {
          setSelectedAppointmentId(null);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen, selectedAppointmentId]);

  function handleNewAppointment() {
    setFormDefaultDate(undefined);
    setIsFormOpen(true);
  }

  function handleFormClose() {
    setIsFormOpen(false);
    setFormDefaultDate(undefined);
  }

  function handleDetailClose() {
    setSelectedAppointmentId(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-error-500" />
        <p className="text-lg font-medium text-neutral-900">Failed to load appointments</p>
        <p className="text-sm text-neutral-500">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Appointments" },
        ]}
      />

      {/* Toolbar */}
      <CalendarToolbar
        selectedProviderId={selectedProviderId}
        onProviderSelect={setSelectedProviderId}
        onNewAppointment={handleNewAppointment}
        isStaff={isStaff}
        isPatient={isPatient}
        isFetching={isFetching}
      />

      {/* Calendar */}
      {calendar ? (
        <AppointmentCalendar calendar={calendar} />
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white">
          <CalendarDays className="h-10 w-10 text-neutral-400" />
          <p className="text-neutral-500">Calendar is loading...</p>
        </div>
      )}

      {/* Detail panel */}
      {selectedAppointmentId && (
        <AppointmentDetailPanel
          appointmentId={selectedAppointmentId}
          onClose={handleDetailClose}
          isStaff={isStaff}
          isPatient={isPatient}
        />
      )}

      {/* Create/Edit form modal */}
      {isFormOpen && (
        <AppointmentForm
          onClose={handleFormClose}
          defaultDate={formDefaultDate}
        />
      )}
    </div>
  );
}
