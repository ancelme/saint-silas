import { Response } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getAttendance(req: AuthRequest, res: Response) {
  try {
    const { date, classId, subjectId } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.grade, s.admission_number, p.user_id as parent_user_id
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userRole === 'parent') {
      query += ` AND (p.user_id = ? OR EXISTS (
        SELECT 1 FROM parent_students ps
        JOIN parents linked_parent ON linked_parent.id = ps.parent_id
        WHERE ps.student_id = s.id AND linked_parent.user_id = ?
      ))`;
      params.push(userId, userId);
    } else if (userRole === 'student') {
      query += ` AND (LOWER(s.first_name) = LOWER(?) OR LOWER(s.admission_number) = LOWER(?))`;
      params.push(req.user?.username || '', req.user?.username || '');
    } else if (userRole === 'teacher') {
      if (req.user?.teacherType === 'class_teacher') {
        query += ` AND a.subject_id IS NULL AND EXISTS (
          SELECT 1 FROM classes c JOIN teachers t ON t.id = c.class_teacher_id
          WHERE c.id = s.class_id AND t.user_id = ?
        )`;
        params.push(userId);
      } else {
        query += ` AND a.subject_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM teachers t
          JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.id
          WHERE t.user_id = ? AND tsa.class_id = s.class_id
            AND tsa.subject_id = a.subject_id
        )`;
        params.push(userId);
      }
    }

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }

    if (classId) {
      query += ` AND a.class_id = ?`;
      params.push(classId);
    }

    if (subjectId) {
      query += ` AND a.subject_id = ?`;
      params.push(subjectId);
    }

    query += ` ORDER BY a.date DESC, s.last_name ASC`;

    const result = await db.query(query, params);

    const records = result.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      grade: row.grade,
      date: row.date,
      status: row.status,
      subjectId: row.subject_id || undefined,
      remarks: row.remarks || undefined
    }));

    return res.json(records);
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch attendance' });
  }
}

export async function saveAttendance(req: AuthRequest, res: Response) {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Array of attendance records is required' });
    }
    const savedRecords: { id: string; studentId: string; date: string; subjectId?: string }[] = [];

    for (const item of records) {
      const { studentId, date, status, remarks, subjectId } = item;
      if (
        typeof studentId !== 'string' ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        (subjectId !== undefined && (typeof subjectId !== 'string' || !subjectId.trim())) ||
        (remarks !== undefined && (typeof remarks !== 'string' || remarks.length > 255)) ||
        !['Present', 'Absent', 'Late', 'Excused'].includes(status)
      ) {
        return res.status(400).json({ error: 'Attendance entries require a valid pupil, date, and status.' });
      }
      const classRes = await db.query(`SELECT class_id FROM students WHERE id = ? AND status <> 'Archived'`, [studentId]);
      const classId = classRes.rows[0]?.class_id;
      if (!classId) return res.status(404).json({ error: `Active pupil ${studentId} was not found.` });
      if (req.user?.role === 'teacher') {
        if (req.user.teacherType === 'class_teacher') {
          if (subjectId) {
            return res.status(403).json({ error: 'Class teachers can record class-wide attendance only.' });
          }
          const authorizedClass = await db.query(
            `SELECT id FROM classes c JOIN teachers t ON t.id = c.class_teacher_id
             WHERE c.id = ? AND t.user_id = ?`,
            [classId, req.user.id],
          );
          if (!authorizedClass.rows.length) {
            return res.status(403).json({ error: 'You can record attendance only for your assigned class.' });
          }
        } else {
          if (typeof subjectId !== 'string') {
            return res.status(400).json({ error: 'Select an assigned subject to record subject attendance.' });
          }
          const authorizedSubject = await db.query(
            `SELECT tsa.subject_id FROM teacher_subject_assignments tsa
             JOIN teachers t ON t.id = tsa.teacher_id
             WHERE t.user_id = ? AND tsa.class_id = ? AND tsa.subject_id = ?`,
            [req.user.id, classId, subjectId],
          );
          if (!authorizedSubject.rows.length) {
            return res.status(403).json({ error: 'You can record attendance only for your assigned class and subject.' });
          }
        }

      } else if (subjectId) {
        const subjectAssignment = await db.query(
          `SELECT id FROM teacher_subject_assignments WHERE class_id = ? AND subject_id = ?`,
          [classId, subjectId],
        );
        if (!subjectAssignment.rows.length) {
          return res.status(400).json({ error: "The selected subject is not assigned to this pupil's class." });
        }
      }
      const identity = `${studentId}:${date}:${subjectId || 'class'}`;
      const recordId = `att-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`;
      const conflictTarget = subjectId
        ? `(student_id, date, subject_id) WHERE subject_id IS NOT NULL`
        : `(student_id, date) WHERE subject_id IS NULL`;
      await db.query(
        `INSERT INTO attendance (id, student_id, class_id, subject_id, date, status, remarks, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT ${conflictTarget} DO UPDATE SET
           class_id = EXCLUDED.class_id,
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           recorded_by = EXCLUDED.recorded_by`,
        [recordId, studentId, classId, subjectId || null, date, status, remarks || '', req.user?.id || 'sys']
      );
      savedRecords.push({ id: recordId, studentId, date, subjectId: subjectId || undefined });

      // Recalculate attendance rate for student
      if (!subjectId) {
        const stats = await db.query(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
           FROM attendance WHERE student_id = ? AND subject_id IS NULL`,
          [studentId]
        );
        const totalDays = Number(stats.rows[0]?.total || 1);
        const presentDays = Number(stats.rows[0]?.present || 0);
        const rate = Math.round((presentDays / totalDays) * 100);

        await db.query(`UPDATE students SET attendance_rate = ? WHERE id = ?`, [rate, studentId]);
      }
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Educator',
      role: req.user?.role || 'teacher',
      action: 'ATTENDANCE_RECORD',
      details: `Submitted roll-call attendance for ${records.length} pupils on ${records[0]?.date}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Attendance records saved successfully', records: savedRecords });
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: error.message || 'Failed to save attendance' });
  }
}

