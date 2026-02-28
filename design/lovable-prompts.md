# MediTrack — Lovable.dev Prompts

Each prompt below is self-contained. Copy-paste one at a time into Lovable.
After generating, screenshot or export the result and use it as a UX/UI reference for MediTrack.

---

## Prompt 0: Global Design System & Tokens (Run This First)

```
Create a design system showcase page for a medical EMR application called "MediTrack".

Tech stack: React, TypeScript, Tailwind CSS, Lucide React icons.

Font: Inter (sans-serif).

Color palette — use these EXACT hex values as Tailwind custom colors:

Primary (Medical Blue): 50:#eff6ff, 100:#dbeafe, 200:#bfdbfe, 600:#2563eb, 700:#1d4ed8, 800:#1e40af
Secondary (Healthcare Teal): 50:#f0fdfa, 100:#ccfbf1, 600:#0d9488, 700:#0f766e
Accent (Violet): 50:#faf5ff, 100:#f3e8ff, 500:#a855f7, 700:#7c3aed
Neutral (Slate): 50:#f8fafc, 100:#f1f5f9, 200:#e2e8f0, 300:#cbd5e1, 500:#64748b, 700:#334155, 900:#0f172a
Success: 50:#f0fdf4, 500:#22c55e, 700:#15803d
Warning: 50:#fffbeb, 500:#f59e0b, 700:#b45309
Error: 50:#fef2f2, 500:#ef4444, 700:#b91c1c
Info: 50:#f0f9ff, 500:#0ea5e9, 700:#0369a1

The showcase page should display:
1. Color swatches for every color above, labeled with name and hex
2. Typography scale: h1 (2.25rem bold), h2 (1.875rem semibold), h3 (1.5rem semibold), body (1rem normal), small (0.875rem), muted (0.875rem neutral-500)
3. Button variants: Primary (bg primary-700, text white, hover primary-600), Secondary (bg white, border neutral-200, text neutral-700, hover neutral-50), Destructive (bg error-500, text white), Ghost (no bg, text neutral-700, hover neutral-50). Each in default, hover, and disabled states. Rounded-lg, h-10 px-4.
4. Badge variants: Default (primary-100 text primary-700), Success (success-50 text success-700 border success-200), Warning (warning-50 text warning-700 border warning-200), Error (error-50 text error-700 border error-200), Info (info-50 text info-700 border info-200). All rounded-full px-2.5 py-0.5 text-xs font-medium.
5. Card component: white bg, rounded-lg, shadow-sm, border neutral-200, p-6
6. Form inputs: rounded-md border neutral-200, focus ring primary-700, h-10 px-3. Show text input, select dropdown, textarea.
7. Status badges for medical appointments: Scheduled (#3b82f6), Confirmed (#8b5cf6), Checked In (#06b6d4), In Progress (#f59e0b), Completed (#22c55e), Cancelled (#94a3b8), No Show (#ef4444).
8. Triage severity badges: Critical (#dc2626 bg), Urgent (#ea580c bg), Routine (#3b82f6 bg) — white text on each.

Page background: neutral-50. All cards on white. Use Lucide icons where appropriate. Mobile-first responsive layout.
```

---

## Prompt 1: Sidebar Navigation & App Shell

```
Create a responsive app shell layout for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-700 #334155, Neutral-900 #0f172a, White #ffffff.

Layout structure:

DESKTOP (md and above):
- Fixed left sidebar, width 256px (w-64), white background, border-right neutral-200
- Sidebar content top-to-bottom:
  1. Logo area: Stethoscope icon (Lucide) + "MediTrack" text in primary-700, font-bold text-xl, p-6
  2. Navigation links, vertical stack, space-y-1, px-3:
     - Dashboard (LayoutDashboard icon)
     - Patients (Users icon)
     - Appointments (CalendarDays icon)
     - Medical Records (FileText icon)
     - Clara AI (Brain icon) — this one has an accent-500 violet dot indicator
     Each link: flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
     Default: text-neutral-700 hover:bg-neutral-50
     Active: bg-primary-50 text-primary-700 font-semibold
  3. Bottom section: User avatar circle (initials "DN"), name "Dr. Nguyen", role "Doctor" in muted text, and a LogOut icon button. Divider line above.

- Main content area: margin-left 256px, bg neutral-50, min-height screen, p-6 lg:p-8
- Top bar inside main area: flex justify-between items-center mb-8. Left side: page title (h1, text-2xl font-bold neutral-900). Right side: Bell icon (notification) with red dot badge, and user avatar.

MOBILE (below md):
- No sidebar visible by default
- Top header bar: white bg, shadow-sm, h-16, px-4. Left: hamburger Menu icon button. Center: Stethoscope + "MediTrack". Right: Bell icon.
- Hamburger opens full-screen overlay sidebar (same content as desktop sidebar), with X close button top-right
- Main content: px-4 pt-4

Show this layout with a placeholder "Dashboard" page title and some empty cards in a responsive grid (1 col mobile, 2 cols md, 4 cols lg) to demonstrate the content area.
```

---

## Prompt 2: Dashboard — Doctor Home Screen

