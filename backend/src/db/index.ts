import fs from 'fs';
import path from 'path';
import net from 'net';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import mysql, { Pool as MysqlPool } from 'mysql2/promise';
import { fileURLToPath } from 'url';

function isPortReachable(host: string, port: number, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

export interface QueryResult<T = any> {
  rows: T[];
  insertId?: number | string;
  affectedRows?: number;
}

class DatabaseManager {
  private mysqlPool: MysqlPool | null = null;
  private sqliteDb: SqlJsDatabase | null = null;
  private engine: 'mysql' | 'sqlite' = 'sqlite';
  private sqliteFilePath = path.resolve(
    process.env.SQLITE_FILE_PATH || path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'data',
      'st_silas.sqlite',
    ),
  );
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Check if MySQL connection parameters exist
    const host = process.env.DATABASE_HOST;
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const database = process.env.DATABASE_NAME || 'st_silas_db';
    const port = Number(process.env.DATABASE_PORT) || 3306;

    if (host && user) {
      const isReachable = await isPortReachable(host, port, 400);
      if (isReachable) {
        try {
          const pool = mysql.createPool({
            host,
            user,
            password,
            database,
            port,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
          });

          // Test connection
          const conn = await pool.getConnection();
          conn.release();
          this.mysqlPool = pool;
          this.engine = 'mysql';
          console.log('✅ [DB] Connected to MySQL database successfully.');
        } catch {
          this.mysqlPool = null;
        }
      }
    }

    if (!this.mysqlPool) {
      // Fallback: pure relational SQL via sql.js with disk persistence
      const SQL = await initSqlJs();
      
      const dataDir = path.dirname(this.sqliteFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.sqliteFilePath)) {
        try {
          const fileBuffer = fs.readFileSync(this.sqliteFilePath);
          this.sqliteDb = new SQL.Database(fileBuffer);
          console.log(`✅ [DB] Loaded existing SQL database from ${this.sqliteFilePath}`);
        } catch (e) {
          console.warn('[DB] Could not parse existing database file, creating fresh database.');
          this.sqliteDb = new SQL.Database();
        }
      } else {
        this.sqliteDb = new SQL.Database();
        console.log('✅ [DB] Created new SQL database.');
      }
      this.engine = 'sqlite';
    }

    // Run migrations and initial seed
    await this.runBootstrapMigrations();
    this.isInitialized = true;
  }

  private saveSqliteToDisk(): void {
    if (this.sqliteDb) {
      try {
        const data = this.sqliteDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.sqliteFilePath, buffer);
      } catch (e) {
        console.error('[DB] Failed to persist SQLite database to disk:', e);
      }
    }
  }

  private async runBootstrapMigrations(): Promise<void> {
    console.log('[DB] Ensuring database tables and system schema...');
    
    // Create tables
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL,
        module VARCHAR(50) NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS role_permissions (
        role_id VARCHAR(36) NOT NULL,
        permission_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (role_id, permission_id)
      );`,
      `CREATE TABLE IF NOT EXISTS users (
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
        status VARCHAR(30) DEFAULT 'Active',
        must_change_password INT DEFAULT 0,
        recovery_email VARCHAR(191),
        recovery_phone VARCHAR(50),
        last_login TIMESTAMP,
        is_online INT DEFAULT 0,
        last_seen_at TIMESTAMP,
        show_last_seen INT DEFAULT 1,
        show_read_receipts INT DEFAULT 1,
        is_active INT DEFAULT 1,
        email_verified INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS school_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS academic_years (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS terms (
        id VARCHAR(36) PRIMARY KEY,
        academic_year_id VARCHAR(36) NOT NULL,
        name VARCHAR(50) NOT NULL,
        term_number INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current INT DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL DEFAULT 'Alpha',
        capacity INT DEFAULT 45,
        class_teacher_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS subjects (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        grade_level VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS teachers (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        specialization VARCHAR(150),
        qualification VARCHAR(100),
        phone VARCHAR(50),
        join_date DATE,
        status VARCHAR(30) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS parents (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) UNIQUE,
        full_name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(191),
        national_id VARCHAR(50),
        occupation VARCHAR(100),
        relationship VARCHAR(50) DEFAULT 'Parent',
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS parent_students (
        parent_id VARCHAR(36) NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (parent_id, student_id)
      );`,
      `CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY,
        admission_number VARCHAR(50) NOT NULL UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        gender VARCHAR(10) NOT NULL,
        date_of_birth DATE NOT NULL,
        class_id VARCHAR(36),
        parent_id VARCHAR(36),
        level VARCHAR(50) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        section VARCHAR(50) DEFAULT 'Alpha',
        enrollment_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'Active',
        fee_status VARCHAR(30) DEFAULT 'Pending',
        address TEXT,
        photo_url TEXT,
        attendance_rate REAL DEFAULT 100.0,
        overall_gpa REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS enrollments (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        class_id VARCHAR(36) NOT NULL,
        academic_year_id VARCHAR(36) NOT NULL,
        status VARCHAR(30) DEFAULT 'Enrolled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        class_id VARCHAR(36) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        remarks VARCHAR(255),
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(36) PRIMARY KEY,
        term_id VARCHAR(36) NOT NULL,
        title VARCHAR(150) NOT NULL,
        exam_type VARCHAR(50) NOT NULL,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS marks (
        id VARCHAR(36) PRIMARY KEY,
        exam_id VARCHAR(36) NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        subject_id VARCHAR(36) NOT NULL,
        score REAL NOT NULL,
        max_score REAL DEFAULT 100.0,
        grade VARCHAR(10),
        remarks VARCHAR(255),
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(36) PRIMARY KEY,
        class_id VARCHAR(36) NOT NULL,
        subject_id VARCHAR(36) NOT NULL,
        teacher_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date DATE,
        max_score INT DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS fees (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        term_id VARCHAR(36) NOT NULL,
        title VARCHAR(150) NOT NULL,
        amount_total REAL NOT NULL,
        amount_paid REAL DEFAULT 0.0,
        balance REAL NOT NULL,
        status VARCHAR(20) DEFAULT 'Pending',
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        fee_id VARCHAR(36) NOT NULL,
        student_id VARCHAR(36) NOT NULL,
        amount REAL NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference_no VARCHAR(100) NOT NULL,
        phone_number VARCHAR(50),
        status VARCHAR(30) DEFAULT 'Completed',
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        receipt_no VARCHAR(100),
        recorded_by VARCHAR(36),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS library_books (
        id VARCHAR(36) PRIMARY KEY,
        isbn VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        author VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        target_level VARCHAR(50) DEFAULT 'All',
        total_copies INT DEFAULT 1,
        available_copies INT DEFAULT 1,
        location VARCHAR(100) DEFAULT 'Main Library Shelf',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS borrowing_records (
        id VARCHAR(36) PRIMARY KEY,
        book_id VARCHAR(36) NOT NULL,
        borrower_id VARCHAR(36),
        borrower_name VARCHAR(150) NOT NULL,
        borrower_type VARCHAR(50) DEFAULT 'Student',
        borrow_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(30) DEFAULT 'Borrowed',
        fine_amount REAL DEFAULT 0.0,
        issued_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(36) PRIMARY KEY,
        author_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(50) DEFAULT 'All',
        category VARCHAR(50) DEFAULT 'Academic',
        is_published INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        recipient_id VARCHAR(36) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS admissions (
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
        photo_url LONGTEXT,
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
      );`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        user_name VARCHAR(150) NOT NULL,
        user_email VARCHAR(191),
        role VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS school_content (
        content_key VARCHAR(50) PRIMARY KEY,
        content_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const q of tableQueries) {
      await this.query(q);
    }

    await this.query(
      `INSERT INTO parent_students (parent_id, student_id)
       SELECT p.id, s.id
       FROM parents p
       JOIN students s ON s.parent_id = p.id
       WHERE p.user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM parent_students ps
           WHERE ps.parent_id = p.id AND ps.student_id = s.id
         )`,
    );

    const userColumns = this.engine === 'mysql'
      ? await this.query<{ name: string }>(
        `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        ['users'],
      )
      : await this.query<{ name: string }>(`PRAGMA table_info(users)`);
    const existingUserColumns = new Set(userColumns.rows.map(({ name }) => name));
    const userColumnMigrations = [
      ['must_change_password', 'INT DEFAULT 0'],
      ['recovery_email', 'VARCHAR(191)'],
      ['recovery_phone', 'VARCHAR(50)'],
      ['status', "VARCHAR(30) DEFAULT 'Active'"],
      ['last_login', 'TIMESTAMP'],
      ['is_online', 'INT DEFAULT 0'],
      ['last_seen_at', 'TIMESTAMP'],
      ['show_last_seen', 'INT DEFAULT 1'],
      ['show_read_receipts', 'INT DEFAULT 1'],
    ] as const;
    for (const [column, definition] of userColumnMigrations) {
      if (!existingUserColumns.has(column)) {
        await this.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
      }
    }

    const admissionColumns = this.engine === 'mysql'
      ? await this.query<{ name: string }>(
        `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        ['admissions'],
      )
      : await this.query<{ name: string }>(`PRAGMA table_info(admissions)`);
    if (!admissionColumns.rows.some(({ name }) => name === 'photo_url')) {
      await this.query(`ALTER TABLE admissions ADD COLUMN photo_url LONGTEXT`);
    }

    const messageColumns = this.engine === 'mysql'
      ? await this.query<{ name: string; data_type?: string; type?: string }>(
        `SELECT COLUMN_NAME AS name, DATA_TYPE AS data_type FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        ['messages'],
      )
      : await this.query<{ name: string; data_type?: string; type?: string }>(`PRAGMA table_info(messages)`);
    const existingMessageColumns = new Set(messageColumns.rows.map(({ name }) => name));
    const messageColumnMigrations = [
      ['delivery_status', "VARCHAR(20) NOT NULL DEFAULT 'sent'"],
      ['delivered_at', 'TIMESTAMP'],
      ['read_at', 'TIMESTAMP'],
      ['deleted_for_sender', 'INT NOT NULL DEFAULT 0'],
      ['deleted_for_recipient', 'INT NOT NULL DEFAULT 0'],
      ['deleted_for_everyone', 'INT NOT NULL DEFAULT 0'],
    ] as const;
    for (const [column, definition] of messageColumnMigrations) {
      if (!existingMessageColumns.has(column)) {
        await this.query(`ALTER TABLE messages ADD COLUMN ${column} ${definition}`);
      }
    }
    if (this.engine === 'mysql' && messageColumns.rows.find(column => column.name === 'body')?.data_type !== 'longtext') {
      await this.query(`ALTER TABLE messages MODIFY COLUMN body LONGTEXT NOT NULL`);
    }

    await this.query(
      `UPDATE messages SET delivery_status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE is_read = 1 AND delivery_status = 'sent'`,
    );
    await this.query(`UPDATE users SET is_online = 0 WHERE is_online <> 0`);

    // Seed the exactly 8 main roles and basic school configuration if empty
    const checkRoles = await this.query(`SELECT COUNT(*) as count FROM roles`);
    const rolesCount = checkRoles.rows[0]?.count || 0;
    if (rolesCount === 0) {
      console.log('[DB] Seeding official 8 system roles, academic calendar, classes, and subjects...');
      const seedStatements = [
        `INSERT OR IGNORE INTO roles (id, name, display_name, description) VALUES
          ('role-owner', 'owner', 'Super Admin / Owner', 'Full sovereign authority over school configuration, records, finances, users and roles'),
          ('role-admin', 'admin', 'Administrator', 'Operational management of students, parents, classes, subjects, attendance, academic records'),
          ('role-head-teacher', 'head_teacher', 'Head Teacher (Umuyobozi w''Ishuri)', 'Academic activities, teacher oversight, student performance, examinations, results'),
          ('role-teacher', 'teacher', 'Teacher (Mwalimu)', 'Daily classroom roll-call, lesson delivery, assignment grading, and pupil evaluations'),
          ('role-accountant', 'accountant', 'Accountant (Bursar)', 'Tuition billing, payment verification (MTN MoMo), receipts, and fiscal reporting'),
          ('role-librarian', 'librarian', 'Librarian (Umubitsi w''Ibitabo)', 'Manage library books, cataloging, borrowing, returns, overdue records, and reports'),
          ('role-parent', 'parent', 'Parent / Guardian (Umubyeyi)', 'Monitors enrolled child progress, attendance notifications, fee statements, and reports'),
          ('role-student', 'student', 'Pupil / Student (Umunyeshuri)', 'Views class timetables, learning materials, assignments, and academic reports');`,
        `INSERT OR IGNORE INTO school_settings (setting_key, setting_value, category, description) VALUES
          ('school_name', 'St. Silas Private Primary School', 'general', 'Official legal name of the primary institution'),
          ('school_code', '530413', 'general', 'Rwanda Basic Education Board (REB) Center Code'),
          ('school_motto', 'Knowledge, Character, and Diligence', 'general', 'School official motto'),
          ('school_motto_rw', 'Ubumenyi, Ubupfura, n''Umurava', 'general', 'School motto in Kinyarwanda'),
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
          ('tuition_upper_primary', '65000', 'finance', 'Termly tuition fee for Upper Primary P4-P6 (RWF)');`,
        `INSERT OR IGNORE INTO academic_years (id, name, start_date, end_date, is_current) VALUES
          ('ay-2026', 'Academic Year 2026', '2026-01-12', '2026-11-20', 1);`,
        `INSERT OR IGNORE INTO terms (id, academic_year_id, name, term_number, start_date, end_date, is_current) VALUES
          ('term-2026-1', 'ay-2026', 'Term 1', 1, '2026-01-12', '2026-04-03', 0),
          ('term-2026-2', 'ay-2026', 'Term 2', 2, '2026-04-20', '2026-07-24', 1),
          ('term-2026-3', 'ay-2026', 'Term 3', 3, '2026-08-31', '2026-11-20', 0);`,
        `INSERT OR IGNORE INTO classes (id, name, grade_level, stream, capacity) VALUES
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
          ('cls-p6-b', 'Primary 6 Beta (PLE Candidate)', 'Upper Primary', 'Beta', 45);`,
        `INSERT OR IGNORE INTO subjects (id, code, name, category, grade_level) VALUES
          ('sub-kiny', 'KIN', 'Ikinyarwanda', 'Core', 'All'),
          ('sub-eng', 'ENG', 'English Language', 'Core', 'All'),
          ('sub-math', 'MAT', 'Mathematics', 'Core', 'All'),
          ('sub-set', 'SET', 'Science and Elementary Technology (SET)', 'Core', 'All'),
          ('sub-srs', 'SRS', 'Social and Religious Studies (SRS)', 'Core', 'Upper Primary'),
          ('sub-fre', 'FRE', 'French Language', 'Core', 'Upper Primary'),
          ('sub-art', 'CPA', 'Creative Arts and Physical Education', 'Practical', 'All'),
          ('sub-itor', 'ITO', 'Itorero ry''Ishuri & Rwandan Culture', 'Cultural', 'All');`,
        `INSERT OR IGNORE INTO library_books (id, isbn, title, author, category, target_level, total_copies, available_copies, location) VALUES
          ('bk-001', '978-99977-01-1', 'Imigani n''Ibisakuzo by''Iwacu', 'REB Publishing', 'Ikinyarwanda Readers', 'All', 25, 25, 'Shelf A1'),
          ('bk-002', '978-99977-02-2', 'Primary Mathematics Mastery P5', 'Dr. J. Habineza', 'Mathematics', 'Upper Primary', 30, 30, 'Shelf B2'),
          ('bk-003', '978-99977-03-3', 'Discovering Science & Elementary Tech', 'Rwanda Education Board', 'Science & SET', 'Upper Primary', 20, 20, 'Shelf C1'),
          ('bk-004', '978-99977-04-4', 'Tales of the Thousand Hills', 'Gatsibo Literary Circle', 'English Literature', 'Lower Primary', 15, 15, 'Shelf A3');`
      ];

      for (const stmt of seedStatements) {
        const queryToRun = this.engine === 'mysql' ? stmt.replace(/INSERT OR IGNORE/g, 'INSERT IGNORE') : stmt;
        await this.query(queryToRun);
      }
    }
    console.log('✅ [DB] System bootstrap completed successfully.');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (this.engine === 'mysql' && this.mysqlPool) {
      const [result] = await this.mysqlPool.query(sql, params);
      if (Array.isArray(result)) {
        return { rows: result as T[] };
      }
      const header = result as mysql.ResultSetHeader;
      return {
        rows: [],
        insertId: header.insertId,
        affectedRows: header.affectedRows,
      };
    } else if (this.sqliteDb) {
      try {
        const trimmed = sql.trim();
        const isSelect = trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA');
        
        if (isSelect) {
          const stmt = this.sqliteDb.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          const rows: T[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject() as T);
          }
          stmt.free();
          return { rows };
        } else {
          // Execute mutation
          this.sqliteDb.run(sql, params);
          this.saveSqliteToDisk();
          return { rows: [], affectedRows: 1 };
        }
      } catch (err: any) {
        console.error(`[DB Error] query failed: "${sql}" with params ${JSON.stringify(params)}:`, err);
        throw err;
      }
    }

    throw new Error('Database not initialized');
  }

  getDatabaseEngine(): { engine: 'mysql' | 'sqlite'; isConnected: boolean } {
    return {
      engine: this.engine,
      isConnected: this.isInitialized,
    };
  }

  async checkIsOwnerConfigured(): Promise<boolean> {
    const res = await this.query(`SELECT COUNT(*) as count FROM users WHERE role IN ('owner', 'super_admin')`);
    return Number(res.rows[0]?.count || 0) > 0;
  }

  async generateSqlBackup(): Promise<string> {
    const dumpLines: string[] = [
      `-- =============================================================`,
      `-- ST. SILAS PRIVATE PRIMARY SCHOOL - OFFICIAL MYSQL BACKUP DUMP`,
      `-- Exported on: ${new Date().toISOString()}`,
      `-- =============================================================`,
      `SET FOREIGN_KEY_CHECKS = 0;`,
    ];

    const tables = [
      'school_settings', 'roles', 'permissions', 'academic_years', 'terms',
      'classes', 'subjects', 'users', 'teachers', 'parents', 'students',
      'parent_students', 'enrollments', 'attendance', 'exams', 'marks', 'assignments', 'fees',
      'payments', 'expenses', 'library_books', 'borrowing_records',
      'announcements', 'messages', 'admissions', 'audit_logs', 'notifications'
    ];

    for (const table of tables) {
      try {
        const res = await this.query(`SELECT * FROM ${table}`);
        if (res.rows.length > 0) {
          dumpLines.push(`\n-- Data for table: ${table} (${res.rows.length} rows)`);
          for (const row of res.rows) {
            const columns = Object.keys(row).map(c => `\`${c}\``).join(', ');
            const values = Object.values(row).map(val => {
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(', ');
            dumpLines.push(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});`);
          }
        }
      } catch (e) {
        // Table may not have records
      }
    }

    dumpLines.push(`\nSET FOREIGN_KEY_CHECKS = 1;`);
    return dumpLines.join('\n');
  }
}

export const db = new DatabaseManager();
