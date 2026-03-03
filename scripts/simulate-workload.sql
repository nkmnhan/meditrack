-- ============================================================================
-- MediTrack System Workload Simulation
-- Inserts realistic data across audit, Clara sessions, and login activity
-- spanning 18 months to populate dashboards, charts, and audit logs.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PHI Audit Logs — 18 months of activity (meditrack_audit)
-- ────────────────────────────────────────────────────────────────────────────
\c meditrack_audit

-- Clear existing data for a clean simulation
TRUNCATE TABLE "PHIAuditLogs" CASCADE;
TRUNCATE TABLE "ArchivedPHIAuditLogs" CASCADE;
TRUNCATE TABLE "PHIBreachIncidents" CASCADE;

-- Create temp table of patient IDs to reference
CREATE TEMP TABLE tmp_patients (patient_id UUID);
INSERT INTO tmp_patients VALUES
  ('3c809908-310c-4263-8d61-ddcf468a7a1d'),
  ('60a56c53-43c2-4e14-a4bb-22559d7cd4bf'),
  ('2675dc04-d48a-48ad-ae73-661f77fb01ef'),
  ('f9657deb-9bdb-40da-a73c-f2cb5179df65'),
  ('070437e4-f89d-467e-b496-24708d60ee37'),
  ('ee52f53e-996e-4574-9595-72de0a19a885'),
  ('dda0438a-4093-4535-be2e-745428da9183'),
  ('f0512219-c483-479c-877a-645596e56009'),
  ('0d87cbdf-ab0f-421e-9b9f-96032fa1bf69'),
  ('15b371c7-330c-45fe-a4e2-f5ca1c3def1d'),
  ('d4feb582-c542-43ed-9efa-8e560437a5b8'),
  ('f75be25d-8476-4395-a7ec-7a7561546d5a'),
  ('bd4aebac-b790-42ec-9d7b-7c953a573486'),
  ('fd8e1cfb-e727-499b-9e62-d62ea42badd9'),
  ('9a804e22-18b9-405c-a92d-85dcf9b4f2b0'),
  ('faa9be2f-4496-4fb7-a5f4-2115726c9a19'),
  ('9684534d-53a6-4d03-bc69-eb8ad7294350'),
  ('88e70197-1084-42d8-91eb-dba5053437fc'),
  ('d8195e66-bc47-4a6c-8165-4d2faa2fea0f'),
  ('28dccf8c-0da6-48ee-902c-48782126e8d5');

