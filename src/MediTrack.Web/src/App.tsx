import { Routes, Route, Link } from "react-router-dom";
import { ProtectedRoute, CallbackPage, RoleGuard, UserRole } from "./shared/auth";
import { Layout, useClaraPanel } from "./shared/components";
import { PatientList, PatientDetail, PatientForm } from "./features/patients";
import { AppointmentCalendarPage } from "./features/appointments";
import {
  MedicalRecordDetailPage,
  MedicalRecordsIndexPage,
  PatientMedicalRecordsPage,
} from "./features/medical-records";
import {
  SessionStartScreen,
  LiveSessionView,
  DevPanel,
} from "./features/clara";
import { claraSuggestions } from "./features/clara/data/clara-suggestions";
import {
  CalendarDays, UserCheck, FileText, Sparkles, CalendarPlus, UserPlus, FileSearch, Users,
  Clock, ArrowUpRight,
} from "lucide-react";
import { clsxMerge } from "./shared/utils/clsxMerge";

/* ── Dashboard mock data ──────────────────────────────── */

const statCards = [
  { title: "Today's Appointments", value: "12", icon: CalendarDays, iconBg: "bg-primary-50", iconColor: "text-primary-700", trend: "+3 from yesterday", trendColor: "text-success-500" },
  { title: "Patients Seen", value: "8", icon: UserCheck, iconBg: "bg-secondary-50", iconColor: "text-secondary-700", trend: "On track", trendColor: "text-success-500" },
  { title: "Pending Records", value: "5", icon: FileText, iconBg: "bg-warning-50", iconColor: "text-warning-500", trend: "2 urgent", trendColor: "text-warning-500" },
  { title: "Clara Sessions", value: "3", icon: Sparkles, iconBg: "bg-accent-50", iconColor: "text-accent-500", trend: "1 active", trendColor: "text-accent-500" },
];

const appointments = [
  { time: "09:00 AM", patient: "Sarah Johnson", type: "Follow-up", status: "Confirmed", statusColor: "bg-accent-100 text-accent-700", duration: "30 min" },
  { time: "09:30 AM", patient: "Michael Chen", type: "New Visit", status: "Checked In", statusColor: "bg-info-50 text-info-700", duration: "45 min" },
  { time: "10:15 AM", patient: "Emily Rivera", type: "Lab Review", status: "Scheduled", statusColor: "bg-primary-100 text-primary-700", duration: "20 min" },
  { time: "11:00 AM", patient: "James O'Brien", type: "Follow-up", status: "In Progress", statusColor: "bg-warning-50 text-warning-700", duration: "30 min" },
  { time: "11:30 AM", patient: "Aisha Patel", type: "Urgent", status: "Scheduled", statusColor: "bg-primary-100 text-primary-700", duration: "30 min" },
];

const quickActions = [
  { label: "New Appointment", icon: CalendarPlus, bg: "bg-primary-700 hover:bg-primary-600", text: "text-white" },
  { label: "Register Patient", icon: UserPlus, bg: "bg-secondary-700 hover:bg-secondary-600", text: "text-white" },
  { label: "View Records", icon: FileSearch, bg: "bg-white hover:bg-neutral-50", text: "text-neutral-700", border: true },
];

const recentPatients = [
  { initials: "SJ", name: "Sarah Johnson", mrn: "MRN-2847", lastVisit: "Today", color: "bg-primary-100 text-primary-700", isActive: true },
  { initials: "MC", name: "Michael Chen", mrn: "MRN-1923", lastVisit: "Today", color: "bg-secondary-100 text-secondary-700", isActive: true },
  { initials: "ER", name: "Emily Rivera", mrn: "MRN-3312", lastVisit: "Feb 25", color: "bg-accent-100 text-accent-700", isActive: true },
  { initials: "JO", name: "James O'Brien", mrn: "MRN-0847", lastVisit: "Feb 20", color: "bg-warning-50 text-warning-700", isActive: false },
];

/* ── Dashboard component ──────────────────────────────── */

