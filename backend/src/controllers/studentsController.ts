import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { isValidProfileImage } from '../utils/profileImage';

export async function getStudents(req: AuthRequest, res: Response) {
  try {
    const { search, grade, level, status } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT s.*, c.name as class_name, p.full_name as parent_name, p.phone as parent_phone, p.email as parent_email
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based scoping
    if (userRole === 'parent') {
      query += ` AND (p.user_id = ? OR EXISTS (
        SELECT 1 FROM parent_students ps
        JOIN parents linked_parent ON linked_parent.id = ps.parent_id
        WHERE ps.student_id = s.id AND linked_parent.user_id = ?
      ))`;
      params.push(userId, userId);
    } else if (userRole === 'student') {
      // Find student linked to user email or username
      query += ` AND (LOWER(s.first_name) = LOWER(?) OR LOWER(s.admission_number) = LOWER(?))`;
      params.push(req.user?.username || '', req.user?.username || '');
    } else if (userRole === 'teacher') {
      query += ` AND EXISTS (
        SELECT 1
        FROM teachers t
        JOIN classes teacher_class ON teacher_class.class_teacher_id = t.id
        WHERE t.user_id = ? AND teacher_class.id = s.class_id
        UNION
        SELECT 1
        FROM teachers t
        JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.id
        WHERE t.user_id = ? AND tsa.class_id = s.class_id
      )`;
      params.push(userId, userId);
    }

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    } else {
      query += ` AND s.status != 'Archived'`;
    }

    if (grade) {
      query += ` AND s.grade = ?`;
      params.push(grade);
    }

    if (level) {
      query += ` AND s.level = ?`;
      params.push(level);
    }

    if (search) {
      const term = `%${search}%`;
      query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY s.grade ASC, s.last_name ASC`;

    const result = await db.query(query, params);

    // Map to frontend Student model
    const students = result.rows.map(row => ({
      id: row.id,
      classId: row.class_id,
      rollNo: row.admission_number,
      firstName: row.first_name,
      lastName: row.last_name,
      gender: row.gender,
      dob: row.date_of_birth,
      grade: row.grade,
      level: row.level,
      section: row.section || 'Alpha',
      parentName: userRole === 'parent' ? '' : row.parent_name || 'Parent / Guardian',
      parentPhone: userRole === 'parent' ? '' : row.parent_phone || '',
      parentEmail: userRole === 'parent' ? '' : row.parent_email || '',
      address: row.address || 'Kibondo Village, Simbwa Cell',
      status: row.status,
      enrollmentDate: row.enrollment_date,
      feeStatus: row.fee_status,
      photoUrl: row.photo_url || (row.gender === 'F'
        ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'),
      attendanceRate: Number(row.attendance_rate) || 100,
      overallGPA: Number(row.overall_gpa) || 85.0
    }));

    return res.json(students);
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch students' });
  }
}

export async function createStudent(req: AuthRequest, res: Response) {
  try {
    const {
      firstName,
      lastName,
      gender,
      dob,
      grade,
      level,
      section,
      parentName,
      parentPhone,
      parentEmail,
      address,
      photoUrl
    } = req.body;

    if (!firstName || !lastName || !gender || !dob || !grade) {
      return res.status(400).json({ error: 'First name, last name, gender, date of birth, and grade are required' });
    }

    if (!isValidProfileImage(photoUrl, 4 * 1024 * 1024)) {
      return res.status(400).json({ error: 'The pupil photo must be 4 MB or smaller' });
    }

    const studentId = `std-${Date.now()}`;
    const cleanGrade = grade.replace(/\s+/g, '');
    const admissionNo = `SSP-2026-${cleanGrade}-${Math.floor(100 + Math.random() * 900)}`;
    const studentLevel = level || (grade.includes('Nursery') ? 'Nursery' : ['Primary 1', 'Primary 2', 'Primary 3'].includes(grade) ? 'Lower Primary' : 'Upper Primary');

    // Create or find parent
    let parentId: string | null = null;
    if (parentName) {
      parentId = `par-${Date.now()}`;
      await db.query(
        `INSERT INTO parents (id, full_name, phone, email, address) VALUES (?, ?, ?, ?, ?)`,
        [parentId, parentName, parentPhone || '', parentEmail || '', address || '']
      );
    }

    // Find class_id
    const classRes = await db.query(`SELECT id FROM classes WHERE name LIKE ? LIMIT 1`, [`%${grade}%`]);
    const classId = classRes.rows[0]?.id || null;

    await db.query(
      `INSERT INTO students (
        id, admission_number, first_name, last_name, gender, date_of_birth,
        class_id, parent_id, level, grade, section, enrollment_date, status,
        fee_status, address, photo_url, attendance_rate, overall_gpa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Pending', ?, ?, 100.0, 85.0)`,
      [
        studentId,
        admissionNo,
        firstName.trim(),
        lastName.trim(),
        gender,
        dob,
        classId,
        parentId,
        studentLevel,
        grade,
        section || 'Alpha',
        new Date().toISOString().split('T')[0],
        address || 'Kibondo Village, Simbwa Cell',
        photoUrl
      ]
    );

    // Automatically create tuition fee invoice for current term
    const termRes = await db.query(`SELECT id FROM terms WHERE is_current = 1 LIMIT 1`);
    const currentTermId = termRes.rows[0]?.id || 'term-2026-2';
    
    // Fee amount by level
    const tuitionAmount = studentLevel === 'Nursery' ? 45000 : studentLevel === 'Lower Primary' ? 55000 : 65000;
    const feeId = `fee-${Date.now()}`;

    await db.query(
      `INSERT INTO fees (id, student_id, term_id, title, amount_total, amount_paid, balance, status, due_date)
       VALUES (?, ?, ?, ?, ?, 0.0, ?, 'Pending', ?)`,
      [
        feeId,
        studentId,
        currentTermId,
        `Term 2 Tuition & Feeding - ${grade}`,
        tuitionAmount,
        tuitionAmount,
        '2026-06-30'
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      userEmail: req.user?.email,
      role: req.user?.role || 'admin',
      action: 'STUDENT_ENROLL',
      details: `Enrolled new student ${firstName} ${lastName} (${admissionNo}) into ${grade}`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Student enrolled successfully',
      student: {
        id: studentId,
        rollNo: admissionNo,
        firstName,
        lastName,
        gender,
        dob,
        grade,
        level: studentLevel,
        section: section || 'Alpha',
        parentName: parentName || 'Parent / Guardian',
        parentPhone: parentPhone || '',
        parentEmail: parentEmail || '',
        address: address || 'Kibondo Village, Simbwa Cell',
        status: 'Active',
        enrollmentDate: new Date().toISOString().split('T')[0],
        feeStatus: 'Pending',
        photoUrl,
        attendanceRate: 100,
        overallGPA: 85.0
      }
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return res.status(500).json({ error: error.message || 'Failed to create student' });
  }
}

export async function updateStudent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      grade,
      level,
      section,
      parentName,
      parentPhone,
      parentEmail,
      address,
      status,
      feeStatus,
      attendanceRate,
      overallGPA
    } = req.body;

    await db.query(
      `UPDATE students
       SET first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           grade = COALESCE(?, grade),
           level = COALESCE(?, level),
           section = COALESCE(?, section),
           address = COALESCE(?, address),
           status = COALESCE(?, status),
           fee_status = COALESCE(?, fee_status),
           attendance_rate = COALESCE(?, attendance_rate),
           overall_gpa = COALESCE(?, overall_gpa),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        firstName || null,
        lastName || null,
        grade || null,
        level || null,
        section || null,
        address || null,
        status || null,
        feeStatus || null,
        attendanceRate !== undefined ? Number(attendanceRate) : null,
        overallGPA !== undefined ? Number(overallGPA) : null,
        id
      ]
    );

    // Update parent if provided
    if (parentName) {
      const studentRes = await db.query(`SELECT parent_id FROM students WHERE id = ?`, [id]);
      const parentId = studentRes.rows[0]?.parent_id;
      if (parentId) {
        await db.query(
          `UPDATE parents SET full_name = ?, phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE id = ?`,
          [parentName, parentPhone || null, parentEmail || null, parentId]
        );
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'STUDENT_UPDATE',
      details: `Updated details for student ID ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Student updated successfully' });
  } catch (error: any) {
    console.error('Error updating student:', error);
    return res.status(500).json({ error: error.message || 'Failed to update student' });
  }
}

export async function archiveStudent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await db.query(`UPDATE students SET status = 'Archived' WHERE id = ?`, [id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'STUDENT_ARCHIVE',
      details: `Archived student record ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Student archived successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to archive student' });
  }
}
