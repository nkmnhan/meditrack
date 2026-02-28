import { Pill, Stethoscope, ClipboardList, HeartPulse, FileSearch } from "lucide-react";
import type { ElementType } from "react";

export interface ClaraSuggestion {
  readonly id: string;
  readonly icon: ElementType;
  readonly label: string;
  readonly prompt: string;
  readonly category: string;
  readonly accentColor: string;
}

export interface MockMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export const claraSuggestions: readonly ClaraSuggestion[] = [
  {
    id: "drug-interactions",
    icon: Pill,
    label: "Check drug interactions",
    prompt: "Check for drug interactions between Metformin 500mg and Lisinopril 10mg",
    category: "Pharmacology",
    accentColor: "bg-error-500",
  },
  {
    id: "differential-diagnosis",
    icon: Stethoscope,
    label: "Differential diagnosis",
    prompt: "Suggest differential diagnoses for a patient with persistent dry cough, fatigue, and weight loss over 3 months",
    category: "Diagnosis",
    accentColor: "bg-primary-700",
  },
  {
    id: "treatment-guidelines",
    icon: ClipboardList,
    label: "Treatment guidelines",
    prompt: "What are the current treatment guidelines for newly diagnosed Type 2 Diabetes in adults?",
    category: "Guidelines",
    accentColor: "bg-secondary-500",
  },
  {
    id: "vitals-interpretation",
    icon: HeartPulse,
    label: "Interpret vitals",
    prompt: "Interpret these vitals: BP 158/94, HR 92, SpO2 96%, Temp 37.8°C, RR 20",
    category: "Assessment",
    accentColor: "bg-warning-500",
  },
  {
    id: "lab-results",
    icon: FileSearch,
    label: "Explain lab results",
    prompt: "Explain these lab results: HbA1c 8.2%, Fasting glucose 186 mg/dL, Creatinine 1.4 mg/dL, eGFR 58",
    category: "Lab Review",
    accentColor: "bg-accent-500",
  },
] as const;

export const mockConversations: Record<string, readonly MockMessage[]> = {
  "drug-interactions": [
    {
      role: "user",
      content: "Check for drug interactions between Metformin 500mg and Lisinopril 10mg",
    },
    {
      role: "assistant",
      content:
        "No clinically significant interactions between Metformin 500mg and Lisinopril 10mg.\n\n**Key considerations:**\n- Both are commonly co-prescribed in diabetic patients with hypertension\n- Lisinopril may slightly improve insulin sensitivity (beneficial)\n- Monitor renal function periodically — both drugs are renally cleared\n- Watch for hypoglycemia if patient is also on sulfonylureas\n\n**Recommendation:** Safe to co-prescribe. Schedule renal function check (BMP) at 3-month follow-up.",
    },
  ],
  "differential-diagnosis": [
    {
      role: "user",
      content: "Suggest differential diagnoses for a patient with persistent dry cough, fatigue, and weight loss over 3 months",
    },
    {
      role: "assistant",
      content:
        "**Top differential diagnoses:**\n\n1. **Lung malignancy** — Weight loss + persistent cough in adults warrants imaging\n2. **Tuberculosis** — Especially if exposure history or immunocompromised\n3. **ACE inhibitor-induced cough** — Check medication list (common culprit)\n4. **GERD** — Can present as chronic dry cough without classic heartburn\n5. **Interstitial lung disease** — Progressive dyspnea may follow\n\n**Recommended workup:**\n- Chest X-ray (PA + lateral)\n- CBC, CMP, ESR/CRP\n- Review current medications\n- Consider CT chest if X-ray inconclusive\n- Sputum AFB if TB risk factors present",
    },
  ],
  "treatment-guidelines": [
    {
      role: "user",
      content: "What are the current treatment guidelines for newly diagnosed Type 2 Diabetes in adults?",
    },
    {
      role: "assistant",
      content:
        "**ADA 2026 Guidelines — Newly Diagnosed T2DM:**\n\n**First-line therapy:**\n- Metformin 500mg BID (titrate to 1000mg BID over 4 weeks)\n- Lifestyle modifications: 150 min/week moderate exercise, medical nutrition therapy\n\n**HbA1c target:** < 7.0% for most adults\n\n**Add-on therapy if HbA1c > 7% after 3 months:**\n- With ASCVD or high risk → GLP-1 RA (semaglutide, liraglutide)\n- With heart failure → SGLT2 inhibitor (empagliflozin, dapagliflozin)\n- With CKD → SGLT2 inhibitor preferred\n- Without comorbidities → GLP-1 RA, SGLT2i, or DPP-4i based on cost/access\n\n**Monitoring:** HbA1c every 3 months until stable, then every 6 months.",
    },
  ],
  "vitals-interpretation": [
    {
      role: "user",
      content: "Interpret these vitals: BP 158/94, HR 92, SpO2 96%, Temp 37.8°C, RR 20",
    },
    {
      role: "assistant",
      content:
        "**Vitals Assessment:**\n\n| Vital | Value | Status |\n|-------|-------|--------|\n| BP | 158/94 mmHg | **Stage 2 Hypertension** |\n| HR | 92 bpm | Mildly elevated (normal: 60-100) |\n| SpO2 | 96% | Normal (acceptable: >94%) |\n| Temp | 37.8°C | **Low-grade fever** |\n| RR | 20 breaths/min | Upper normal |\n\n**Clinical impression:**\n- Hypertensive episode — verify if patient is on antihypertensives and compliant\n- Low-grade fever with mildly elevated HR suggests possible infectious or inflammatory process\n- SpO2 adequate but monitor if respiratory symptoms present\n\n**Recommended actions:**\n- Repeat BP in 5 min (both arms)\n- Assess for infection source\n- Review medication adherence",
    },
  ],
  "lab-results": [
    {
      role: "user",
      content: "Explain these lab results: HbA1c 8.2%, Fasting glucose 186 mg/dL, Creatinine 1.4 mg/dL, eGFR 58",
    },
    {
      role: "assistant",
      content:
        "**Lab Interpretation:**\n\n**HbA1c 8.2%** (target: <7.0%)\n- Indicates poorly controlled diabetes over past 2-3 months\n- Corresponds to estimated average glucose ~189 mg/dL\n\n**Fasting glucose 186 mg/dL** (normal: 70-100)\n- Confirms hyperglycemia consistent with HbA1c\n\n**Creatinine 1.4 mg/dL** (normal: 0.7-1.3)\n- Mildly elevated — suggests early renal impairment\n\n**eGFR 58 mL/min** (normal: >90)\n- **CKD Stage 3a** — moderate decrease in kidney function\n- Likely diabetic nephropathy given context\n\n**Recommendations:**\n- Intensify glycemic control (consider adding SGLT2 inhibitor — renoprotective)\n- Check urine albumin-to-creatinine ratio (UACR)\n- Avoid nephrotoxic agents (NSAIDs, contrast dye)\n- Nephrology referral if eGFR continues declining",
    },
  ],
};
