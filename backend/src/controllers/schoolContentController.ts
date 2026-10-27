import { Response } from 'express';
import type { SchoolEvent, TimetableSlot } from '../../../frontend/src/types';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

const timetableDays: TimetableSlot['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const eventTypes: SchoolEvent['type'][] = ['Academic', 'Sports', 'Cultural', 'Meeting'];

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isTimetableSlot(value: unknown): value is TimetableSlot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return isText(item.id, 100) &&
    timetableDays.includes(item.day as TimetableSlot['day']) &&
    isText(item.period, 50) &&
    isText(item.subject, 100) &&
    isText(item.teacherName, 150) &&
    isText(item.classroom, 100) &&
    isText(item.grade, 100) &&
    (item.level === undefined || ['Nursery', 'Lower Primary', 'Upper Primary'].includes(String(item.level)));
}

function isTimetable(items: unknown): items is TimetableSlot[] {
  return Array.isArray(items) &&
    items.length <= 1000 &&
    items.every(isTimetableSlot) &&
    new Set(items.map((item: TimetableSlot) => item.id)).size === items.length;
}

function isSchoolEvent(value: unknown): value is SchoolEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return isText(item.id, 100) &&
    isText(item.title, 200) &&
    typeof item.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    !Number.isNaN(Date.parse(`${item.date}T00:00:00`)) &&
    new Date(`${item.date}T00:00:00`).toISOString().slice(0, 10) === item.date &&
    isText(item.time, 100) &&
    isText(item.location, 200) &&
    eventTypes.includes(item.type as SchoolEvent['type']) &&
    isText(item.description, 2000);
}

function isSchoolEvents(items: unknown): items is SchoolEvent[] {
  return Array.isArray(items) &&
    items.length <= 1000 &&
    items.every(isSchoolEvent) &&
    new Set(items.map((item: SchoolEvent) => item.id)).size === items.length;
}

async function getContent(contentKey: 'timetable' | 'events', res: Response) {
  try {
    const result = await db.query<{ content_json: string }>(
      'SELECT content_json FROM school_content WHERE content_key = ?',
      [contentKey],
    );
    if (result.rows.length === 0) return res.json({ items: null });

    try {
      return res.json({ items: JSON.parse(result.rows[0].content_json) });
    } catch (error) {
      console.error(`Failed to parse saved ${contentKey}:`, error);
      return res.status(500).json({ error: `Saved ${contentKey} data is invalid` });
    }
  } catch (error) {
    console.error(`Failed to load ${contentKey}:`, error);
    return res.status(500).json({ error: `Failed to load ${contentKey}` });
  }
}

async function saveContent(
  contentKey: 'timetable' | 'events',
  items: TimetableSlot[] | SchoolEvent[],
  req: AuthRequest,
  res: Response,
) {
  try {
    const serialized = JSON.stringify(items);
    const existing = await db.query(
      'SELECT content_key FROM school_content WHERE content_key = ?',
      [contentKey],
    );

    if (existing.rows.length > 0) {
      await db.query(
        'UPDATE school_content SET content_json = ?, updated_at = CURRENT_TIMESTAMP WHERE content_key = ?',
        [serialized, contentKey],
      );
    } else {
      await db.query(
        'INSERT INTO school_content (content_key, content_json) VALUES (?, ?)',
        [contentKey, serialized],
      );
    }

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      userEmail: req.user?.email,
      role: req.user?.role || 'admin',
      action: `${contentKey.toUpperCase()}_UPDATED`,
      details: `Updated ${items.length} ${contentKey} records`,
      ipAddress: req.ip,
    });
    return res.json({ message: `${contentKey} saved successfully`, items });
  } catch (error) {
    console.error(`Failed to save ${contentKey}:`, error);
    return res.status(500).json({ error: `Failed to save ${contentKey}` });
  }
}

