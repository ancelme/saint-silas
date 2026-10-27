import { Response } from 'express';
import { createHash } from 'crypto';
import type { StudentMidtermReport } from '../../../frontend/src/types';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

function parseReport(value: string): StudentMidtermReport {
  try {
    return JSON.parse(value) as StudentMidtermReport;
  } catch (error) {
    console.error('Stored pupil report is invalid JSON:', error);
    throw new Error('A saved report could not be read.');
  }
}

export async function getStudentReports(req: AuthRequest, res: Response) {
  try {
    let result;
    if (req.user?.role === 'parent') {
      result = await db.query(
        `SELECT r.report_json
         FROM student_reports r
         JOIN students s ON s.id = r.student_id
         LEFT JOIN parents legacy_parent ON legacy_parent.id = s.parent_id
         WHERE legacy_parent.user_id = ? OR EXISTS (
           SELECT 1 FROM parent_students ps
           JOIN parents linked_parent ON linked_parent.id = ps.parent_id
           WHERE ps.student_id = s.id AND linked_parent.user_id = ?
         )
         ORDER BY r.published_at DESC`,
        [req.user.id, req.user.id],
      );
    } else if (req.user?.role === 'teacher' && req.user.teacherType === 'class_teacher') {
      result = await db.query(
        `SELECT r.report_json
         FROM student_reports r
         JOIN students s ON s.id = r.student_id
         JOIN classes c ON c.id = s.class_id
         JOIN teachers t ON t.id = c.class_teacher_id
         WHERE t.user_id = ?
         ORDER BY r.published_at DESC`,
        [req.user.id],
      );
    } else if (['admin', 'owner', 'super_admin', 'head_teacher'].includes(req.user?.role || '')) {
      result = await db.query(`SELECT report_json FROM student_reports ORDER BY published_at DESC`);
    } else {
      return res.status(403).json({ error: 'Reports are not available for this account.' });
    }

    return res.json(result.rows.map(row => parseReport(row.report_json)));
  } catch (error) {
    console.error('Failed to retrieve pupil reports:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve pupil reports' });
  }
}