-- Users who perform actions
CREATE TEMP TABLE tmp_users (user_id TEXT, username TEXT, user_role TEXT);
INSERT INTO tmp_users VALUES
  ('94f22653-ddce-43d3-951b-4d903c31de5d', 'Dr. Jane Smith', 'Doctor'),
  ('84fa971d-8e6d-4138-afcb-b572364d2d61', 'System Administrator', 'Admin'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Dr. Robert Chen', 'Doctor'),
  ('aaaaaaaa-0001-0001-0001-000000000002', 'Dr. Emily Watson', 'Doctor'),
  ('aaaaaaaa-0001-0001-0001-000000000003', 'Dr. Michael Park', 'Doctor'),
  ('aaaaaaaa-0001-0001-0001-000000000004', 'Sarah Johnson', 'Receptionist'),
  ('aaaaaaaa-0001-0001-0001-000000000005', 'Maria Garcia', 'Nurse');

-- Actions, resource types, and event types
CREATE TEMP TABLE tmp_actions (action TEXT, event_type TEXT, weight INT);
INSERT INTO tmp_actions VALUES
  ('Read', 'PatientPHIAccessed', 50),
  ('Read', 'MedicalRecordPHIAccessed', 25),
  ('Create', 'PHIModified', 8),
  ('Update', 'PHIModified', 10),
  ('Search', 'PatientPHIAccessed', 5),
  ('Export', 'PHIExported', 1),
  ('Delete', 'PHIDeleted', 1);

CREATE TEMP TABLE tmp_resources (resource_type TEXT);
INSERT INTO tmp_resources VALUES
  ('Patient'), ('MedicalRecord'), ('Appointment'),
  ('Prescription'), ('LabResult'), ('VitalSigns');

-- Generate ~15,000 audit logs over 18 months
-- Recent 12 months go into PHIAuditLogs (hot), older 6 months into ArchivedPHIAuditLogs
DO $$
DECLARE
  rec_count INT := 0;
  target_count INT := 15000;
  ts TIMESTAMPTZ;
  cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '12 months';
  user_rec RECORD;
  patient_rec RECORD;
  action_rec RECORD;
  resource_rec RECORD;
  sev TEXT;
  success_val BOOLEAN;
  ip TEXT;
  err_msg TEXT;
  resource_id TEXT;
BEGIN
  WHILE rec_count < target_count LOOP
    -- Random timestamp over 18 months, weighted toward recent
    ts := NOW() - (random() * random() * 548)::INT * INTERVAL '1 day'
         - (random() * 14)::INT * INTERVAL '1 hour'
         - (random() * 60)::INT * INTERVAL '1 minute';

    -- Pick random user, patient, action, resource
    SELECT * INTO user_rec FROM tmp_users ORDER BY random() LIMIT 1;
    SELECT * INTO patient_rec FROM tmp_patients ORDER BY random() LIMIT 1;
    SELECT * INTO action_rec FROM tmp_actions ORDER BY random() * weight DESC LIMIT 1;
    SELECT * INTO resource_rec FROM tmp_resources ORDER BY random() LIMIT 1;

    -- Severity distribution: 85% Info, 10% Warning, 4% Error, 1% Critical
    sev := CASE
      WHEN random() < 0.85 THEN 'Info'
      WHEN random() < 0.95 THEN 'Warning'
      WHEN random() < 0.99 THEN 'Error'
      ELSE 'Critical'
    END;

    -- 97% success rate
    success_val := random() < 0.97;
    err_msg := CASE WHEN NOT success_val THEN 'Access denied: insufficient permissions' ELSE NULL END;

    -- Random IP addresses
    ip := (120 + (random() * 30)::INT)::TEXT || '.' ||
          (random() * 255)::INT::TEXT || '.' ||
          (random() * 255)::INT::TEXT || '.' ||
          (random() * 255)::INT::TEXT;

    resource_id := substring(gen_random_uuid()::TEXT FROM 1 FOR 8);

    IF ts >= cutoff_date THEN
      -- Hot tier
      INSERT INTO "PHIAuditLogs" (
        "Id", "EventId", "Timestamp", "UserId", "Username", "UserRole",
        "Action", "ResourceType", "ResourceId", "PatientId",
        "IpAddress", "UserAgent", "Success", "ErrorMessage",
        "EventType", "AdditionalContext", "Severity",
        "AlertTriggered", "Reviewed", "ReviewedBy", "ReviewedAt", "ReviewNotes"
      ) VALUES (
        gen_random_uuid(), gen_random_uuid(), ts,
        user_rec.user_id, user_rec.username, user_rec.user_role,
        action_rec.action, resource_rec.resource_type, resource_id,
        patient_rec.patient_id,
        ip, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0',
        success_val, err_msg,
        action_rec.event_type, NULL, sev,
        sev IN ('Error', 'Critical'), FALSE, NULL, NULL, NULL
      );
    ELSE
      -- Archive tier (older records)
      INSERT INTO "ArchivedPHIAuditLogs" (
        "Id", "EventId", "Timestamp", "UserId", "Username", "UserRole",
        "Action", "ResourceType", "ResourceId", "PatientId",
        "IpAddress", "UserAgent", "Success", "ErrorMessage",
        "EventType", "AdditionalContext", "Severity",
        "AlertTriggered", "Reviewed", "ReviewedBy", "ReviewedAt", "ReviewNotes",
        "ArchivedAt"
      ) VALUES (
        gen_random_uuid(), gen_random_uuid(), ts,
        user_rec.user_id, user_rec.username, user_rec.user_role,
        action_rec.action, resource_rec.resource_type, resource_id,
        patient_rec.patient_id,
        ip, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
        success_val, err_msg,
        action_rec.event_type, NULL, sev,
        sev IN ('Error', 'Critical'), TRUE,
        '84fa971d-8e6d-4138-afcb-b572364d2d61',
        ts + INTERVAL '30 days', 'Reviewed during compliance audit',
        ts + INTERVAL '60 days'
      );
    END IF;

    rec_count := rec_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % audit log records', rec_count;
END $$;

-- Insert some breach incidents
INSERT INTO "PHIBreachIncidents" (
  "Id", "EventId", "DetectedAt", "UserId", "Username", "PatientId",
  "Severity", "Description", "PatientsAffected", "RequiresBreachNotification",
  "Status", "AssignedTo", "InvestigationNotes", "Resolution",
  "ResolvedAt", "NotificationSent", "NotificationSentAt"
) VALUES
  (gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '45 days',
   'aaaaaaaa-0001-0001-0001-000000000001', 'Dr. Robert Chen',
   '3c809908-310c-4263-8d61-ddcf468a7a1d',
   'Medium', 'Unusual after-hours access pattern detected for patient records',
   1, FALSE, 'Resolved', '84fa971d-8e6d-4138-afcb-b572364d2d61',
   'Doctor was on-call and needed to review patient history for ER consult.',
   'Confirmed legitimate access during on-call shift.',
   NOW() - INTERVAL '43 days', FALSE, NULL),

  (gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '90 days',
   'aaaaaaaa-0001-0001-0001-000000000004', 'Sarah Johnson',
   '60a56c53-43c2-4e14-a4bb-22559d7cd4bf',
   'High', 'Receptionist accessed medical records outside standard workflow',
   3, FALSE, 'Resolved', '84fa971d-8e6d-4138-afcb-b572364d2d61',
   'Staff accessed records through direct URL instead of standard search flow. Training deficiency identified.',
   'Additional HIPAA training completed. Access workflow updated.',
   NOW() - INTERVAL '85 days', FALSE, NULL),

  (gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '5 days',
   'aaaaaaaa-0001-0001-0001-000000000002', 'Dr. Emily Watson',
   'f9657deb-9bdb-40da-a73c-f2cb5179df65',
   'Low', 'Bulk export of patient lab results detected',
   1, FALSE, 'UnderInvestigation', '84fa971d-8e6d-4138-afcb-b572364d2d61',
   'Investigating whether the export was for a legitimate research purpose.',
   NULL, NULL, FALSE, NULL);

-- Verify counts
SELECT 'PHIAuditLogs (hot)' AS "Table", COUNT(*) AS "Count" FROM "PHIAuditLogs"
UNION ALL
SELECT 'ArchivedPHIAuditLogs', COUNT(*) FROM "ArchivedPHIAuditLogs"
UNION ALL
SELECT 'PHIBreachIncidents', COUNT(*) FROM "PHIBreachIncidents";

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Clara Sessions + Suggestions — 6 months of AI companion usage
-- ────────────────────────────────────────────────────────────────────────────
\c meditrack_clara

TRUNCATE TABLE "suggestions" CASCADE;
TRUNCATE TABLE "transcript_lines" CASCADE;
TRUNCATE TABLE "sessions" CASCADE;

-- Doctor IDs (reuse Identity users + simulated doctors)
CREATE TEMP TABLE tmp_doctors (doctor_id TEXT, doctor_name TEXT);
INSERT INTO tmp_doctors VALUES
  ('94f22653-ddce-43d3-951b-4d903c31de5d', 'Dr. Jane Smith'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Dr. Robert Chen'),
  ('aaaaaaaa-0001-0001-0001-000000000002', 'Dr. Emily Watson'),
  ('aaaaaaaa-0001-0001-0001-000000000003', 'Dr. Michael Park');

CREATE TEMP TABLE tmp_patient_ids (patient_id TEXT);
INSERT INTO tmp_patient_ids VALUES
  ('3c809908-310c-4263-8d61-ddcf468a7a1d'),
  ('60a56c53-43c2-4e14-a4bb-22559d7cd4bf'),
  ('2675dc04-d48a-48ad-ae73-661f77fb01ef'),
  ('f9657deb-9bdb-40da-a73c-f2cb5179df65'),
  ('070437e4-f89d-467e-b496-24708d60ee37'),
  ('ee52f53e-996e-4574-9595-72de0a19a885'),
  ('dda0438a-4093-4535-be2e-745428da9183'),
  ('f0512219-c483-479c-877a-645596e56009'),
  ('0d87cbdf-ab0f-421e-9b9f-96032fa1bf69'),
  ('15b371c7-330c-45fe-a4e2-f5ca1c3def1d');

CREATE TEMP TABLE tmp_session_types (session_type TEXT);
INSERT INTO tmp_session_types VALUES ('Consultation'), ('Follow-up'), ('Review');

CREATE TEMP TABLE tmp_suggestion_types (sug_type TEXT);
INSERT INTO tmp_suggestion_types VALUES
  ('Diagnosis'), ('Treatment'), ('Medication'), ('LabOrder'),
  ('Referral'), ('FollowUp'), ('Documentation');

-- Generate ~2,500 sessions over 6 months with suggestions
DO $$
DECLARE
  session_count INT := 0;
  target_sessions INT := 2500;
  session_id UUID;
  ts TIMESTAMPTZ;
  end_ts TIMESTAMPTZ;
  doctor_rec RECORD;
  patient_rec RECORD;
  session_type_rec RECORD;
  sug_type_rec RECORD;
  sug_count INT;
  status_val TEXT;
  duration_min INT;
BEGIN
  WHILE session_count < target_sessions LOOP
    -- Random timestamp over 6 months, weighted toward recent
    ts := NOW() - (random() * random() * 180)::INT * INTERVAL '1 day'
         - (random() * 10 + 7)::INT * INTERVAL '1 hour'  -- business hours 7am-5pm
         - (random() * 60)::INT * INTERVAL '1 minute';

    -- Skip weekends
    IF EXTRACT(DOW FROM ts) IN (0, 6) THEN
      CONTINUE;
    END IF;

    -- Random duration 5-45 min
    duration_min := 5 + (random() * 40)::INT;
    end_ts := ts + duration_min * INTERVAL '1 minute';

    SELECT * INTO doctor_rec FROM tmp_doctors ORDER BY random() LIMIT 1;
    SELECT * INTO patient_rec FROM tmp_patient_ids ORDER BY random() LIMIT 1;
    SELECT * INTO session_type_rec FROM tmp_session_types ORDER BY random() LIMIT 1;

    -- 90% completed, 5% active, 5% ended without completion
    status_val := CASE
      WHEN random() < 0.90 THEN 'Completed'
      WHEN random() < 0.95 THEN 'Active'
      ELSE 'Ended'
    END;

    session_id := gen_random_uuid();

    INSERT INTO sessions (id, doctor_id, patient_id, started_at, ended_at, status, audio_recorded, session_type)
    VALUES (
      session_id,
      doctor_rec.doctor_id,
      patient_rec.patient_id,
      ts,
      CASE WHEN status_val != 'Active' THEN end_ts ELSE NULL END,
      status_val,
      random() < 0.85,
      session_type_rec.session_type
    );

    -- Each session gets 1-5 suggestions
    sug_count := 1 + (random() * 4)::INT;
    FOR i IN 1..sug_count LOOP
      SELECT * INTO sug_type_rec FROM tmp_suggestion_types ORDER BY random() LIMIT 1;

      INSERT INTO suggestions (id, session_id, content, triggered_at, type, source, urgency, confidence)
      VALUES (
        gen_random_uuid(),
        session_id,
        CASE sug_type_rec.sug_type
          WHEN 'Diagnosis' THEN 'Consider differential diagnosis: ' || (ARRAY['Type 2 Diabetes', 'Hypertension Stage 2', 'Iron deficiency anemia', 'Acute bronchitis', 'Generalized anxiety disorder'])[1 + (random()*4)::INT]
          WHEN 'Treatment' THEN 'Recommended treatment plan: ' || (ARRAY['Start low-dose ACE inhibitor', 'Physical therapy 2x/week', 'Cognitive behavioral therapy referral', 'Inhaled corticosteroid', 'Dietary modification'])[1 + (random()*4)::INT]
          WHEN 'Medication' THEN 'Medication suggestion: ' || (ARRAY['Metformin 500mg BID', 'Lisinopril 10mg QD', 'Sertraline 50mg QD', 'Amoxicillin 500mg TID x10d', 'Omeprazole 20mg QD'])[1 + (random()*4)::INT]
          WHEN 'LabOrder' THEN 'Suggested lab order: ' || (ARRAY['CBC with differential', 'Comprehensive metabolic panel', 'HbA1c', 'Thyroid panel (TSH, Free T4)', 'Lipid panel'])[1 + (random()*4)::INT]
          WHEN 'Referral' THEN 'Consider referral to: ' || (ARRAY['Cardiology', 'Endocrinology', 'Pulmonology', 'Psychiatry', 'Orthopedics'])[1 + (random()*4)::INT]
          WHEN 'FollowUp' THEN 'Follow-up recommended: ' || (ARRAY['2-week follow-up for medication titration', '1-month follow-up for lab results review', '3-month routine check', '6-month wellness visit', 'PRN if symptoms worsen'])[1 + (random()*4)::INT]
          ELSE 'Documentation note: Update problem list with current findings'
        END,
        ts + (random() * duration_min)::INT * INTERVAL '1 minute',
        sug_type_rec.sug_type,
        CASE WHEN random() < 0.7 THEN 'Batched' ELSE 'OnDemand' END,
        CASE
          WHEN random() < 0.1 THEN 'High'
          WHEN random() < 0.4 THEN 'Medium'
          ELSE 'Low'
        END,
        0.5 + random() * 0.5  -- confidence 0.50 - 1.00
      );
    END LOOP;

    session_count := session_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % sessions with suggestions', session_count;
END $$;

-- Verify
SELECT 'Sessions' AS "Table", COUNT(*) AS "Count" FROM sessions
UNION ALL
SELECT 'Suggestions', COUNT(*) FROM suggestions;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Login activity — simulate LastLoginAt for identity users
-- ────────────────────────────────────────────────────────────────────────────
\c meditrack_identity

-- Update LastLoginAt for existing users
UPDATE "AspNetUsers"
SET "LastLoginAt" = NOW() - INTERVAL '2 hours'
WHERE "Email" = 'admin@meditrack.local';

UPDATE "AspNetUsers"
SET "LastLoginAt" = NOW() - INTERVAL '30 minutes'
WHERE "Email" = 'doctor@meditrack.local';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. More appointments for chart data
-- ────────────────────────────────────────────────────────────────────────────
\c meditrack_appointments

-- Check the table structure first
CREATE TEMP TABLE tmp_appt_patients (patient_id UUID, patient_name TEXT, patient_email TEXT);
INSERT INTO tmp_appt_patients VALUES
  ('3c809908-310c-4263-8d61-ddcf468a7a1d', 'Alice Thompson', 'alice.thompson@email.com'),
  ('60a56c53-43c2-4e14-a4bb-22559d7cd4bf', 'Bob Martinez', 'bob.martinez@email.com'),
  ('2675dc04-d48a-48ad-ae73-661f77fb01ef', 'Carol Davis', 'carol.davis@email.com'),
  ('f9657deb-9bdb-40da-a73c-f2cb5179df65', 'David Wilson', 'david.wilson@email.com'),
  ('070437e4-f89d-467e-b496-24708d60ee37', 'Eva Brown', 'eva.brown@email.com'),
  ('ee52f53e-996e-4574-9595-72de0a19a885', 'Frank Lee', 'frank.lee@email.com'),
  ('dda0438a-4093-4535-be2e-745428da9183', 'Grace Kim', 'grace.kim@email.com'),
  ('f0512219-c483-479c-877a-645596e56009', 'Henry Patel', 'henry.patel@email.com');

CREATE TEMP TABLE tmp_providers (provider_id UUID, provider_name TEXT);
INSERT INTO tmp_providers VALUES
  ('94f22653-ddce-43d3-951b-4d903c31de5d', 'Dr. Jane Smith'),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Dr. Robert Chen'),
  ('aaaaaaaa-0001-0001-0001-000000000002', 'Dr. Emily Watson'),
  ('aaaaaaaa-0001-0001-0001-000000000003', 'Dr. Michael Park');

DO $$
DECLARE
  appt_count INT := 0;
  target_appts INT := 800;
  ts TIMESTAMPTZ;
  patient_rec RECORD;
  provider_rec RECORD;
  appt_type TEXT;
  status_val TEXT;
  duration INT;
  reason TEXT;
BEGIN
  WHILE appt_count < target_appts LOOP
    -- Spread over 3 months
    ts := NOW() - (random() * 90)::INT * INTERVAL '1 day'
         + (8 + (random() * 9)::INT) * INTERVAL '1 hour'  -- 8am-5pm
         + (CASE WHEN random() < 0.5 THEN 0 ELSE 30 END) * INTERVAL '1 minute';

    -- Skip weekends
    IF EXTRACT(DOW FROM ts) IN (0, 6) THEN
      CONTINUE;
    END IF;

    SELECT * INTO patient_rec FROM tmp_appt_patients ORDER BY random() LIMIT 1;
    SELECT * INTO provider_rec FROM tmp_providers ORDER BY random() LIMIT 1;

    appt_type := (ARRAY['Consultation', 'FollowUp', 'AnnualPhysical', 'UrgentCare', 'Specialist', 'LabWork', 'Imaging', 'Vaccination', 'Telehealth', 'Procedure'])[1 + (random() * 9)::INT];
    duration := CASE appt_type
      WHEN 'Consultation' THEN 30 WHEN 'FollowUp' THEN 15 WHEN 'AnnualPhysical' THEN 45
      WHEN 'UrgentCare' THEN 30 WHEN 'Specialist' THEN 45 WHEN 'LabWork' THEN 15
      WHEN 'Imaging' THEN 30 WHEN 'Vaccination' THEN 15 WHEN 'Telehealth' THEN 30
      ELSE 60 END;

    -- Status distribution: Completed 50%, Confirmed 15%, Scheduled 15%, Cancelled 10%, NoShow 5%, InProgress 5%
    status_val := CASE
      WHEN random() < 0.50 THEN 'Completed'
      WHEN random() < 0.65 THEN 'Confirmed'
      WHEN random() < 0.80 THEN 'Scheduled'
      WHEN random() < 0.90 THEN 'Cancelled'
      WHEN random() < 0.95 THEN 'NoShow'
      ELSE 'InProgress'
    END;

    reason := (ARRAY[
      'Annual physical examination',
      'Follow-up for hypertension',
      'Persistent headache evaluation',
      'Diabetes management review',
      'Pre-operative assessment',
      'Chest pain evaluation',
      'Medication review',
      'Allergy consultation',
      'Back pain assessment',
      'Mental health check-in'
    ])[1 + (random() * 9)::INT];

    INSERT INTO "Appointments" (
      "Id", "PatientId", "PatientName", "PatientEmail",
      "ProviderId", "ProviderName",
      "ScheduledDateTime", "DurationMinutes", "Type", "Status",
      "Reason", "CreatedAt", "UpdatedAt"
    ) VALUES (
      gen_random_uuid(),
      patient_rec.patient_id, patient_rec.patient_name, patient_rec.patient_email,
      provider_rec.provider_id, provider_rec.provider_name,
      ts, duration, appt_type::TEXT, status_val::TEXT,
      reason, ts - INTERVAL '7 days', ts
    );

    appt_count := appt_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % appointments', appt_count;
END $$;

SELECT 'Appointments' AS "Table", COUNT(*) AS "Count" FROM "Appointments";

-- Done
\echo '=============================='
\echo '  Simulation complete!'
\echo '=============================='
