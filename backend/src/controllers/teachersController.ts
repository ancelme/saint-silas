import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { isValidProfileImage } from '../utils/profileImage';

export async function getTeachers(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(`
      SELECT t.*, u.full_name, u.email, u.avatar_url, u.district, u.sector, u.cell, u.village
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.status != 'Archived'
      ORDER BY u.full_name ASC
    `);

    const [classAssignments, subjectAssignments] = await Promise.all([
      db.query(`SELECT id, name, class_teacher_id FROM classes`),
      db.query(
        `SELECT tsa.teacher_id, tsa.class_id, tsa.subject_id, sub.name AS subject_name
         FROM teacher_subject_assignments tsa
         JOIN subjects sub ON sub.id = tsa.subject_id`,
      ),
    ]);

    const teachers = result.rows.map(row => {
      const assignedClasses = classAssignments.rows.filter(item => item.class_teacher_id === row.id);
      const assignedSubjects = subjectAssignments.rows.filter(item => item.teacher_id === row.id);
      return ({
      id: row.id,
      userId: row.user_id,
      employeeId: row.employee_id,
      teacherType: row.teacher_type || 'subject_teacher',
      name: row.full_name,
      email: row.email,
      phone: row.phone || '+250 788 123 456',
      role: 'teacher',
      specialization: row.specialization || 'Primary Educator',
      assignedGrades: (row.specialization || '').split(',').map((s: string) => s.trim()),
      assignedClassIds: [
        ...assignedClasses.map(item => item.id),
        ...assignedSubjects.map(item => item.class_id),
      ],
      assignedClasses: [
        ...assignedClasses.map(item => item.name),
        ...assignedSubjects.map(item => classAssignments.rows.find(cls => cls.id === item.class_id)?.name).filter(Boolean),
      ],
      assignedSubjects: assignedSubjects.map(item => item.subject_name),
      subjectAssignments: assignedSubjects.map(item => ({ classId: item.class_id, subjectId: item.subject_id })),
      subjects: ['Mathematics', 'Science & Elementary Technology (SET)'],
      avatar: row.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      joinDate: row.join_date || '2024-01-08',
      qualification: row.qualification || 'Diploma in Primary Education (TTC)',
      status: row.status || 'Active',
      address: `${row.village || 'Kibondo'} Village, ${row.cell || 'Simbwa'} Cell`
    });});

    return res.json(teachers);
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch teachers' });
  }
}

