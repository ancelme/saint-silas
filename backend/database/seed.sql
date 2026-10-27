-- ===================================================================
-- ST. SILAS PRIVATE PRIMARY SCHOOL (EAR KIBONDO)
-- PRODUCTION SEED DATA (SYSTEM CONFIGURATION ONLY)
-- No fake students, no fake grades, no fake payments
-- ===================================================================

-- 1. Roles
INSERT INTO roles (id, name, display_name, description) VALUES
('role-owner', 'owner', 'Super Admin / School Owner', 'Full sovereign authority over institutional settings, accounts, academic records, and finances'),
('role-admin', 'admin', 'School Administrator', 'Operational management of students, faculty, scheduling, and official records'),
('role-head-teacher', 'head_teacher', 'Head Teacher (Umuyobozi w''Ishuri)', 'Academic governance, teacher oversight, pupil admissions, and national exam readiness'),
('role-teacher', 'teacher', 'Primary Educator (Mwalimu)', 'Daily classroom roll-call, lesson delivery, assignment grading, and pupil evaluations'),
('role-accountant', 'accountant', 'School Bursar / Accountant', 'Tuition billing, payment verification (MTN MoMo), receipts, and fiscal reporting'),
('role-parent', 'parent', 'Parent / Guardian (Umubyeyi)', 'Monitors enrolled child progress, attendance notifications, fee statements, and reports'),
('role-student', 'student', 'Pupil (Umunyeshuri)', 'Views class timetables, learning materials, assignments, and academic reports')
ON CONFLICT DO NOTHING;

-- 2. Core Permissions
INSERT INTO permissions (id, code, description, module) VALUES
('perm-all', '*', 'Super administrator sovereign permission', 'system'),
('perm-students-view', 'students:view', 'View student roster and details', 'students'),
('perm-students-manage', 'students:manage', 'Enroll, edit, and archive students', 'students'),
('perm-teachers-manage', 'teachers:manage', 'Manage faculty staff and assignments', 'teachers'),
('perm-attendance-record', 'attendance:record', 'Take classroom roll-call attendance', 'attendance'),
('perm-grades-record', 'grades:record', 'Submit exam scores and terminal marks', 'grades'),
('perm-fees-manage', 'fees:manage', 'Issue invoices, record payments, and audit ledger', 'finance'),
('perm-admissions-review', 'admissions:review', 'Review and approve new pupil applications', 'admissions'),
('perm-announcements-post', 'announcements:post', 'Publish school circulars and announcements', 'announcements'),
('perm-audit-view', 'audit:view', 'Inspect security audit logs', 'audit')
ON CONFLICT DO NOTHING;

-- 3. School Institutional Settings
INSERT INTO school_settings (setting_key, setting_value, category, description) VALUES
('school_name', 'St. Silas Private Primary School', 'general', 'Official legal name of the primary institution'),
('school_code', '530413', 'general', 'Rwanda Basic Education Board (REB) Center Code'),
('school_motto', 'Knowledge, Character, and Diligence', 'general', 'School official motto'),
('school_motto_rw', 'Ubumenyi, Ubupfura, n\'Umurava', 'general', 'School motto in Kinyarwanda'),
('district', 'Gatsibo', 'location', 'District location'),
('sector', 'Kabarore', 'location', 'Sector location'),
('cell', 'Simbwa', 'location', 'Cell location'),
('village', 'Kibondo', 'location', 'Village location'),
('phone_primary', '+250 788 765 432', 'contact', 'Primary administration telephone'),
('phone_secondary', '+250 783 221 190', 'contact', 'Head Teacher direct telephone'),
('email_official', 'admissions@st-silas.rw', 'contact', 'Official administrative contact email'),
('momo_pay_code', '*182*8*1*530413#', 'finance', 'MTN Mobile Money Merchant Dial Code'),
('tuition_nursery', '45000', 'finance', 'Termly tuition fee for Nursery (RWF)'),
('tuition_lower_primary', '55000', 'finance', 'Termly tuition fee for Lower Primary P1-P3 (RWF)'),
('tuition_upper_primary', '65000', 'finance', 'Termly tuition fee for Upper Primary P4-P6 (RWF)'),
('feeding_program_included', 'true', 'general', 'Hot balanced lunch and fresh milk porridge included in fee')
ON CONFLICT DO NOTHING;