function Dashboard() {
  const { openPanel } = useClaraPanel();

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Welcome to MediTrack</h1>
        <p className="text-neutral-500 mt-0.5">Here's your overview for today</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg border border-neutral-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={clsxMerge("w-10 h-10 rounded-lg flex items-center justify-center", card.iconBg)}>
                <card.icon className={clsxMerge("w-5 h-5", card.iconColor)} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-neutral-300" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{card.value}</p>
            <p className="text-sm text-neutral-500 mt-0.5">{card.title}</p>
            <p className={clsxMerge("text-xs font-medium mt-2", card.trendColor)}>{card.trend}</p>
          </div>
        ))}
      </div>

      {/* Schedule + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-5 pb-3 flex items-center justify-between border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary-700" />
              <h2 className="text-lg font-semibold text-neutral-900">Today's Schedule</h2>
            </div>
            <Link to="/appointments" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-neutral-200">
            {appointments.map((apt, index) => (
              <div key={index} className="px-5 py-3.5 flex items-center gap-4 hover:bg-neutral-50 transition-colors cursor-pointer">
                <div className="w-20 flex-shrink-0">
                  <p className="text-sm font-medium text-neutral-900">{apt.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-700 truncate">{apt.patient}</p>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700">{apt.type}</span>
                <span className={clsxMerge("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", apt.statusColor)}>{apt.status}</span>
                <span className="hidden md:block text-xs text-neutral-500 w-14 text-right"><Clock className="w-3 h-3 inline mr-0.5" />{apt.duration}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button key={action.label} className={clsxMerge("w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", action.bg, action.text, action.border && "border border-neutral-200")}>
                <action.icon className="w-4 h-4" /> {action.label}
              </button>
            ))}
            {/* Ask Clara — opens panel */}
            <button
              onClick={() => openPanel()}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors bg-accent-500 hover:bg-accent-700 text-white"
            >
              <Sparkles className="w-4 h-4" /> Ask Clara
            </button>
          </div>
        </div>
      </div>

      {/* Recent Patients + Clara's Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-5 pb-3 flex items-center justify-between border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-700" />
              <h2 className="text-lg font-semibold text-neutral-900">Recent Patients</h2>
            </div>
            <Link to="/patients" className="text-sm font-medium text-primary-700 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-neutral-200">
            {recentPatients.map((patient, index) => (
              <div key={index} className="px-5 py-3.5 flex items-center gap-3 hover:bg-neutral-50 transition-colors cursor-pointer">
                <div className={clsxMerge("w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0", patient.color)}>{patient.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{patient.name}</p>
                  <p className="text-xs text-neutral-500">{patient.mrn}</p>
                </div>
                <div className="text-right hidden sm:block"><p className="text-xs text-neutral-500">{patient.lastVisit}</p></div>
                <span className={clsxMerge("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", patient.isActive ? "bg-success-50 text-success-700 border border-success-500/30" : "bg-neutral-100 text-neutral-500 border border-neutral-200")}>{patient.isActive ? "Active" : "Inactive"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="p-5 pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-accent-500" />
                <Sparkles className="w-3 h-3 text-accent-500 absolute -top-1 -right-1.5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Clara's Suggestions</h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Click a suggestion to ask Clara</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {claraSuggestions.map((suggestion) => {
              const SuggestionIcon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => openPanel(suggestion.prompt)}
                  className="w-full px-5 py-4 flex gap-3 hover:bg-accent-50/50 transition-colors text-left"
                >
                  <div className={clsxMerge("w-1 flex-shrink-0 rounded-full", suggestion.accentColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SuggestionIcon className="h-3.5 w-3.5 text-neutral-500" />
                      <p className="text-xs font-semibold text-neutral-700">{suggestion.category}</p>
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{suggestion.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-4 border-t border-neutral-200">
            <button
              onClick={() => openPanel()}
              className="text-sm font-medium text-accent-700 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" /> Ask Clara anything
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/new"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <Layout>
              <AppointmentCalendarPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <MedicalRecordsIndexPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <MedicalRecordDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:patientId/medical-records"
        element={
          <ProtectedRoute>
            <Layout>
              <PatientMedicalRecordsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clara"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <SessionStartScreen />
                <DevPanel />
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clara/session/:sessionId"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.Doctor, UserRole.Admin]}>
              <Layout>
                <LiveSessionView />
                <DevPanel />
              </Layout>
            </RoleGuard>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
