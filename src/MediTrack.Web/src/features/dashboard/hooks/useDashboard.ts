import { useGetAppointmentsQuery, useGetDashboardStatsQuery } from "@/features/appointments/store/appointmentApi";
import { useGetMedicalRecordStatsQuery } from "@/features/medical-records/store/medicalRecordsApi";
import { useGetSessionsQuery } from "@/features/clara/store/claraApi";
import { useGetPatientsQuery } from "@/features/patients/store/patientApi";

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function useDashboard() {
  const today = todayDateString();

  const dashboardStats = useGetDashboardStatsQuery({ date: today });
  const medicalRecordStats = useGetMedicalRecordStatsQuery({});
  const sessions = useGetSessionsQuery();
  const patients = useGetPatientsQuery({ includeInactive: false });
  const todayAppointments = useGetAppointmentsQuery({
    fromDate: `${today}T00:00:00`,
    toDate: `${today}T23:59:59`,
  });

  const isLoading =
    dashboardStats.isLoading ||
    medicalRecordStats.isLoading ||
    sessions.isLoading ||
    patients.isLoading ||
    todayAppointments.isLoading;

  const isError =
    dashboardStats.isError ||
    medicalRecordStats.isError ||
    sessions.isError ||
    patients.isError ||
    todayAppointments.isError;

  const stats = dashboardStats.data;
  const recordStats = medicalRecordStats.data;
  const sessionList = sessions.data ?? [];
  const recentPatients = (patients.data ?? []).slice(0, 4);
  const appointmentList = todayAppointments.data ?? [];

  const activeSessionCount = sessionList.filter(
    (session) => session.status === "Active"
  ).length;

  return {
    isLoading,
    isError,
    todayAppointmentCount: stats?.todayAppointmentCount ?? 0,
    patientsSeen: stats?.patientsSeen ?? 0,
    appointmentCountsByDay: stats?.appointmentCountsByDay ?? [0, 0, 0, 0, 0, 0, 0],
    pendingRecords: recordStats?.pendingCount ?? 0,
    urgentRecords: recordStats?.urgentCount ?? 0,
    claraSessionCount: sessionList.length,
    activeSessionCount,
    appointments: appointmentList,
    recentPatients,
  };
}