```
Create a doctor dashboard home page for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Secondary-700 #0f766e, Accent-500 #a855f7, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Warning-500 #f59e0b, Error-500 #ef4444, White #fff.

Page background: neutral-50. Assume the sidebar navigation exists on the left (don't build it, just leave space).

Dashboard content:

1. WELCOME HEADER
   - "Good morning, Dr. Nguyen" (text-2xl font-bold neutral-900)
   - Subtitle: "Here's your overview for today" (neutral-500)
   - Right side: Today's date formatted nicely

2. STAT CARDS ROW — 4 cards in a responsive grid (1 col mobile, 2 cols sm, 4 cols lg), gap-6
   Each card: white bg, rounded-lg, shadow-sm, border neutral-200, p-6
   - "Today's Appointments": count "12", icon CalendarDays, primary-700 icon color, small trend "+3 from yesterday" in success-500
   - "Patients Seen": count "8", icon UserCheck, secondary-700 icon color
   - "Pending Records": count "5", icon FileText, warning-500 icon color
   - "Clara Sessions": count "3", icon Brain, accent-500 icon color

   Each card layout: icon in a 40x40 rounded-lg colored bg (e.g. primary-50) top-left, stat number text-3xl font-bold, label text-sm neutral-500 below.

3. TWO-COLUMN SECTION (stack on mobile, side-by-side on lg), gap-6

   LEFT — "Today's Schedule" card (takes 2/3 width on lg):
   - White card, p-6, header "Today's Schedule" with CalendarDays icon, "View All" link in primary-700 top-right
   - List of 5 upcoming appointments, each row:
     - Time: "09:00 AM" (font-medium neutral-900)
     - Patient name: "Sarah Johnson" (neutral-700)
     - Type: "Follow-up" badge (primary-100 text-primary-700 rounded-full px-2 text-xs)
     - Status badge: color-coded (Scheduled blue, Confirmed violet, Checked In cyan, In Progress amber)
     - Duration: "30 min" (neutral-500)
   - Rows separated by neutral-200 dividers
   - Subtle hover effect on each row (bg neutral-50)

   RIGHT — "Quick Actions" card (takes 1/3 width on lg):
   - White card, p-6, header "Quick Actions"
   - Vertical stack of 4 action buttons, space-y-3:
     - "New Appointment" (CalendarPlus icon, primary-700 bg, white text, full width, rounded-lg, h-11)
     - "Register Patient" (UserPlus icon, secondary-700 bg, white text)
     - "Ask Clara" (Brain icon, accent-500 bg, white text) — this is the Clara AI assistant button
     - "View Records" (FileSearch icon, white bg, border neutral-200, text neutral-700)

4. BOTTOM ROW — Two equal-width cards (stack on mobile), gap-6

   LEFT — "Recent Patients" card:
   - Header "Recent Patients" with Users icon, "View All" link
   - 4 patient rows: avatar circle (initials, random pastel bg), name, MRN number (muted), last visit date, Active/Inactive badge
   - Active badge: success-50 bg, success-700 text, border success-200

   RIGHT — "Clara's Insights" card:
   - Header with Brain icon in accent-500 and sparkle effect, title "Clara's Insights"
   - "3 sessions today" subtitle
   - 3 insight cards stacked:
     - Each: left colored bar (4px wide, rounded), content area with suggestion text, timestamp
     - Types: "Medication Alert" (error-500 bar), "Guideline Reference" (primary-700 bar), "Follow-up Suggestion" (warning-500 bar)
   - Bottom: "Ask Clara" link in accent-700

Mobile: everything stacks in single column. Touch targets minimum 40px. Full-width buttons.
```

---

## Prompt 3: Patient List & Patient Detail

```
Create two connected pages for a Patient Management feature in a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons, shadcn/ui components.
Colors: Primary-700 #1d4ed8, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Success-50 #f0fdf4, Error-50 #fef2f2, Error-700 #b91c1c, White #fff.

PAGE 1: PATIENT LIST (/patients)

- Breadcrumb: "Home > Patients"
- Page header: "Patients" title (text-2xl font-bold), right side: "Add Patient" button (primary-700 bg, UserPlus icon, white text)
- Filter/Search bar below header:
  - Search input with Search icon placeholder "Search by name, email, phone..." (flex-1)
  - Status filter dropdown: "All", "Active", "Inactive"
  - Results count: "Showing 24 patients"
  - Layout: flex-col gap-3 on mobile, flex-row on md

- Patient cards in a responsive grid: 1 col mobile, 2 cols md, 3 cols lg, gap-4
  Each patient card (white bg, rounded-lg, shadow-sm, border neutral-200, p-5, hover:shadow-md transition):
  - Top row: Avatar circle (48px, initials, pastel bg) + Name (font-semibold neutral-900) + Active/Inactive badge
  - Info rows below, each with icon + label:
    - MRN: Hash icon + "MRN-2024-001" (font-mono text-sm)
    - DOB: Calendar icon + "Jan 15, 1985" + age "(41 years)"
    - Phone: Phone icon + "(555) 123-4567"
    - Email: Mail icon + "sarah.j@email.com"
  - All info text: text-sm neutral-700, icons h-4 w-4 neutral-500
  - Bottom: "View Details" link in primary-700 text, right-aligned
  - Active badge: success-50 bg, success-700 text, success-200 border, rounded-full
  - Inactive badge: neutral-100 bg, neutral-500 text, rounded-full

- Pagination at bottom: "Showing 1-12 of 24" with Previous/Next buttons

- Loading state: 6 skeleton cards with animated pulse (neutral-100 bg blocks)
- Empty state: UserX icon (48px, neutral-300), "No patients found", "Try adjusting your search or filters" text

PAGE 2: PATIENT DETAIL (/patients/:id)

- Breadcrumb: "Home > Patients > Sarah Johnson"
- Header section: flex justify-between
  - Left: Patient name (text-2xl font-bold), Active badge, MRN below in mono
  - Right: Action buttons — "Edit" (Pencil icon, outline style), "View Medical Records" (FileText icon, primary-700), "Deactivate" (Ban icon, error outline) — stack vertically on mobile

- Info grid — 2 cols on md, 1 col on mobile, gap-6. Six white cards:

  Card 1 — "Basic Information":
  - Fields: Full Name, Date of Birth (with age), Gender, Blood Type
  - Each field: label (text-xs uppercase tracking-wide neutral-500 mb-1) + value (text-sm font-medium neutral-900)

  Card 2 — "Contact Information":
  - Fields: Phone, Email, Full Address (street, city, state, zip)

  Card 3 — "Emergency Contact":
  - Fields: Name, Relationship, Phone
  - Highlighted left border (warning-500, 4px) to draw attention

  Card 4 — "Medical Record Number":
  - Large MRN display in mono font, bg neutral-50 rounded p-3
  - Copy button with clipboard icon

  Card 5 — "Insurance Information":
  - Fields: Provider, Policy Number, Group Number
  - If no insurance: muted text "No insurance on file"

  Card 6 — "Metadata":
  - Created date, Last updated, Created by

- Each card: white bg, rounded-lg, shadow-sm, border neutral-200, p-6
- Card header: flex items-center gap-2, icon (h-5 w-5 primary-700) + title (font-semibold neutral-900), border-b neutral-200 pb-3 mb-4

Show both pages with realistic medical data. Mobile-first, minimum 40px touch targets.
```