-- 4. Current Academic Year
INSERT INTO academic_years (id, name, start_date, end_date, is_current) VALUES
('ay-2026', 'Academic Year 2026', '2026-01-12', '2026-11-20', 1)
ON CONFLICT DO NOTHING;

-- 5. Terms
INSERT INTO terms (id, academic_year_id, name, term_number, start_date, end_date, is_current) VALUES
('term-2026-1', 'ay-2026', 'Term 1', 1, '2026-01-12', '2026-04-03', 0),
('term-2026-2', 'ay-2026', 'Term 2', 2, '2026-04-20', '2026-07-24', 1),
('term-2026-3', 'ay-2026', 'Term 3', 3, '2026-08-31', '2026-11-20', 0)
ON CONFLICT DO NOTHING;

-- 6. Classes (Nursery to P6 Streams)
INSERT INTO classes (id, name, grade_level, stream, capacity) VALUES
('cls-n1', 'Baby Class (Nursery 1)', 'Nursery', 'Alpha', 35),
('cls-n2', 'Middle Class (Nursery 2)', 'Nursery', 'Alpha', 35),
('cls-n3', 'Top Class (Nursery 3)', 'Nursery', 'Alpha', 40),
('cls-p1-a', 'Primary 1 Alpha', 'Lower Primary', 'Alpha', 45),
('cls-p1-b', 'Primary 1 Beta', 'Lower Primary', 'Beta', 45),
('cls-p2-a', 'Primary 2 Alpha', 'Lower Primary', 'Alpha', 45),
('cls-p2-b', 'Primary 2 Beta', 'Lower Primary', 'Beta', 45),
('cls-p3-a', 'Primary 3 Alpha', 'Lower Primary', 'Alpha', 45),
('cls-p3-b', 'Primary 3 Beta', 'Lower Primary', 'Beta', 45),
('cls-p4-a', 'Primary 4 Alpha', 'Upper Primary', 'Alpha', 45),
('cls-p4-b', 'Primary 4 Beta', 'Upper Primary', 'Beta', 45),
('cls-p5-a', 'Primary 5 Alpha', 'Upper Primary', 'Alpha', 45),
('cls-p5-b', 'Primary 5 Beta', 'Upper Primary', 'Beta', 45),
('cls-p6-a', 'Primary 6 Alpha (PLE Candidate)', 'Upper Primary', 'Alpha', 45),
('cls-p6-b', 'Primary 6 Beta (PLE Candidate)', 'Upper Primary', 'Beta', 45)
ON CONFLICT DO NOTHING;

-- 7. REB Competence-Based Curriculum (CBC) Subjects
INSERT INTO subjects (id, code, name, category, grade_level) VALUES
('sub-kiny', 'KIN', 'Ikinyarwanda', 'Core', 'All'),
('sub-eng', 'ENG', 'English Language', 'Core', 'All'),
('sub-math', 'MAT', 'Mathematics', 'Core', 'All'),
('sub-set', 'SET', 'Science and Elementary Technology (SET)', 'Core', 'All'),
('sub-srs', 'SRS', 'Social and Religious Studies (SRS)', 'Core', 'Upper Primary'),
('sub-fre', 'FRE', 'French Language', 'Core', 'Upper Primary'),
('sub-art', 'CPA', 'Creative Arts and Physical Education', 'Practical', 'All'),
('sub-itor', 'ITO', 'Itorero ry''Ishuri & Rwandan Culture', 'Cultural', 'All')
ON CONFLICT DO NOTHING;