export async function publishMidtermReports(req: AuthRequest, res: Response) {
  if (req.user?.role !== 'teacher' || req.user.teacherType !== 'class_teacher') {
    return res.status(403).json({ error: 'Only an assigned class teacher can publish class midterm reports.' });
  }

  const period = typeof req.body?.period === 'string' ? req.body.period.trim() : '';
  const comments = req.body?.comments;
  if (!period || period.length > 50) {
    return res.status(400).json({ error: 'Enter a report period of 1 to 50 characters.' });
  }
  if (!comments || typeof comments !== 'object' || Array.isArray(comments)) {
    return res.status(400).json({ error: 'Teacher comments must be provided for the report.' });
  }

  try {
    const teacherResult = await db.query(
      `SELECT id, user_id FROM teachers WHERE user_id = ? AND teacher_type = 'class_teacher' AND status <> 'Archived'`,
      [req.user.id],
    );
    const teacher = teacherResult.rows[0];
    if (!teacher) return res.status(403).json({ error: 'Your class-teacher assignment could not be found.' });

    const studentsResult = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.grade, s.class_id, s.parent_id, c.name AS class_name
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE c.class_teacher_id = ? AND s.status <> 'Archived'
       ORDER BY s.last_name, s.first_name`,
      [teacher.id],
    );
    if (!studentsResult.rows.length) {
      return res.status(400).json({ error: 'There are no active pupils in your assigned class.' });
    }
    for (const student of studentsResult.rows) {
      const comment = comments[student.id];
      if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1000) {
        return res.status(400).json({ error: `Enter a comment of 1 to 1000 characters for ${student.first_name} ${student.last_name}.` });
      }
    }

    const publishedReports: StudentMidtermReport[] = [];
    for (const student of studentsResult.rows) {
      const comment = comments[student.id];

      const marksResult = await db.query(
        `SELECT sub.name AS subject, m.score, m.max_score, m.grade, m.remarks, e.exam_type, e.title
         FROM marks m
         JOIN subjects sub ON sub.id = m.subject_id
         JOIN exams e ON e.id = m.exam_id
         WHERE m.student_id = ? AND (LOWER(e.exam_type) LIKE '%mid%' OR LOWER(e.title) LIKE '%mid%')
         ORDER BY sub.name`,
        [student.id],
      );
      const attendanceResult = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
                SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) AS excused
         FROM attendance WHERE student_id = ? AND subject_id IS NULL`,
        [student.id],
      );
      const attendance = attendanceResult.rows[0] || {};
      const report: StudentMidtermReport = {
        id: `rpt-${createHash('sha256').update(`${student.id}:${period.toLowerCase()}`).digest('hex').slice(0, 32)}`,
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        grade: student.class_name || student.grade,
        period,
        attendance: {
          present: Number(attendance.present || 0),
          absent: Number(attendance.absent || 0),
          late: Number(attendance.late || 0),
          excused: Number(attendance.excused || 0),
          total: Number(attendance.total || 0),
        },
        subjects: marksResult.rows.map(mark => ({
          subject: mark.subject,
          marks: Number(mark.score),
          maxMarks: Number(mark.max_score || 100),
          grade: mark.grade || '',
          remarks: mark.remarks || '',
        })),
        teacherComment: comment.trim(),
        teacherName: req.user.fullName,
        publishedAt: new Date().toISOString(),
      };

      await db.query(
        `INSERT INTO student_reports (id, student_id, period, report_json, teacher_id, published_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (student_id, period) DO UPDATE SET
           report_json = EXCLUDED.report_json,
           teacher_id = EXCLUDED.teacher_id,
           published_at = CURRENT_TIMESTAMP`,
        [report.id, student.id, period, JSON.stringify(report), teacher.id],
      );

      const parentsResult = await db.query(
        `SELECT DISTINCT p.user_id
         FROM parents p
         JOIN parent_students ps ON ps.parent_id = p.id
         WHERE ps.student_id = ? AND p.user_id IS NOT NULL
         UNION
         SELECT user_id FROM parents WHERE id = ? AND user_id IS NOT NULL`,
        [student.id, student.parent_id || ''],
      );
      const messageBody =
        `${period} report for ${report.studentName} (${report.grade})\n` +
        `Midterm subjects recorded: ${report.subjects.length}\n` +
        `Attendance: ${report.attendance.present} present, ${report.attendance.absent} absent, ${report.attendance.late} late, ${report.attendance.excused} excused.\n` +
        `Class teacher comment: ${report.teacherComment}\n` +
        `Open the Reports section of your parent dashboard to view the full report.`;
      for (const parent of parentsResult.rows) {
        const messageId = `msg-${createHash('sha256').update(`${report.id}:${parent.user_id}`).digest('hex').slice(0, 32)}`;
        await db.query(
          `INSERT INTO messages (id, sender_id, recipient_id, subject, body, is_read)
           VALUES (?, ?, ?, ?, ?, 0)
           ON CONFLICT (id) DO UPDATE SET
             subject = EXCLUDED.subject,
             body = EXCLUDED.body,
             is_read = 0`,
          [messageId, req.user.id, parent.user_id, `${period} report: ${report.studentName}`, messageBody],
        );
      }
      publishedReports.push(report);
    }

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      role: req.user.role,
      action: 'MIDTERM_REPORTS_PUBLISHED',
      details: `Published ${period} reports for ${publishedReports.length} pupils and sent parent messages.`,
      ipAddress: req.ip,
    });
    return res.json({
      message: `Published reports for ${publishedReports.length} pupils and sent them to linked parents.`,
      reports: publishedReports,
    });
  } catch (error) {
    console.error('Failed to publish midterm reports:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to publish midterm reports' });
  }
}
