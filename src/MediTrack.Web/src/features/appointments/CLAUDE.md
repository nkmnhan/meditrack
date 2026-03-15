# Appointments Feature — Frontend Context

## Overview
Full appointment lifecycle UI: calendar view, scheduling form, detail page, status workflow actions.

## Key Libraries
| Library | Usage |
|---------|-------|
| **@schedule-x/react** | Calendar component (`AppointmentCalendar.tsx`) — week/day/month views |
| **@schedule-x/theme-default** | Calendar styling |
| **date-fns** | Date formatting and manipulation |
| **RTK Query** | Server state via `appointmentApi.ts` — caching, invalidation via `Appointments` tag |

## Components
| Component | Purpose |
|-----------|---------|
| `AppointmentCalendarPage` | Main page — calendar + toolbar + form dialog |
| `AppointmentCalendar` | ScheduleX calendar wrapper — renders appointments as events |
| `CalendarToolbar` | View switcher (day/week/month), date nav, "New Appointment" button |
| `AppointmentForm` | Create/edit form with provider selection, date/time picker, type selector |
| `AppointmentDetailPage` | Full appointment view with status actions |
| `AppointmentStatusActions` | Context-aware action buttons (Confirm, Check In, Start, Complete, Cancel, etc.) |
| Status dialogs | `CancelDialog`, `CompleteDialog`, `RescheduleDialog`, `NoShowDialog` |

## Hooks
| Hook | Purpose |
|------|---------|
| `useAppointmentCalendar` | Calendar state, event mapping, ScheduleX config |
| `useAppointmentActions` | Status transition mutations + confirmation dialogs |

## Store (`appointmentApi.ts`)
RTK Query endpoints:
- `getAppointments` (with search/filter params)
- `getAppointmentById`
- `createAppointment` / `updateAppointment`
- `confirmAppointment` / `checkInAppointment` / `startAppointment` / `completeAppointment`
- `cancelAppointment` / `rescheduleAppointment` / `markNoShow`
- `getDashboardStats` / `checkConflicts`

## Types (`types.ts`)
- `AppointmentStatus`: 8 union types matching backend enum
- `AppointmentType`: 10 types with numeric values for API requests
- Request/Response DTOs matching backend contracts

## Routes
- `/appointments` → calendar view
- `/appointments/:id` → detail page
- `/appointments/new` → create form (dialog on calendar page)
