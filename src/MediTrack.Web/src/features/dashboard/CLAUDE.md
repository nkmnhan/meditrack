# Dashboard Feature — Clinical Entry Point

## Overview
Main clinical dashboard shown after login. Provides a patient-centric overview of scheduled appointments, recent records, and quick-action shortcuts. Supports role-aware widget customization.

## Components
| Component | Purpose |
|-----------|---------|
| `DashboardPage.tsx` | Main dashboard — appointment summary, patient stats, quick links |
| `DashboardCustomizer.tsx` | Drag-and-drop widget layout editor (persists preferences to localStorage) |

## Data Sources
- Appointment.API — upcoming appointments for today
- Patient.API — patient count / recent registrations (for admin role)

## Route: `/dashboard` (authenticated, all roles)
