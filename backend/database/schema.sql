-- ===================================================================
-- ST. SILAS PRIVATE PRIMARY SCHOOL (EAR KIBONDO)
-- PRODUCTION DATABASE SCHEMA (POSTGRESQL COMPATIBLE)
-- REB Center Code: 530413 | Gatsibo District, Eastern Province, Rwanda
-- ===================================================================

-- 1. Roles Table (Exactly 8 Main Roles)
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  module VARCHAR(50) NOT NULL
);

-- 3. Role Permissions Join Table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 4. Users Table (With Forced Password Change & Recovery Fields)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  district VARCHAR(100) DEFAULT 'Gatsibo',
  sector VARCHAR(100) DEFAULT 'Kabarore',
  cell VARCHAR(100) DEFAULT 'Simbwa',
  village VARCHAR(100) DEFAULT 'Kibondo',
  avatar_url TEXT,
  status VARCHAR(30) DEFAULT 'Active', -- 'Active', 'Inactive', 'PENDING_FIRST_LOGIN'
  must_change_password SMALLINT DEFAULT 0,
  recovery_email VARCHAR(191),
  recovery_phone VARCHAR(50),
  last_login TIMESTAMP NULL,
  is_active SMALLINT DEFAULT 1,
  email_verified SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. School Settings Table
CREATE TABLE IF NOT EXISTS school_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Terms
CREATE TABLE IF NOT EXISTS terms (
  id VARCHAR(36) PRIMARY KEY,
  academic_year_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  term_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current SMALLINT DEFAULT 0,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 8. Classes & Streams
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade_level VARCHAR(50) NOT NULL, -- Nursery, Lower Primary, Upper Primary
  stream VARCHAR(50) NOT NULL DEFAULT 'Alpha',
  capacity INT DEFAULT 45,
  class_teacher_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- Core, Elective, Co-curricular
  grade_level VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Teachers (Faculty Profile)
CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  specialization VARCHAR(150),
  qualification VARCHAR(100),
  phone VARCHAR(50),
  join_date DATE,
  status VARCHAR(30) DEFAULT 'Active',
  teacher_type VARCHAR(30) NOT NULL DEFAULT 'subject_teacher',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  UNIQUE (teacher_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS student_reports (
  id VARCHAR(100) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  period VARCHAR(50) NOT NULL,
  report_json TEXT NOT NULL,
  teacher_id VARCHAR(36) NOT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Parents (Guardian Profile)
CREATE TABLE IF NOT EXISTS parents (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(191),
  national_id VARCHAR(50),
  occupation VARCHAR(100),
  relationship VARCHAR(50) DEFAULT 'Parent',
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Students Table
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) UNIQUE,
  admission_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  date_of_birth DATE NOT NULL,
  class_id VARCHAR(36),
  parent_id VARCHAR(36),
  level VARCHAR(50) NOT NULL, -- Nursery, Lower Primary, Upper Primary
  grade VARCHAR(50) NOT NULL,
  section VARCHAR(50) DEFAULT 'Alpha',
  enrollment_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'Active',
  fee_status VARCHAR(20) DEFAULT 'Pending',
  address TEXT,
  photo_url TEXT,
  attendance_rate DECIMAL(5,2) DEFAULT 100.00,
  overall_gpa DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL
);

-- 13. Enrollments History
CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  academic_year_id VARCHAR(36) NOT NULL,
  status VARCHAR(30) DEFAULT 'Enrolled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 14. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  remarks VARCHAR(255),
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_class_attendance_per_day
  ON attendance (student_id, date) WHERE subject_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_subject_attendance_per_day
  ON attendance (student_id, date, subject_id) WHERE subject_id IS NOT NULL;

-- 15. Exams
CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(36) PRIMARY KEY,
  term_id VARCHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  exam_type VARCHAR(50) NOT NULL, -- Mid-Term, End of Term, Mock PLE
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- 16. Marks & Results
CREATE TABLE IF NOT EXISTS marks (
  id VARCHAR(36) PRIMARY KEY,
  exam_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) DEFAULT 100.00,
  grade VARCHAR(10),
  remarks VARCHAR(255),
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 17. Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(36) PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  subject_id VARCHAR(36) NOT NULL,
  teacher_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  max_score INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- 18. Fees & Invoices
CREATE TABLE IF NOT EXISTS fees (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  term_id VARCHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  amount_total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  balance DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- 19. Payments
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  fee_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- MTN Mobile Money, Airtel Money, Bank Transfer, Cash
  reference_no VARCHAR(100) NOT NULL,
  phone_number VARCHAR(50),
  status VARCHAR(30) DEFAULT 'Completed',
  recorded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 20. Expenses (Managed by Accountant / Owner)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL, -- Feeding Program, Facilities, Teaching Materials, Utilities, Administrative
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  receipt_no VARCHAR(100),
  recorded_by VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Library Books (Managed by Librarian / Owner)
CREATE TABLE IF NOT EXISTS library_books (
  id VARCHAR(36) PRIMARY KEY,
  isbn VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  author VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL, -- Kinyarwanda Readers, Mathematics, Science & SET, English Literature, Social Studies
  target_level VARCHAR(50) DEFAULT 'All', -- Nursery, Lower Primary, Upper Primary, All
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  location VARCHAR(100) DEFAULT 'Main Library Shelf',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Library Borrowing Records (Checkout & Return)
CREATE TABLE IF NOT EXISTS borrowing_records (
  id VARCHAR(36) PRIMARY KEY,
  book_id VARCHAR(36) NOT NULL,
  borrower_id VARCHAR(36),
  borrower_name VARCHAR(150) NOT NULL,
  borrower_type VARCHAR(50) DEFAULT 'Student', -- Student, Teacher, Staff
  borrow_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  status VARCHAR(30) DEFAULT 'Borrowed', -- Borrowed, Returned, Overdue
  fine_amount DECIMAL(10,2) DEFAULT 0.00,
  issued_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE
);

-- 23. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) PRIMARY KEY,
  author_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  target_audience VARCHAR(50) DEFAULT 'All', -- All, Parents, Teachers, Students
  category VARCHAR(50) DEFAULT 'Academic',
  is_published SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  is_read SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. Admissions Applications
CREATE TABLE IF NOT EXISTS admissions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  applicant_name VARCHAR(150) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  dob DATE NOT NULL,
  applying_grade VARCHAR(50) NOT NULL,
  level VARCHAR(50) NOT NULL,
  parent_name VARCHAR(150) NOT NULL,
  parent_phone VARCHAR(50) NOT NULL,
  parent_email VARCHAR(191),
  district VARCHAR(100) DEFAULT 'Gatsibo',
  sector VARCHAR(100) DEFAULT 'Kabarore',
  cell VARCHAR(100) DEFAULT 'Simbwa',
  village VARCHAR(100) DEFAULT 'Kibondo',
  previous_school VARCHAR(200),
  status VARCHAR(30) DEFAULT 'Pending',
  assigned_stream VARCHAR(50),
  admin_response TEXT,
  admin_response_date DATE,
  admin_responder VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 26. Audit Logs (Security Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  user_name VARCHAR(150) NOT NULL,
  user_email VARCHAR(191),
  role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_fees_status ON fees(status);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_library_isbn ON library_books(isbn);
CREATE INDEX idx_borrowing_status ON borrowing_records(status);