---

## Prompt 4: Appointment Calendar

```
Create an appointment calendar page for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Primary-50 #eff6ff, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, White #fff.
Status colors: Scheduled #3b82f6, Confirmed #8b5cf6, CheckedIn #06b6d4, InProgress #f59e0b, Completed #22c55e, Cancelled #94a3b8, NoShow #ef4444.

PAGE: APPOINTMENT CALENDAR (/appointments)

- Breadcrumb: "Home > Appointments"
- Page title: "Appointments"

TOOLBAR (below title):
- Left: Provider filter dropdown ("All Providers", "Dr. Nguyen", "Dr. Smith", "Dr. Lee")
- Center: View toggle buttons group (Day | Week | Month) — active: primary-700 bg white text, inactive: white bg neutral-700 text border
- Right: "New Appointment" button (primary-700 bg, CalendarPlus icon, white text)
- Mobile: stack toolbar items vertically, full-width

CALENDAR — Week View (default):
- White card, rounded-lg, shadow-sm, border neutral-200
- Time column on the left: 7:00 AM to 6:00 PM, every 30 min interval, text-xs neutral-500
- Day columns: Mon through Fri headers with date (e.g. "Mon 24"), current day highlighted with primary-50 bg
- Grid lines: neutral-100 horizontal, neutral-200 vertical

- Appointment blocks floating in the grid:
  - Each block: rounded-md, left-4px colored border matching status color, p-2
  - Content: patient name (font-medium text-xs), time range, appointment type
  - Background: light version of status color (10% opacity)
  - Blocks for a sample Wednesday:
    - 9:00-9:30: "Sarah Johnson — Follow-up" (Scheduled, blue)
    - 10:00-10:45: "Mike Chen — Annual Physical" (Confirmed, violet)
    - 11:00-11:30: "Emily Davis — Lab Review" (In Progress, amber)
    - 2:00-2:30: "Robert Wilson — Consultation" (Checked In, cyan)
    - 3:30-4:00: "Lisa Park — Urgent" (Completed, green)

- On click of an appointment block, show a DETAIL PANEL sliding in from the right (or modal on mobile):
  - Patient name (font-semibold), appointment type
  - Date and time, duration
  - Status badge (color-coded, rounded-full)
  - Provider name
  - Notes section (if any)
  - Action buttons: "Check In", "Start", "Complete", "Cancel" — show only contextually valid actions
  - "Cancel" is destructive style (error-500 outline)

NEW APPOINTMENT MODAL (triggered by "New Appointment" button):
- Modal overlay with white card, max-w-lg, rounded-xl, shadow-xl, p-6
- Title: "New Appointment" with X close button
- Form fields (space-y-4):
  - Patient: searchable dropdown with patient names
  - Appointment Type: dropdown (Follow-up, Annual Physical, Consultation, Lab Review, Urgent Visit, New Patient)
  - Provider: dropdown
  - Date: date picker input
  - Start Time: time picker
  - Duration: dropdown (15 min, 30 min, 45 min, 60 min)
  - Notes: textarea (optional)
- Footer: "Cancel" ghost button + "Create Appointment" primary button

Mobile calendar: switch to a day-view list format. Each appointment as a horizontal card with time, patient, type, status badge. Swipe or arrows to navigate days.
```

---

## Prompt 5: Medical Record Detail

```
Create a comprehensive medical record detail page for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Secondary-700 #0f766e, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Warning-500 #f59e0b, Error-500 #ef4444, White #fff.
Triage: Critical #dc2626, Urgent #ea580c, Routine #3b82f6.

PAGE: MEDICAL RECORD DETAIL (/medical-records/:id)

- Breadcrumb: "Home > Patients > Sarah Johnson > Medical Records > Persistent Headache with Dizziness"

HEADER SECTION:
- Title: "Persistent Headache with Dizziness" (text-2xl font-bold neutral-900)
- Row of badges: Status "Active" (success), Severity "Moderate" (warning-500 bg white text), Record type "Outpatient"
- Subtitle: "Dr. Nguyen — Created Feb 15, 2026"
- Right side: Actions dropdown (three-dot MoreVertical icon) with options: "Mark as Resolved", "Requires Follow-up", "Archive Record"
- Mobile: badges wrap, actions below title

CONTENT — Responsive grid: single column on mobile, two columns on lg for some sections.

SECTION 1 — "Diagnosis & Chief Complaint" (full width card):
- White card, p-6, rounded-lg, shadow-sm, border neutral-200
- Header: Stethoscope icon (primary-700) + "Diagnosis & Chief Complaint"
- Chief Complaint: "Patient reports persistent headaches occurring 3-4 times per week for the past month, accompanied by occasional dizziness and light sensitivity."
- Primary Diagnosis: "Tension-type headache (G44.2)" — code in mono bg neutral-50 px-2 rounded
- Secondary Diagnosis: "Cervicalgia (M54.2)"
- Onset: "January 2026"
- Body text: text-sm neutral-700, leading-relaxed

SECTION 2 — "Vital Signs" (full width card):
- Header: Activity icon + "Vital Signs" + timestamp "Recorded Feb 15, 2026 at 10:30 AM"
- Grid of vital sign cards: 2 cols mobile, 4 cols md, gap-4
  Each vital: bg neutral-50 rounded-lg p-4, icon top, value large (text-2xl font-bold), label (text-xs neutral-500), unit
  - Blood Pressure: Heart icon, "128/82" mmHg (warning-500 text — slightly elevated)
  - Heart Rate: HeartPulse icon, "76" bpm (success-500 text — normal)
  - Temperature: Thermometer icon, "98.6" °F (neutral-700 — normal)
  - O2 Saturation: Wind icon, "98" % (success-500 — normal)
  - Weight: Scale icon, "165" lbs
  - Height: Ruler icon, "5'9""
  - BMI: Calculator icon, "24.4" (success-500 — normal)

SECTION 3 — "Clinical Notes" (full width card):
- Header: StickyNote icon + "Clinical Notes" + "Add Note" button (primary outline)
- List of notes, each with:
  - Note type badge: "Progress Note" (primary-100 text-primary-700), "SOAP Note" (secondary-100 text-secondary-700), "Assessment" (accent-100 text-accent-700)
  - Author: "Dr. Nguyen" + date
  - Content: multi-line text block
  - Separator line between notes
- Show 3 sample notes with realistic medical content

SECTION 4 — "Prescriptions" (full width card):
- Header: Pill icon (secondary-700) + "Prescriptions"
- Table on desktop, card list on mobile:
  Columns: Medication Name, Dosage, Frequency, Prescribed By, Start Date, Status
  Sample rows:
  - "Ibuprofen 400mg" | "400mg" | "Every 8 hours as needed" | "Dr. Nguyen" | "Feb 15, 2026" | Active (success badge)
  - "Sumatriptan 50mg" | "50mg" | "As needed for migraine" | "Dr. Nguyen" | "Feb 15, 2026" | Active
  - "Amitriptyline 10mg" | "10mg" | "Once daily at bedtime" | "Dr. Lee" | "Jan 20, 2026" | Completed (neutral badge)
- Status badges: Active (success-50/success-700), Filled (info-50/info-700), Completed (neutral-100/neutral-700), Cancelled (error-50/error-700)

SECTION 5 — "Attachments" (full width card):
- Header: Paperclip icon + "Attachments" + "Upload" button
- File list: icon (FileImage for images, FileText for docs) + filename + file size + date + Download button
- Sample: "brain-mri-scan.pdf" (2.4 MB), "blood-work-results.pdf" (156 KB)

Mobile: all sections stack single column, tables become card lists, touch targets 40px minimum.
```