export async function deleteAttendance(req: AuthRequest, res: Response) {
  try {
    const attendanceResult = await db.query(
      `SELECT student_id, class_id, subject_id FROM attendance WHERE id = ?`,
      [req.params.id],
    );
    const record = attendanceResult.rows[0];
    if (!record) return res.status(404).json({ error: 'Attendance record not found.' });

    if (req.user?.role === 'teacher') {
      const assignment = record.subject_id
        ? await db.query(
          `SELECT tsa.teacher_id FROM teacher_subject_assignments tsa
           JOIN teachers t ON t.id = tsa.teacher_id
           WHERE t.user_id = ? AND tsa.class_id = ? AND tsa.subject_id = ?`,
          [req.user.id, record.class_id, record.subject_id],
        )
        : await db.query(
          `SELECT c.id FROM classes c JOIN teachers t ON t.id = c.class_teacher_id
           WHERE t.user_id = ? AND c.id = ?`,
          [req.user.id, record.class_id],
        );
      if (!assignment.rows.length ||
          (record.subject_id && req.user.teacherType !== 'subject_teacher') ||
          (!record.subject_id && req.user.teacherType !== 'class_teacher')) {
        return res.status(403).json({ error: 'You can delete attendance only within your assigned class and subject.' });
      }
    }

    await db.query(`DELETE FROM attendance WHERE id = ?`, [req.params.id]);
    if (!record.subject_id) {
      const stats = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present
         FROM attendance WHERE student_id = ? AND subject_id IS NULL`,
        [record.student_id],
      );
      const totalDays = Number(stats.rows[0]?.total || 1);
      const presentDays = Number(stats.rows[0]?.present || 0);
      await db.query(
        `UPDATE students SET attendance_rate = ? WHERE id = ?`,
        [Math.round((presentDays / totalDays) * 100), record.student_id],
      );
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Educator',
      role: req.user?.role || 'teacher',
      action: 'ATTENDANCE_DELETE',
      details: `Deleted attendance record ${req.params.id} for pupil ${record.student_id}`,
      ipAddress: req.ip,
    });
    return res.json({ message: 'Attendance record deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting attendance:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete attendance record' });
  }
}
