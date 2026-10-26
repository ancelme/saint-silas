import { Response } from 'express';
import bcrypt from 'bcryptjs';
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

    const teachers = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      name: row.full_name,
      email: row.email,
      phone: row.phone || '+250 788 123 456',
      role: 'teacher',
      specialization: row.specialization || 'Primary Educator',
      assignedGrades: (row.specialization || '').split(',').map((s: string) => s.trim()),
      subjects: ['Mathematics', 'Science & Elementary Technology (SET)'],
      avatar: row.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      joinDate: row.join_date || '2024-01-08',
      qualification: row.qualification || 'Diploma in Primary Education (TTC)',
      status: row.status || 'Active',
      address: `${row.village || 'Kibondo'} Village, ${row.cell || 'Simbwa'} Cell`
    }));

    return res.json(teachers);
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch teachers' });
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