---

## Prompt 6: Clara — Session Start Screen

```
Create an AI clinical assistant start screen for a feature called "Clara" in a medical EMR app called "MediTrack". Clara is the doctor's AI-powered medical secretary — friendly, smart, and always ready to help during consultations.

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Accent-500 #a855f7, Accent-700 #7c3aed, Accent-50 #faf5ff, Neutral-50 #f8fafc, Neutral-100 #f1f5f9, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Warning-500 #f59e0b, Secondary-700 #0f766e, White #fff.

This is a premium AI feature for doctors — the design should feel modern, polished, warm, and slightly different from the rest of the app (use accent/violet tones). Clara should feel like a trusted team member, not a cold tool. Think of it as Clara's "home" — a place where the doctor checks in before, during, and after consultations.

PAGE: CLARA — START SESSION (/clara)
Page background: subtle gradient from neutral-50 to accent-50/30 (very faint violet tint at the bottom).

HERO SECTION (centered, max-w-2xl mx-auto, text-center, pt-10 pb-6):
- Clara avatar: a 72px circle with gradient bg (accent-500 to primary-700), containing a Brain icon (h-10 w-10 white). Two concentric ring animations around it: inner ring (accent-200, animate-ping opacity-20, 80px), outer ring (accent-100, animate-ping opacity-10, 96px, delayed). This creates a gentle "alive" breathing effect.
- Title: "Clara" (text-3xl font-bold, gradient text from accent-700 to primary-700 via bg-clip-text)
- Tagline: "Your AI Medical Secretary" (text-xs font-semibold accent-500 uppercase tracking-widest, mt-1)
- Greeting: Time-aware and contextual (text-lg neutral-700, mt-3):
  - Morning: "Good morning, Dr. Nguyen. You have 4 consultations today — ready when you are."
  - Afternoon: "Good afternoon, Dr. Nguyen. 2 patients left today — let's finish strong."
  - Evening: "Good evening, Dr. Nguyen. Wrapping up? I can help with your session notes."
  This greeting makes Clara feel aware and present, not static.

DAILY STATS BAR — (flex items-center justify-center gap-6, mt-6, text-center):
  Three inline metrics, each: flex items-center gap-1.5
  - Brain icon (h-4 w-4 accent-500) + "3 sessions today" (text-sm font-medium neutral-700)
  - Lightbulb icon (h-4 w-4 success-500) + "12 suggestions accepted" (text-sm font-medium neutral-700)
  - Clock icon (h-4 w-4 primary-700) + "1.2 hrs saved" (text-sm font-medium neutral-700)
  Mobile: wrap into 1 row centered, gap-4, text-xs. These stats subtly show Clara's value.

START SESSION CARD — (white bg, rounded-2xl, shadow-md, border border-accent-200/50, p-6, max-w-lg mx-auto, mt-8):
  This is the primary action — visually prominent, elevated above other sections.

  Header row: flex items-center justify-between
  - Left: "Start New Session" (text-lg font-semibold neutral-900)
  - Right: Mic icon in a small circle (h-8 w-8, accent-50 bg, accent-500 icon) — microphone status indicator. Green dot overlay if mic permission granted, warning-500 dot if not yet granted.

  MICROPHONE CHECK (conditional, shown only if permission not yet granted):
  - Small banner inside card: bg warning-50, rounded-lg, p-3, flex items-center gap-2, mb-4
  - AlertTriangle icon (h-4 w-4 warning-500) + "Microphone access needed. Clara needs your mic to transcribe." (text-xs warning-700) + "Allow" link button (text-xs font-semibold accent-700 underline)

  PATIENT SEARCH FIELD:
  - Label: "Link a patient" (text-sm font-medium neutral-700) + "(optional)" in neutral-500
  - Search input: h-11, rounded-lg, border neutral-200, pl-10 (Search icon inside), placeholder "Search by name or MRN..."
  - Autocomplete dropdown below input showing 3 recent/matching patients:
    Each row: flex items-center gap-3, px-3 py-2.5, hover:bg-accent-50, rounded-md, cursor-pointer
    - Avatar circle (32px, initials, pastel bg) + Name (text-sm font-medium neutral-900) + MRN (text-xs font-mono neutral-500) + "Last seen: Feb 20" (text-xs neutral-500)
    Show sample: "Sarah Johnson" (MRN-2024-001), "Mike Chen" (MRN-2024-002), "Emily Davis" (MRN-2024-003)
  - Helpful text below: "Clara provides better suggestions with patient context" (text-xs neutral-500, flex items-center gap-1 with Sparkles h-3 w-3 accent-500)

  SESSION TYPE SELECTOR (optional, mt-4):
  - Label: "Session type" (text-sm font-medium neutral-700)
  - Three pill toggle buttons in a row (flex gap-2):
    - "Consultation" (default active: accent-500 bg white text, rounded-full px-4 py-1.5 text-sm font-medium)
    - "Follow-up" (inactive: white bg neutral-200 border neutral-700 text, hover:border-accent-300)
    - "Review" (inactive, same as Follow-up)
  This helps Clara tailor suggestions — e.g., follow-ups reference prior visit notes.

  START BUTTON (mt-6):
  - Full width, h-12, bg gradient from accent-500 to accent-700, white text, rounded-xl, font-semibold text-base, shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-200
  - Content: Play icon (h-5 w-5) + "Start Session with Clara"
  - Subtle shimmer animation on the gradient (CSS keyframe: moving highlight from left to right, 3s infinite)
  - Below button: "Clara will listen, transcribe, and suggest — all in real-time" (text-xs neutral-500 text-center, mt-2)

QUICK START FROM TODAY'S APPOINTMENTS — (max-w-lg mx-auto, mt-8):
  Header: flex items-center justify-between
  - "Upcoming Appointments" (text-sm font-semibold neutral-900) with CalendarDays icon (h-4 w-4 neutral-500)
  - "View all" link (text-xs accent-700)

  3 appointment cards stacked (space-y-2):
  Each card: white bg, rounded-xl, border neutral-200, p-4, flex items-center justify-between, hover:border-accent-200 hover:shadow-sm transition, cursor-pointer
  - Left: flex items-center gap-3
    - Time: "10:30 AM" (text-sm font-mono font-semibold neutral-900, min-w-[72px])
    - Divider: 1px h-8 bg neutral-200
    - Patient info: Name "Sarah Johnson" (text-sm font-medium neutral-900) + type "Follow-up" (text-xs neutral-500)
  - Right: "Start with Clara" button (text-xs font-medium accent-700, border border-accent-200, rounded-full px-3 py-1.5, hover:bg-accent-50, flex items-center gap-1.5 with Play h-3 w-3)

  This lets doctors start a Clara session directly from their schedule with patient pre-linked — fewest taps possible.

RECENT SESSIONS — (max-w-lg mx-auto, mt-8):
  Header: flex items-center justify-between
  - "Recent Sessions" (text-sm font-semibold neutral-900) with History icon (h-4 w-4 neutral-500)
  - "View history" link (text-xs accent-700)

  3 recent session cards stacked (space-y-2):
  Each card: white bg, rounded-xl, border neutral-200, p-4, flex items-center justify-between, hover:border-neutral-300 transition, cursor-pointer
  - Left: flex items-center gap-3
    - Status circle: success-500 filled (completed) or warning-500 filled (has pending notes)
    - Info stack: Patient name "Mike Chen" (text-sm font-medium neutral-900) + "Consultation — 23 min" (text-xs neutral-500) + "Today, 9:15 AM" (text-xs neutral-500)
  - Right: flex items-center gap-2
    - "5 suggestions" badge (text-xs accent-100 text-accent-700 rounded-full px-2 py-0.5)
    - ChevronRight icon (h-4 w-4 neutral-400)

  Session 1: "Mike Chen" — Consultation, 23 min, Today 9:15 AM, completed, 5 suggestions
  Session 2: "Emily Davis" — Follow-up, 18 min, Today 8:30 AM, completed, 3 suggestions
  Session 3: "Robert Wilson" — Consultation, 31 min, Yesterday 3:00 PM, has pending notes (warning dot), 7 suggestions

FEATURE CARDS — (max-w-3xl mx-auto, mt-10):
  Title: "What Clara Can Do" (text-sm font-semibold neutral-900, mb-4, text-center)
  3 cards in a row (1 col mobile, 3 cols md), gap-4:
  Each card: white bg, rounded-xl, border neutral-200, p-5, text-center, hover:shadow-md hover:border-accent-200 transition-all duration-200, group

  Card 1: Mic icon (h-8 w-8) in accent-50 rounded-xl p-2.5 mx-auto (icon color accent-500) → "Live Transcription" (text-sm font-semibold neutral-900, mt-3) → "Real-time speech-to-text with automatic speaker identification" (text-xs neutral-500, mt-1) → stat: "98.5% accuracy" (text-xs font-mono accent-700, mt-2)
  Card 2: Lightbulb icon same style → "AI Suggestions" → "Evidence-based clinical recommendations as you consult" → stat: "12 accepted today"
  Card 3: FileText icon same style → "Auto SOAP Notes" → "Automatic clinical note generation from session transcript" → stat: "~2 min saved per note"

  The stats at the bottom of each card make them feel real and quantified, not just marketing text.

HOW IT WORKS SECTION (max-w-2xl mx-auto, mt-10, mb-6):
- Title: "How It Works" (text-sm font-semibold neutral-900, text-center, mb-6)
- 4 horizontal steps (vertical on mobile) connected by a dotted line (border-dashed border-neutral-200):
  Step 1: Play icon (h-5 w-5 accent-500) above → "1" circle (h-7 w-7, accent-500 bg white text, text-xs font-bold) → "Start" (text-sm font-medium neutral-900) → "Hit start and begin consulting" (text-xs neutral-500)
  Step 2: Mic icon → "2" circle → "Speak" → "Talk naturally — Clara identifies speakers"
  Step 3: Sparkles icon → "3" circle → "Insights" → "Get evidence-based suggestions in real time"
  Step 4: Save icon → "4" circle → "Save" → "Export notes directly to the patient record"
- On desktop: flex items-start justify-between with dotted connector lines between circles
- On mobile: vertical stepper, dotted line on the left side connecting circles

FOOTER (text-center, mt-6, mb-8, max-w-md mx-auto):
- Shield icon (h-4 w-4 neutral-500) + "End-to-end encrypted. HIPAA-compliant. Clara never stores audio recordings." (text-xs neutral-500)
- Below: "Clara v1.0 — Powered by MediTrack AI" (text-xs neutral-400, mt-1)

MOBILE-SPECIFIC BEHAVIOR:
- Hero section: reduce pt to pt-6, icon to 56px circle, title text-2xl
- Stats bar: horizontal scroll or wrap to 2 rows
- Start Session card: full width (mx-4), rounded-xl, no max-w constraint
- Quick Start appointments: horizontal swipeable cards (snap scroll, overflow-x-auto, flex-nowrap, gap-3, scroll-snap-type-x mandatory) — each card min-w-[280px], scroll-snap-align-start
- Recent Sessions and Feature Cards: full width, single column
- How It Works: vertical stepper layout
- Touch targets: all buttons minimum h-11, interactive cards minimum 48px touch area
- Fixed bottom bar on mobile (sticky bottom-0, white bg, shadow-[0_-4px_12px_rgba(0,0,0,0.05)], px-4 py-3, z-40):
  - "Start Session" button (full width, h-12, gradient accent-500 to accent-700, white text, rounded-xl, font-semibold) with Play icon
  - This ensures the primary action is always one thumb-tap away, no scrolling needed

Overall feel: clean, spacious, premium, warm. Clara's page should feel like opening a well-designed app within the app. The accent violet distinguishes it from clinical blue pages. Generous whitespace. Subtle animations (breathing avatar, shimmer button) add life without being distracting. The page prioritizes ACTION (start session / pick from schedule) over explanation — doctors are busy, they don't want to read a brochure every time.
```

