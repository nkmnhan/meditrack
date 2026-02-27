# MediTrack Design Tokens

Use these exact tokens in every Lovable prompt to ensure consistent output.

## Color Palette

### Primary (Medical Blue)
| Token | Hex | Usage |
|-------|-----|-------|
| primary-50 | #eff6ff | Light backgrounds, hover states |
| primary-100 | #dbeafe | Selected row, active tab bg |
| primary-200 | #bfdbfe | Borders on primary elements |
| primary-600 | #2563eb | Hover for primary buttons |
| primary-700 | #1d4ed8 | Buttons, headers, links, nav active |
| primary-800 | #1e40af | Pressed state |

### Secondary (Healthcare Teal)
| Token | Hex | Usage |
|-------|-----|-------|
| secondary-50 | #f0fdfa | Light teal backgrounds |
| secondary-100 | #ccfbf1 | Teal badges bg |
| secondary-600 | #0d9488 | Hover for secondary buttons |
| secondary-700 | #0f766e | Secondary buttons, accents |

### Accent (Violet) — Use Sparingly
| Token | Hex | Usage |
|-------|-----|-------|
| accent-50 | #faf5ff | AI feature backgrounds |
| accent-100 | #f3e8ff | AI badge backgrounds |
| accent-500 | #a855f7 | CTA highlights only |
| accent-700 | #7c3aed | AI section headers, hover |

### Neutral (Slate)
| Token | Hex | Usage |
|-------|-----|-------|
| neutral-50 | #f8fafc | Page background |
| neutral-100 | #f1f5f9 | Skeleton loaders, subtle bg |
| neutral-200 | #e2e8f0 | Borders, dividers, card outlines |
| neutral-300 | #cbd5e1 | Disabled borders |
| neutral-500 | #64748b | Muted/secondary text |
| neutral-700 | #334155 | Body text |
| neutral-900 | #0f172a | Headings, primary text |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| success-50 | #f0fdf4 | Success banner bg |
| success-500 | #22c55e | Active badges, confirmations |
| success-700 | #15803d | Success text |
| warning-50 | #fffbeb | Warning banner bg |
| warning-500 | #f59e0b | Pending states, caution |
| warning-700 | #b45309 | Warning text |
| error-50 | #fef2f2 | Error banner bg |
| error-500 | #ef4444 | Error icons, destructive |
| error-700 | #b91c1c | Error text |
| info-50 | #f0f9ff | Info banner bg |
| info-500 | #0ea5e9 | Info icons, links |
| info-700 | #0369a1 | Info text |

### Medical Status
| Token | Hex | Context |
|-------|-----|---------|
| status-scheduled | #3b82f6 | Scheduled appointments |
| status-confirmed | #8b5cf6 | Confirmed appointments |
| status-checkedIn | #06b6d4 | Checked-in appointments |
| status-inProgress | #f59e0b | In-progress appointments |
| status-completed | #22c55e | Completed appointments |
| status-cancelled | #94a3b8 | Cancelled appointments |
| status-noShow | #ef4444 | No-show appointments |

### Triage Severity
| Token | Hex | Context |
|-------|-----|---------|
| triage-critical | #dc2626 | Critical severity |
| triage-urgent | #ea580c | Urgent severity |
| triage-routine | #3b82f6 | Routine severity |

## Typography
- **Font**: Inter (sans-serif), fallback: system-ui
- **Headings**: neutral-900, font-semibold or font-bold
- **Body text**: neutral-700, font-normal
- **Muted text**: neutral-500
- **Serif (print)**: Georgia, Merriweather

## Spacing
- Page container: max-w-7xl, px-4 sm:px-6 lg:px-8
- Section gap: space-y-8
- Card padding: p-6
- Card grid gap: gap-6
- Form field gap: space-y-4
- Inline icon + text: gap-2

## Border Radius
- Cards: rounded-lg (8px)
- Buttons: rounded-lg (8px)
- Badges: rounded-full (pill)
- Inputs: rounded-md (6px)

## Shadows
- Cards: shadow-sm
- Modals: shadow-lg
- Dropdowns: shadow-md

## Icons
- Library: Lucide React
- UI icons: 20x20 (h-5 w-5)
- Inline icons: 16x16 (h-4 w-4)
- Large hero icons: 48x48 (h-12 w-12)

## Touch Targets
- Minimum: 40x40px (h-10 w-10)
- Mobile buttons: full width (w-full)