export async function getTeacherAssignmentOptions(_req: AuthRequest, res: Response) {
    try {
      const [classes, subjects, teachers] = await Promise.all([
        db.query(`SELECT id, name FROM classes ORDER BY name`),
        db.query(`SELECT id, name FROM subjects ORDER BY name`),
        db.query(
          `SELECT t.id, t.teacher_type, u.full_name
           FROM teachers t JOIN users u ON u.id = t.user_id
           WHERE t.status <> 'Archived' ORDER BY u.full_name`,
        ),
      ]);
      const [classAssignments, subjectAssignments] = await Promise.all([
        db.query(`SELECT id, class_teacher_id FROM classes WHERE class_teacher_id IS NOT NULL`),
        db.query(`SELECT teacher_id, class_id, subject_id FROM teacher_subject_assignments`),
      ]);
      return res.json({
        classes: classes.rows.map(row => ({ id: row.id, name: row.name })),
        subjects: subjects.rows.map(row => ({ id: row.id, name: row.name })),
        teachers: teachers.rows.map(row => ({
          id: row.id,
          fullName: row.full_name,
          teacherType: row.teacher_type,
          classIds: classAssignments.rows.filter(item => item.class_teacher_id === row.id).map(item => item.id),
          subjectAssignments: subjectAssignments.rows
            .filter(item => item.teacher_id === row.id)
            .map(item => ({ classId: item.class_id, subjectId: item.subject_id })),
        })),
      });
    } catch (error: any) {
      console.error('Error loading teacher assignment options:', error);
      return res.status(500).json({ error: error.message || 'Failed to load teacher assignment options' });
    }
  }

  export async function getMyTeacherAssignments(req: AuthRequest, res: Response) {
    try {
      const teacherResult = await db.query(
        `SELECT id, teacher_type FROM teachers WHERE user_id = ? AND status <> 'Archived'`,
        [req.user?.id],
      );
      const teacher = teacherResult.rows[0];
      if (!teacher) return res.status(404).json({ error: 'Teacher account was not found.' });

      const [classAssignments, subjectAssignments] = await Promise.all([
        db.query(
          `SELECT c.id AS class_id, c.name AS class_name
           FROM classes c WHERE c.class_teacher_id = ? ORDER BY c.name`,
          [teacher.id],
        ),
        db.query(
          `SELECT tsa.class_id, c.name AS class_name, tsa.subject_id, sub.name AS subject_name
           FROM teacher_subject_assignments tsa
           JOIN classes c ON c.id = tsa.class_id
           JOIN subjects sub ON sub.id = tsa.subject_id
           WHERE tsa.teacher_id = ? ORDER BY c.name, sub.name`,
          [teacher.id],
        ),
      ]);

      return res.json({
        teacherType: teacher.teacher_type,
        classAssignments: classAssignments.rows.map(row => ({
          classId: row.class_id,
          className: row.class_name,
        })),
        subjectAssignments: subjectAssignments.rows.map(row => ({
          classId: row.class_id,
          className: row.class_name,
          subjectId: row.subject_id,
          subjectName: row.subject_name,
        })),
      });
    } catch (error: any) {
      console.error('Error loading current teacher assignments:', error);
      return res.status(500).json({ error: error.message || 'Failed to load teacher assignments' });
    }
  }

  export async function updateTeacherAssignments(req: AuthRequest, res: Response) {
    const { teacherType, classIds, subjectAssignments } = req.body || {};
    if (!['class_teacher', 'subject_teacher'].includes(teacherType)) {
      return res.status(400).json({ error: 'Choose class teacher or subject teacher.' });
    }
    if (!Array.isArray(classIds) || classIds.some((id: unknown) => typeof id !== 'string') ||
        !Array.isArray(subjectAssignments) ||
        subjectAssignments.some((assignment: any) =>
          !assignment || typeof assignment.classId !== 'string' || typeof assignment.subjectId !== 'string')) {
      return res.status(400).json({ error: 'Teacher class and subject assignments are invalid.' });
    }

    const normalizedClassIds = [...new Set(classIds as string[])];
    const normalizedSubjectAssignments = [
      ...new Map((subjectAssignments as { classId: string; subjectId: string }[])
        .map(item => [`${item.classId}:${item.subjectId}`, item])).values(),
    ];
    if (normalizedClassIds.length > 20 || normalizedSubjectAssignments.length > 100) {
      return res.status(400).json({ error: 'A teacher cannot be assigned to more than 20 classes or 100 subjects.' });
    }
    if (teacherType === 'class_teacher' && (normalizedClassIds.length === 0 || normalizedSubjectAssignments.length > 0)) {
      return res.status(400).json({ error: 'A class teacher must have at least one class and no subject-teacher assignments.' });
    }
    if (teacherType === 'subject_teacher' && (normalizedSubjectAssignments.length === 0 || normalizedClassIds.length > 0)) {
      return res.status(400).json({ error: 'A subject teacher must have at least one class-and-subject assignment.' });
    }

    try {
      const teacherResult = await db.query(`SELECT id FROM teachers WHERE id = ? AND status <> 'Archived'`, [req.params.id]);
      if (!teacherResult.rows.length) return res.status(404).json({ error: 'Active teacher not found.' });

      const teacherId = req.params.id;
      const requestedClassIds = teacherType === 'class_teacher'
        ? normalizedClassIds
        : normalizedSubjectAssignments.map(item => item.classId);
      const classResult = await db.query(
        `SELECT id FROM classes WHERE id IN (${requestedClassIds.map(() => '?').join(', ')})`,
        requestedClassIds,
      );
      if (classResult.rows.length !== new Set(requestedClassIds).size) {
        return res.status(400).json({ error: 'One or more selected classes are unavailable.' });
      }

      if (teacherType === 'class_teacher') {
        const otherTeacherResult = await db.query(
          `SELECT id, name FROM classes
           WHERE id IN (${normalizedClassIds.map(() => '?').join(', ')})
             AND class_teacher_id IS NOT NULL AND class_teacher_id <> ?`,
          [...normalizedClassIds, teacherId],
        );
        if (otherTeacherResult.rows.length) {
          return res.status(409).json({ error: 'A selected class already has a different class teacher.' });
        }
      } else {
        const subjectIds = [...new Set(normalizedSubjectAssignments.map(item => item.subjectId))];
        const subjectResult = await db.query(
          `SELECT id FROM subjects WHERE id IN (${subjectIds.map(() => '?').join(', ')})`,
          subjectIds,
        );
        if (subjectResult.rows.length !== subjectIds.length) {
          return res.status(400).json({ error: 'One or more selected subjects are unavailable.' });
        }
      }

      await db.query(`UPDATE teachers SET teacher_type = ? WHERE id = ?`, [teacherType, teacherId]);
      await db.query(`UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?`, [teacherId]);
      await db.query(`DELETE FROM teacher_subject_assignments WHERE teacher_id = ?`, [teacherId]);

      if (teacherType === 'class_teacher') {
        for (const classId of normalizedClassIds) {
          await db.query(`UPDATE classes SET class_teacher_id = ? WHERE id = ?`, [teacherId, classId]);
        }
      } else {
        for (const assignment of normalizedSubjectAssignments) {
          await db.query(
            `INSERT INTO teacher_subject_assignments (id, teacher_id, class_id, subject_id)
             VALUES (?, ?, ?, ?) ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING`,
            [`tsa-${createHash('sha256').update(`${teacherId}:${assignment.classId}:${assignment.subjectId}`).digest('hex').slice(0, 32)}`, teacherId, assignment.classId, assignment.subjectId],
          );
        }
      }

      await recordAuditLog({
        userId: req.user?.id,
        userName: req.user?.fullName || 'Administrator',
        role: req.user?.role || 'admin',
        action: 'TEACHER_ASSIGNMENTS_UPDATED',
        details: `Assigned teacher ${teacherId} as ${teacherType} to ${requestedClassIds.length} class(es).`,
        ipAddress: req.ip,
      });
      return res.json({ message: 'Teacher role and class assignments saved.' });
    } catch (error: any) {
      console.error('Error updating teacher assignments:', error);
      return res.status(500).json({ error: error.message || 'Failed to update teacher assignments' });
    }
}