---

## Prompt 7: Clara — Live Session View

```
Create a real-time AI clinical session interface for "Clara" (the AI medical secretary) in a medical EMR app called "MediTrack". This is the main working screen where doctors interact with Clara during patient consultations. Clara listens, transcribes, and provides suggestions — like a smart colleague sitting in on the consultation.

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Accent-500 #a855f7, Accent-700 #7c3aed, Accent-50 #faf5ff, Neutral-50 #f8fafc, Neutral-100 #f1f5f9, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Warning-500 #f59e0b, Error-500 #ef4444, White #fff.

PAGE: LIVE SESSION (/clara/session/:id)

TOP BAR (sticky, white bg, shadow-sm, h-16, px-4, flex items-center justify-between, z-50):
- Left: Back arrow (ChevronLeft) + "Session #S-2026-0042" (font-mono text-sm)
- Center: Connection status indicator
  - Connected: green dot (animate-pulse) + "Connected" in success-500
  - Disconnected would show: red dot + "Disconnected" in error-500
- Right: Timer "23:45" (elapsed time, font-mono), and "End Session" button (error-500 outline, rounded-lg)
- Far right or below timer: small "Clara" label with Brain icon in accent-500 to remind the doctor who's assisting

MAIN CONTENT — Two-panel layout (stack on mobile, side-by-side on lg):
  Left panel: 60% width on lg. Right panel: 40% width on lg.

LEFT PANEL — "Transcript" (white card, rounded-lg, border neutral-200, flex flex-col, h-[calc(100vh-180px)]):
- Header: Mic icon + "Live Transcript" + recording indicator (red dot animate-pulse + "Recording")
- Scrollable transcript area (flex-1 overflow-y-auto, p-4, space-y-3):
  Show 8-10 conversation entries:

  Each entry layout: flex gap-3
  - Speaker badge: "Doctor" (primary-100 text-primary-700 rounded-full px-2.5 py-0.5 text-xs font-medium) or "Patient" (secondary-100 text-secondary-700)
  - Content: speech text (text-sm neutral-700)
  - Timestamp: "10:23 AM" (text-xs neutral-500, right-aligned)

  Sample transcript:
  [Doctor] "Good morning. What brings you in today?"
  [Patient] "I've been having these terrible headaches for about a month now. They come almost every other day."
  [Doctor] "Can you describe the pain? Where exactly do you feel it?"
  [Patient] "It's mostly here, behind my eyes and across my forehead. It feels like pressure, like a tight band."
  [Doctor] "On a scale of 1 to 10, how would you rate the pain?"
  [Patient] "Usually about a 6 or 7. Sometimes it gets worse with bright lights."
  [Doctor] "Have you noticed any other symptoms? Nausea, vision changes?"
  [Patient] "Some dizziness when I stand up quickly, and I've been more sensitive to light lately."
  [Doctor] "Are you currently taking any medications?"
  [Patient] "Just over-the-counter ibuprofen, but it only helps a little."

  One entry should show a low-confidence warning: small AlertTriangle icon (warning-500) + "Low confidence" tooltip

- Bottom action bar (border-t neutral-200, p-3, flex items-center gap-3):
  - Mic toggle button: large circle (h-12 w-12), accent-500 bg, white Mic icon, animate-pulse ring effect when active
  - "Ask Clara" button (accent-700 bg, white text, Sparkles icon, rounded-lg)
  - Mic status text: "Clara is listening..." in accent-500 text-sm

RIGHT PANEL — "Clara's Suggestions" (white card, rounded-lg, border neutral-200, flex flex-col, h-[calc(100vh-180px)]):
- Header: Sparkles icon (accent-500) + "Clara's Suggestions" + count badge "4"
- Scrollable area (flex-1 overflow-y-auto, p-4, space-y-3):

  Show 4 suggestion cards, each:
  - Left colored bar (4px wide, rounded-full)
  - Content area: type badge top-right, suggestion text, source reference, timestamp

  Suggestion 1 — URGENT:
  - Red left bar (error-500)
  - AlertTriangle icon + "Urgent" badge (error-50 text-error-700)
  - "Blood pressure should be monitored — 128/82 with reported dizziness may indicate hypertensive episodes. Consider 24-hour ambulatory BP monitoring."
  - Source: "AHA Hypertension Guidelines 2023"
  - Time: "2 min ago"

  Suggestion 2 — MEDICATION:
  - Teal left bar (secondary-700)
  - Pill icon + "Medication" badge (secondary-50 text-secondary-700)
  - "Current ibuprofen use for tension headaches: consider switching to acetaminophen to reduce GI risk with chronic use. Prophylactic amitriptyline 10mg at bedtime for frequent tension headaches (>15 days/month)."
  - Source: "NICE Headache Guidelines"
  - Time: "3 min ago"

  Suggestion 3 — GUIDELINE:
  - Blue left bar (primary-700)
  - BookOpen icon + "Guideline" badge (primary-50 text-primary-700)
  - "Red flags to rule out: sudden onset 'thunderclap' headache, progressive worsening, neurological deficits, fever. Patient's presentation consistent with tension-type headache but photosensitivity warrants further evaluation."
  - Source: "AAN Practice Guidelines"
  - Time: "5 min ago"

  Suggestion 4 — FOLLOW-UP:
  - Amber left bar (warning-500)
  - Lightbulb icon + "Recommendation" badge (warning-50 text-warning-700)
  - "Recommend: headache diary for 4 weeks, follow-up in 2-4 weeks, consider referral to neurology if no improvement with prophylactic treatment."
  - Time: "5 min ago"

MOBILE LAYOUT:
- Panels stack vertically (transcript on top, suggestions below)
- Tab toggle at top: "Transcript" | "Clara's Notes" — switch between panels (only show one at a time on mobile)
- Floating mic button: fixed bottom-center, h-14 w-14, accent-500, rounded-full, shadow-lg, z-50
- "Ask Clara" becomes a floating action button next to mic

The overall feel should be focused and clinical — a working interface, not decorative. Clara is present but unobtrusive, like a quiet assistant in the room. Clean lines, functional spacing, easy to scan while talking to a patient.
```

