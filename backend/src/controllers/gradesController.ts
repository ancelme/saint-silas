import { Response } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getGrades(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT m.*, s.first_name, s.last_name, s.grade as student_grade, sub.name as subject_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
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
      query += ` AND EXISTS (
        SELECT 1 FROM teachers t
        WHERE t.user_id = ? AND (
          (t.teacher_type = 'class_teacher' AND EXISTS (
            SELECT 1 FROM classes c WHERE c.id = s.class_id AND c.class_teacher_id = t.id
          ))
          OR EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = t.id AND tsa.class_id = s.class_id AND tsa.subject_id = m.subject_id
          )
        )
      )`;
      params.push(userId);
    }

    query += ` ORDER BY s.last_name ASC, sub.name ASC`;

    const result = await db.query(query, params);

    const grades = result.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      subject: row.subject_name,
      term: 'Term 2',
      academicYear: '2026',
      marks: Number(row.score),
      grade: row.grade,
      remarks: row.remarks || 'Satisfactory'
    }));

    return res.json(grades);
  } catch (error: any) {
    console.error('Error fetching grades:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch grades' });
  }
}

export async function updateGrade(req: AuthRequest, res: Response) {
  try {
    const { studentId, subject, marks, remarks } = req.body;

    if (!studentId || !subject || marks === undefined) {
      return res.status(400).json({ error: 'Student ID, subject, and marks are required' });
    }
    if (req.user?.role === 'teacher' && req.user.teacherType !== 'subject_teacher') {
      return res.status(403).json({ error: 'Only subject teachers can record subject marks.' });
    }

    const numMarks = Number(marks);
    if (!Number.isFinite(numMarks) || numMarks < 0 || numMarks > 100) {
      return res.status(400).json({ error: 'Marks must be a number between 0 and 100.' });
    }
    let letterGrade = 'F';
    if (numMarks >= 85) letterGrade = 'A';
    else if (numMarks >= 70) letterGrade = 'B';
    else if (numMarks >= 60) letterGrade = 'C';
    else if (numMarks >= 50) letterGrade = 'D';

    // Find or create subject
    let subRes = await db.query(`SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) LIMIT 1`, [subject.trim()]);
    let subjectId = subRes.rows[0]?.id;
    if (!subjectId) {
      if (req.user?.role === 'teacher') {
        return res.status(403).json({ error: 'Marks can only be recorded for your assigned subjects.' });
      }
      subRes = await db.query(`SELECT id FROM subjects WHERE name LIKE ? LIMIT 1`, [`%${subject}%`]);
      subjectId = subRes.rows[0]?.id;
    }
    if (!subjectId) {
      subjectId = `sub-${Date.now()}`;
      await db.query(`INSERT INTO subjects (id, code, name, category, grade_level) VALUES (?, ?, ?, 'Core', 'All')`,
        [subjectId, subject.slice(0, 3).toUpperCase(), subject]
      );
    }

    if (req.user?.role === 'teacher') {
      const assignment = await db.query(
        `SELECT tsa.teacher_id
         FROM teacher_subject_assignments tsa
         JOIN teachers t ON t.id = tsa.teacher_id
         JOIN students s ON s.class_id = tsa.class_id
         WHERE t.user_id = ? AND s.id = ? AND tsa.subject_id = ?`,
        [req.user.id, studentId, subjectId],
      );
      if (!assignment.rows.length) {
        return res.status(403).json({ error: 'You can record marks only for your assigned class and subject.' });
      }
    }

    const examRes = await db.query(
      `SELECT id FROM exams
       WHERE LOWER(exam_type) LIKE '%mid%' OR LOWER(title) LIKE '%mid%'
       ORDER BY CASE WHEN LOWER(exam_type) LIKE '%mid%' THEN 0 ELSE 1 END, created_at DESC
       LIMIT 1`,
    );
    let examId = examRes.rows[0]?.id;
    if (!examId) {
      examId = 'exam-2026-term2';
      await db.query(`INSERT INTO exams (id, term_id, title, exam_type) VALUES (?, 'term-2026-2', 'Term 2 Mid-Term Evaluation', 'Mid-Term')`,
        [examId]
      );
    }

    const markRes = await db.query(
      `SELECT m.id FROM marks m JOIN exams e ON e.id = m.exam_id
       WHERE m.student_id = ? AND m.subject_id = ?
         AND (LOWER(e.exam_type) LIKE '%mid%' OR LOWER(e.title) LIKE '%mid%')
       ORDER BY m.created_at DESC LIMIT 1`,
      [studentId, subjectId],
    );
    const markId = markRes.rows[0]?.id ||
      `mrk-${createHash('sha256').update(`${studentId}:${subjectId}:${examId}`).digest('hex').slice(0, 32)}`;
    await db.query(
      `INSERT INTO marks (id, exam_id, student_id, subject_id, score, max_score, grade, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, 100.0, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         exam_id = EXCLUDED.exam_id,
         student_id = EXCLUDED.student_id,
         subject_id = EXCLUDED.subject_id,
         score = EXCLUDED.score,
         max_score = EXCLUDED.max_score,
         grade = EXCLUDED.grade,
         remarks = EXCLUDED.remarks,
         recorded_by = EXCLUDED.recorded_by`,
      [markId, examId, studentId, subjectId, numMarks, letterGrade, remarks || 'Evaluated', req.user?.id || 'sys']
    );

    // Recalculate overall GPA for student
    const allMarks = await db.query(`SELECT score FROM marks WHERE student_id = ?`, [studentId]);
    if (allMarks.rows.length > 0) {
      const avg = allMarks.rows.reduce((sum: number, r: any) => sum + Number(r.score), 0) / allMarks.rows.length;
      await db.query(`UPDATE students SET overall_gpa = ? WHERE id = ?`, [Math.round(avg * 10) / 10, studentId]);
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Educator',
      role: req.user?.role || 'teacher',
      action: 'GRADE_UPDATE',
      details: `Recorded mark of ${numMarks}% (${letterGrade}) in ${subject} for student ${studentId}`,
      ipAddress: req.ip
    });

    return res.json({
      message: 'Grade recorded successfully',
      grade: {
        id: markId,
        studentId,
        subject,
        marks: numMarks,
        grade: letterGrade,
        remarks: remarks || 'Evaluated'
      }
    });
  } catch (error: any) {
    console.error('Error updating grade:', error);
    return res.status(500).json({ error: error.message || 'Failed to update grade' });
  }
}

