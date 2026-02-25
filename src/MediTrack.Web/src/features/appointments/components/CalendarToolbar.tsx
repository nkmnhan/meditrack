import { Plus } from "lucide-react";
import { clsxMerge } from "@/shared/utils/clsxMerge";

interface CalendarToolbarProps {
  readonly providerFilter: string;
  readonly onProviderFilterChange: (providerId: string) => void;
  readonly onNewAppointment: () => void;
  readonly isStaff: boolean;
  readonly isPatient: boolean;
  readonly isFetching: boolean;
}

export function CalendarToolbar({
  providerFilter,
  onProviderFilterChange,
  onNewAppointment,
  isStaff,
  isPatient,
  isFetching,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl">Appointments</h1>
        {isFetching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Provider filter — visible to staff only, hidden for patients */}
        {isStaff && !isPatient && (
          <div className="flex items-center gap-2">
            <label htmlFor="provider-filter" className="text-sm font-medium text-neutral-700 whitespace-nowrap">
              Provider:
            </label>
            <input
              id="provider-filter"
              type="text"
              value={providerFilter}
              onChange={(event) => onProviderFilterChange(event.target.value)}
              placeholder="Filter by provider ID"
              className={clsxMerge(
                "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500",
                "sm:w-64",
              )}
            />
          </div>
        )}

        {/* New Appointment button — staff only */}
        {isStaff && (
          <button
            type="button"
            onClick={onNewAppointment}
            className={clsxMerge(
              "inline-flex items-center justify-center gap-2",
              "h-10 rounded-lg px-4 py-2",
              "bg-primary-700 text-white",
              "hover:bg-primary-800",
              "transition-colors",
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">New Appointment</span>
          </button>
        )}
      </div>
    </div>
  );
}