---

## Prompt 8: Patient Registration / Edit Form

```
Create a patient registration form for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons, shadcn/ui form components.
Colors: Primary-700 #1d4ed8, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Error-500 #ef4444, Error-50 #fef2f2, White #fff.

PAGE: REGISTER NEW PATIENT (/patients/new)

- Breadcrumb: "Home > Patients > New Patient"
- Title: "Register New Patient" (text-2xl font-bold neutral-900)
- Subtitle: "Fill in the patient's information below" (text-sm neutral-500)

FORM — White card, rounded-lg, shadow-sm, border neutral-200, max-w-3xl, mx-auto

All form inputs: h-10, rounded-md, border neutral-200, px-3, text-sm, focus:ring-2 focus:ring-primary-700 focus:border-primary-700, placeholder text neutral-400.
Labels: text-sm font-medium neutral-700, mb-1.5
Required fields: red asterisk after label.
Error state: border error-500, ring error-500, error message text-xs error-500 mt-1.

SECTION 1 — "Personal Information" (p-6, border-b neutral-200):
- Section header: User icon + "Personal Information" (font-semibold neutral-900)
- Grid: 2 cols on md, 1 col mobile, gap-4
  - First Name* (text input)
  - Last Name* (text input)
  - Date of Birth* (date picker input with Calendar icon)
  - Gender* (select: Male, Female, Other, Prefer not to say)
  - Blood Type (select: A+, A-, B+, B-, AB+, AB-, O+, O-)

  Show one field with validation error: First Name empty, red border, "First name is required" error text below

SECTION 2 — "Contact Information" (p-6, border-b neutral-200):
- Section header: Phone icon + "Contact Information"
- Grid: 2 cols on md
  - Phone Number* (tel input with country code prefix "+1")
  - Email Address* (email input, autocomplete="email")
  - Street Address (text input, full width / col-span-2)
  - City (text input)
  - State (select dropdown with US states)
  - ZIP Code (text input, max-w-[120px])

SECTION 3 — "Emergency Contact" (p-6, border-b neutral-200):
- Section header: AlertCircle icon (warning-500) + "Emergency Contact"
- Highlighted: left border 4px warning-500 on the section
- Grid: 2 cols on md
  - Contact Name* (text input)
  - Relationship* (select: Spouse, Parent, Sibling, Child, Friend, Other)
  - Contact Phone* (tel input)

SECTION 4 — "Insurance Information" (p-6):
- Section header: Shield icon + "Insurance Information"
- Muted note: "Optional — can be added later" (text-xs neutral-500)
- Grid: 2 cols on md
  - Insurance Provider (text input, placeholder "e.g. Blue Cross Blue Shield")
  - Policy Number (text input)
  - Group Number (text input)

FORM FOOTER (p-6, bg neutral-50, rounded-b-lg, border-t neutral-200):
- flex justify-between (stack on mobile)
- Left: "Cancel" button (ghost style, neutral-700)
- Right: "Register Patient" button (primary-700 bg, white text, UserPlus icon, h-11 px-6)
- On mobile: both buttons full-width, Register on top, Cancel below, gap-3

Show a realistic partially-filled form with the doctor filling in "Sarah Johnson" as a new patient.

Mobile: single column for all fields, larger touch targets, comfortable spacing.
```