export async function deleteGrade(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role === 'teacher' && req.user.teacherType !== 'subject_teacher') {
      return res.status(403).json({ error: 'Only subject teachers can delete subject marks.' });
    }

    const markResult = await db.query(
      `SELECT m.student_id, m.subject_id, s.class_id
       FROM marks m JOIN students s ON s.id = m.student_id
       WHERE m.id = ?`,
      [req.params.id],
    );
    const mark = markResult.rows[0];
    if (!mark) return res.status(404).json({ error: 'Subject mark not found.' });

    if (req.user?.role === 'teacher') {
      const assignment = await db.query(
        `SELECT tsa.teacher_id FROM teacher_subject_assignments tsa
         JOIN teachers t ON t.id = tsa.teacher_id
         WHERE t.user_id = ? AND tsa.class_id = ? AND tsa.subject_id = ?`,
        [req.user.id, mark.class_id, mark.subject_id],
      );
      if (!assignment.rows.length) {
        return res.status(403).json({ error: 'You can delete marks only for your assigned class and subject.' });
      }
    }

    await db.query(`DELETE FROM marks WHERE id = ?`, [req.params.id]);
    const allMarks = await db.query(`SELECT score FROM marks WHERE student_id = ?`, [mark.student_id]);
    const average = allMarks.rows.length
      ? allMarks.rows.reduce((sum: number, row: any) => sum + Number(row.score), 0) / allMarks.rows.length
      : 0;
    await db.query(
      `UPDATE students SET overall_gpa = ? WHERE id = ?`,
      [Math.round(average * 10) / 10, mark.student_id],
    );
    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Educator',
      role: req.user?.role || 'teacher',
      action: 'GRADE_DELETE',
      details: `Deleted subject mark ${req.params.id} for student ${mark.student_id}`,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Subject mark deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete grade' });
  }
}