export async function createTeacher(req: AuthRequest, res: Response) {
  try {
    const { name, email, phone, specialization, qualification, assignedGrades, password, avatar } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (!isValidProfileImage(avatar)) {
      return res.status(400).json({ error: 'A JPEG, PNG, or WebP profile photo of 5 MB or smaller is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = cleanEmail.split('@')[0];

    // Check if user exists
    const existing = await db.query(`SELECT id FROM users WHERE LOWER(email) = ?`, [cleanEmail]);
    let userId: string;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.query(`UPDATE users SET avatar_url = ? WHERE id = ?`, [avatar, userId]);
    } else {
      userId = `usr-${Date.now()}`;
      const defaultPassword = password || 'StSilas2026!';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await db.query(
        `INSERT INTO users (id, username, email, password_hash, full_name, role, phone, avatar_url, is_active, email_verified)
         VALUES (?, ?, ?, ?, ?, 'teacher', ?, ?, 1, 1)`,
        [userId, cleanUsername, cleanEmail, passwordHash, name.trim(), phone || '', avatar]
      );
    }

    const teacherId = `tch-${Date.now()}`;
    const employeeId = `ST-TCH-${Math.floor(100 + Math.random() * 900)}`;
    const specs = Array.isArray(assignedGrades) ? assignedGrades.join(', ') : (specialization || 'Primary Educator');

    await db.query(
      `INSERT INTO teachers (id, user_id, employee_id, specialization, qualification, phone, join_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        teacherId,
        userId,
        employeeId,
        specs,
        qualification || 'Bachelor of Education (REB Certified)',
        phone || '',
        new Date().toISOString().split('T')[0]
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'TEACHER_CREATE',
      details: `Added new teacher ${name} (${employeeId}) - ${specs}`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Teacher created successfully',
      teacher: {
        id: teacherId,
        employeeId,
        name,
        email: cleanEmail,
        phone,
        avatar,
        specialization: specs,
        qualification: qualification || 'Bachelor of Education (REB Certified)',
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    return res.status(500).json({ error: error.message || 'Failed to create teacher' });
  }
}

export async function updateTeacher(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, phone, specialization, qualification, status, avatar } = req.body;

    const tchRes = await db.query(`SELECT * FROM teachers WHERE id = ?`, [id]);
    if (tchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacher = tchRes.rows[0];

    await db.query(
      `UPDATE teachers
       SET specialization = COALESCE(?, specialization),
           qualification = COALESCE(?, qualification),
           phone = COALESCE(?, phone),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [specialization || null, qualification || null, phone || null, status || null, id]
    );

    if (name || phone || avatar) {
      await db.query(
        `UPDATE users
         SET full_name = COALESCE(?, full_name),
             phone = COALESCE(?, phone),
             avatar_url = COALESCE(?, avatar_url),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name ? name.trim() : null, phone || null, avatar || null, teacher.user_id]
      );
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'TEACHER_UPDATE',
      details: `Updated teacher record ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Teacher updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update teacher' });
  }
}

export async function deleteTeacher(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const tchRes = await db.query(`SELECT * FROM teachers WHERE id = ?`, [id]);
    if (tchRes.rows.length === 0) {
      return res.json({ message: 'Teacher deleted successfully' });
    }

    await db.query(`DELETE FROM teachers WHERE id = ?`, [id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'TEACHER_DELETED',
      details: `Deleted teacher record ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Teacher deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete teacher' });
  }
}