---

## Prompt 9: Medical Records List with Filters

```
Create a medical records list page with advanced filtering for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Secondary-700 #0f766e, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Success-500 #22c55e, Warning-500 #f59e0b, Error-500 #ef4444, White #fff.
Triage: Critical #dc2626, Urgent #ea580c, Routine #3b82f6.

PAGE: MEDICAL RECORDS (/medical-records)

- Breadcrumb: "Home > Medical Records"
- Header: "Medical Records" title + "New Record" button (primary-700)

FILTER BAR — White card, rounded-lg, border neutral-200, p-4, mb-6:
- Row 1 (flex-wrap gap-3):
  - Search input (flex-1, min-w-[200px]): Search icon + "Search by diagnosis, complaint, or patient..."
  - Patient filter: dropdown "All Patients"
  - Status filter: dropdown "All Statuses" (Active, Requires Follow-up, Resolved, Archived)
  - Severity filter: dropdown "All Severities" (Critical, Urgent, Moderate, Mild)
- Row 2 (flex items-center justify-between):
  - Date range: "From" date input + "To" date input
  - Results count: "Showing 18 records" (text-sm neutral-500)
  - Active filters as removable chips: e.g. "Status: Active ×", "Severity: Urgent ×" (neutral-100 rounded-full px-3 py-1 text-xs)

RECORDS LIST — Cards layout (space-y-3):
Each record card (white bg, rounded-lg, shadow-sm, border neutral-200, border-l-4, p-5):
- Left border color based on severity:
  - Critical: #dc2626 (red)
  - Urgent: #ea580c (orange)
  - Moderate: #f59e0b (amber)
  - Mild: #3b82f6 (blue)

- Card layout — flex items-start gap-4 (stack on mobile):
  LEFT (flex-1):
  - Title: "Persistent Headache with Dizziness" (font-semibold neutral-900, hover:text-primary-700 cursor-pointer)
  - Patient: Users icon + "Sarah Johnson" (text-sm neutral-700)
  - Provider: Stethoscope icon + "Dr. Nguyen" (text-sm neutral-500)
  - Date: Calendar icon + "Feb 15, 2026" (text-sm neutral-500)

  RIGHT (flex-shrink-0, flex items-center gap-2):
  - Status badge: "Active" (success-50 text-success-700 border-success-200) or "Requires Follow-up" (warning-50 text-warning-700)
  - Severity badge: "Urgent" (triage color bg, white text, rounded-full px-2.5 py-0.5 text-xs font-medium)
  - ChevronRight icon (neutral-400)

Show 6 sample records with varied severities and statuses:
1. "Persistent Headache with Dizziness" — Urgent, Active, Sarah Johnson
2. "Type 2 Diabetes Management" — Routine, Active, Mike Chen
3. "Acute Lower Back Pain" — Moderate, Requires Follow-up, Emily Davis
4. "Chest Pain — Ruled Out Cardiac" — Critical, Resolved, Robert Wilson
5. "Seasonal Allergic Rhinitis" — Mild, Active, Lisa Park
6. "Post-Surgical Follow-up — Knee Replacement" — Moderate, Archived, James Taylor

PAGINATION — Bottom, flex justify-between items-center:
- "Showing 1-6 of 18 records"
- Page buttons: 1, 2, 3, Previous, Next

Mobile: cards full-width, badges wrap below title, filter dropdowns stack vertically.
```