export async function getTimetable(req: AuthRequest, res: Response) {
  if (req.user?.role === 'teacher') {
    try {
      const teacherResult = await db.query(`SELECT id, teacher_type FROM teachers WHERE user_id = ?`, [req.user.id]);
      const teacher = teacherResult.rows[0];
      if (!teacher) return res.status(403).json({ error: 'Teacher assignment could not be found.' });

      const [contentResult, classesResult, subjectResult] = await Promise.all([
        db.query<{ content_json: string }>(
          'SELECT content_json FROM school_content WHERE content_key = ?',
          ['timetable'],
        ),
        db.query(
          `SELECT DISTINCT c.name
           FROM classes c
           WHERE c.class_teacher_id = ?
           UNION
           SELECT DISTINCT c.name
           FROM teacher_subject_assignments tsa
           JOIN classes c ON c.id = tsa.class_id
           WHERE tsa.teacher_id = ?`,
          [teacher.id, teacher.id],
        ),
        db.query(
          `SELECT DISTINCT s.name
           FROM teacher_subject_assignments tsa
           JOIN subjects s ON s.id = tsa.subject_id
           WHERE tsa.teacher_id = ?`,
          [teacher.id],
        ),
      ]);
      if (contentResult.rows.length === 0) return res.json({ items: [] });

      const classNames = classesResult.rows.map(row => String(row.name));
      const subjectNames = new Set(subjectResult.rows.map(row => String(row.name).toLowerCase()));
      const items = JSON.parse(contentResult.rows[0].content_json) as TimetableSlot[];
      return res.json({
        items: items.filter(item => {
          const slotGrade = item.grade.toLowerCase();
          const assignedClass = classNames.some(className => {
            const classValue = className.toLowerCase();
            return classValue === slotGrade || classValue.startsWith(slotGrade) || slotGrade.startsWith(classValue);
          });
          if (!assignedClass) return false;
          if (teacher.teacher_type === 'class_teacher') return true;
          return subjectNames.has(item.subject.toLowerCase()) &&
            item.teacherName.toLowerCase() === req.user!.fullName.toLowerCase();
        }),
      });
    } catch (error) {
      console.error('Failed to load teacher timetable:', error);
      return res.status(500).json({ error: 'Failed to load teacher timetable' });
    }
  }

  if (req.user?.role !== 'parent') {
    return getContent('timetable', res);
  }

  try {
    const contentResult = await db.query<{ content_json: string }>(
      'SELECT content_json FROM school_content WHERE content_key = ?',
      ['timetable'],
    );
    if (contentResult.rows.length === 0) return res.json({ items: null });

    const gradesResult = await db.query<{ grade: string }>(
      `SELECT DISTINCT s.grade
       FROM students s
       LEFT JOIN parents legacy_parent ON legacy_parent.id = s.parent_id
       WHERE legacy_parent.user_id = ?
          OR EXISTS (
            SELECT 1 FROM parent_students ps
            JOIN parents linked_parent ON linked_parent.id = ps.parent_id
            WHERE ps.student_id = s.id AND linked_parent.user_id = ?
          )`,
      [req.user.id, req.user.id],
    );
    const linkedGrades = new Set(gradesResult.rows.map(row => row.grade));
    const items = JSON.parse(contentResult.rows[0].content_json) as TimetableSlot[];
    return res.json({ items: items.filter(item => linkedGrades.has(item.grade)) });
  } catch (error) {
    console.error('Failed to load parent timetable:', error);
    return res.status(500).json({ error: 'Failed to load timetable' });
  }
}

export function saveTimetable(req: AuthRequest, res: Response) {
  if (!isTimetable(req.body?.items)) {
    return res.status(400).json({ error: 'Timetable entries are invalid' });
  }
  return saveContent('timetable', req.body.items, req, res);
}

export function getSchoolEvents(_req: AuthRequest, res: Response) {
  return getContent('events', res);
}

export function saveSchoolEvents(req: AuthRequest, res: Response) {
  if (!isSchoolEvents(req.body?.items)) {
    return res.status(400).json({ error: 'School event entries are invalid' });
  }
  return saveContent('events', req.body.items, req, res);
}