---

## Prompt 10: Login Page

```
Create a login page for a medical EMR app called "MediTrack".

Tech: React, TypeScript, Tailwind CSS, Lucide React icons.
Colors: Primary-700 #1d4ed8, Primary-50 #eff6ff, Neutral-50 #f8fafc, Neutral-200 #e2e8f0, Neutral-500 #64748b, Neutral-700 #334155, Neutral-900 #0f172a, Error-500 #ef4444, Error-50 #fef2f2, White #fff.

PAGE: LOGIN (/login)

Full-screen layout, no sidebar, no header.

TWO-COLUMN LAYOUT (single column on mobile):

LEFT SIDE (hidden on mobile, visible on lg) — 50% width:
- Background: gradient from primary-700 to primary-800
- Content centered vertically and horizontally, text-white, p-12:
  - Stethoscope icon (h-16 w-16, white, mb-6)
  - "MediTrack" (text-4xl font-bold, mb-3)
  - "Enterprise Medical Records System" (text-xl font-light opacity-90, mb-8)
  - Three feature bullets with checkmark CircleCheck icons:
    - "Secure patient record management"
    - "Clara — your AI medical secretary"
    - "Real-time appointment scheduling"
  - Bottom: "Trusted by healthcare professionals" + small shield Lock icon
- Subtle decorative element: large translucent circle shapes in the background (opacity-10)

RIGHT SIDE — Login form (50% on lg, full on mobile):
- Centered card, max-w-sm, mx-auto, py-12 px-6
- Mobile: show Stethoscope icon + "MediTrack" branding above the form (hidden on lg since left side shows it)
- Form card (on mobile: white bg, rounded-xl, shadow-sm, border neutral-200, p-8. On lg: no card, just the form):
  - "Welcome back" (text-2xl font-bold neutral-900)
  - "Sign in to your account" (text-sm neutral-500, mb-8)

  - Email field:
    - Label: "Email address"
    - Input: Mail icon inside, autocomplete="email", placeholder "doctor@meditrack.com"

  - Password field:
    - Label: "Password"
    - Input: Lock icon inside, autocomplete="current-password", type="password"
    - Show/hide toggle: Eye/EyeOff icon button on the right side of input
    - "Forgot password?" link below, right-aligned, text-sm primary-700

  - "Remember me" checkbox + label (flex items-center gap-2)

  - "Sign In" button: full width, h-11, bg primary-700, text white, font-semibold, rounded-lg, hover:bg-primary-600
    Loading state: Loader2 icon animate-spin + "Signing in..."

  - Divider: horizontal line with "or" text centered

  - "Sign in with SSO" button: full width, outline style, border neutral-200, neutral-700 text, Building2 icon

  - Bottom: "Don't have an account? Contact your administrator" (text-sm neutral-500, text-center)

ERROR STATE: Show an error banner above the form:
- bg error-50, border error-200, rounded-lg, p-3, flex items-center gap-2
- AlertCircle icon (error-500) + "Invalid email or password. Please try again." (text-sm error-700)

Page background: white on lg (left side has the color), neutral-50 on mobile.
Mobile: centered layout, comfortable thumb-zone positioning for form fields.
```

---

## Tips for Using These Prompts

1. **Run Prompt 0 first** to establish the design system — reference it in follow-up prompts
2. **One prompt at a time** — Lovable works best with focused, single-page prompts
3. **Iterate** — After generating, tell Lovable "make the cards more compact" or "increase whitespace" to refine
4. **Export** — Screenshot the generated UI or export the code to reference while building in MediTrack
5. **Combine** — After generating individual pages, you can ask Lovable to "combine the sidebar from Prompt 1 with the dashboard from Prompt 2"
7. **Clara personality** — If Clara's pages feel too "techy", tell Lovable: "Make Clara feel warmer and more human — like a friendly colleague, not a robot"
6. **Mobile check** — Always ask Lovable to "show me the mobile version" to verify responsive behavior
