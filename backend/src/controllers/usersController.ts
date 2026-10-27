import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { isValidProfileImage } from '../utils/profileImage';

const PERMITTED_ROLES = ['admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'parent', 'student'];
const PRIVILEGED_STAFF_ROLES = ['admin', 'head_teacher', 'teacher', 'accountant', 'librarian', 'parent', 'student'];

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(
      `SELECT id, username, email, full_name, role, phone, avatar_url, status, must_change_password,
              recovery_email, recovery_phone, last_login, created_at, is_active
       FROM users
       ORDER BY created_at DESC`
    );

    const users = result.rows.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      phone: u.phone || '',
      avatar: u.avatar_url || '',
      status: u.status || (u.is_active === 1 ? 'Active' : 'Inactive'),
      mustChangePassword: Number(u.must_change_password) === 1,
      recoveryEmail: u.recovery_email || '',
      recoveryPhone: u.recovery_phone || '',
      lastLogin: u.last_login ? String(u.last_login).replace('T', ' ').substring(0, 19) : null,
      createdAt: u.created_at ? String(u.created_at).replace('T', ' ').substring(0, 10) : '',
    }));

    return res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve users' });
  }
}

export async function createStaffUser(req: AuthRequest, res: Response) {
  try {
    const {
      fullName, email, username, password, role, phone, specialization, department, avatar, studentIds,
      teacherType, classIds, subjectAssignments,
    } = req.body;

    if (!fullName || !email || !username || !password || !role) {
      return res.status(400).json({ error: 'Full name, email, username, password, and role are required' });
    }
    if (!isValidProfileImage(avatar)) {
      return res.status(400).json({ error: 'A JPEG, PNG, or WebP profile photo of 5 MB or smaller is required' });
    }

    if (!PERMITTED_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Permitted roles are: ${PERMITTED_ROLES.join(', ')}`
      });
    }

    let normalizedClassIds: string[] = [];
    let normalizedSubjectAssignments: { classId: string; subjectId: string }[] = [];
    if (role === 'teacher') {
      if (!['class_teacher', 'subject_teacher'].includes(teacherType)) {
        return res.status(400).json({ error: 'Choose whether this teacher is a class teacher or subject teacher.' });
      }
      if (!Array.isArray(classIds) || classIds.some((id: unknown) => typeof id !== 'string') ||
          !Array.isArray(subjectAssignments) ||
          subjectAssignments.some((item: any) =>
            !item || typeof item.classId !== 'string' || typeof item.subjectId !== 'string')) {
        return res.status(400).json({ error: 'Teacher class and subject assignments are invalid.' });
      }
      normalizedClassIds = [...new Set(classIds as string[])];
      normalizedSubjectAssignments = [
        ...new Map((subjectAssignments as { classId: string; subjectId: string }[])
          .map(item => [`${item.classId}:${item.subjectId}`, item])).values(),
      ];

      if (teacherType === 'class_teacher' &&
          (!normalizedClassIds.length || normalizedClassIds.length > 20 || normalizedSubjectAssignments.length)) {
        return res.status(400).json({ error: 'A class teacher must be assigned to 1–20 classes only.' });
      }
      if (teacherType === 'subject_teacher' &&
          (!normalizedSubjectAssignments.length || normalizedSubjectAssignments.length > 100 || normalizedClassIds.length)) {
        return res.status(400).json({ error: 'A subject teacher must have 1–100 class-and-subject assignments.' });
      }
      const assignedClassIds = teacherType === 'class_teacher'
        ? normalizedClassIds
        : [...new Set(normalizedSubjectAssignments.map(item => item.classId))];
      if (assignedClassIds.length > 20) {
        return res.status(400).json({ error: 'A teacher cannot be assigned to more than 20 classes.' });
      }
      const availableClasses = await db.query(
        `SELECT id FROM classes WHERE id IN (${assignedClassIds.map(() => '?').join(', ')})`,
        assignedClassIds,
      );
      if (availableClasses.rows.length !== assignedClassIds.length) {
        return res.status(400).json({ error: 'One or more selected classes are unavailable.' });
      }
      if (teacherType === 'class_teacher') {
        const occupiedClasses = await db.query(
          `SELECT id FROM classes WHERE id IN (${normalizedClassIds.map(() => '?').join(', ')})
           AND class_teacher_id IS NOT NULL`,
          normalizedClassIds,
        );
        if (occupiedClasses.rows.length) {
          return res.status(409).json({ error: 'One or more selected classes already have a class teacher.' });
        }
      } else {
        const subjectIds = [...new Set(normalizedSubjectAssignments.map(item => item.subjectId))];
        const availableSubjects = await db.query(
          `SELECT id FROM subjects WHERE id IN (${subjectIds.map(() => '?').join(', ')})`,
          subjectIds,
        );
        if (availableSubjects.rows.length !== subjectIds.length) {
          return res.status(400).json({ error: 'One or more selected subjects are unavailable.' });
        }
      }
    }

    const linkedStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0).map((id: string) => id.trim()))]
      : [];
    if (role === 'parent') {
      if (linkedStudentIds.length === 0 || linkedStudentIds.length > 20) {
        return res.status(400).json({ error: 'Select between 1 and 20 students for a parent account' });
      }
      const studentResult = await db.query(
        `SELECT id FROM students WHERE id IN (${linkedStudentIds.map(() => '?').join(', ')}) AND status <> 'Archived'`,
        linkedStudentIds,
      );
      if (studentResult.rows.length !== linkedStudentIds.length) {
        return res.status(400).json({ error: 'One or more selected students are unavailable' });
      }
    }

    // Check username or email uniqueness
    const existing = await db.query(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username.trim().toLowerCase(), email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const avatarUrl = avatar;

    // Account created by admin is immediately ACTIVE with direct right to login to their dashboard
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, full_name, role, phone, avatar_url, status, must_change_password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 0, 1, ?, ?)`,
      [
        userId,
        username.trim().toLowerCase(),
        email.trim().toLowerCase(),
        passwordHash,
        fullName.trim(),
        role,
        phone || null,
        avatarUrl,
        now,
        now
      ]
    );

    // If role is teacher, also provision teacher table record
    if (role === 'teacher') {
      const teacherId = `tch-${Date.now()}`;
      const empId = `EMP-SSP-${Math.floor(100 + Math.random() * 900)}`;
      await db.query(
        `INSERT INTO teachers (id, user_id, employee_id, teacher_type, specialization, qualification, phone, join_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 'Active')`,
        [
          teacherId,
          userId,
          empId,
          teacherType,
          specialization || 'CBC Primary Education',
          department || 'Academic Faculty',
          phone || ''
        ]
      );
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
    } else if (role === 'parent') {
      const parentId = `par-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      await db.query(
        `INSERT INTO parents (id, user_id, full_name, phone, email, address)
         VALUES (?, ?, ?, ?, ?, 'Kibondo Village, Simbwa Cell')`,
        [parentId, userId, fullName.trim(), phone || '', email.trim().toLowerCase()]
      );
      for (const studentId of linkedStudentIds) {
        await db.query(
          `INSERT INTO parent_students (parent_id, student_id) VALUES (?, ?)`,
          [parentId, studentId],
        );
      }
    }

    // Record Security Audit Log
    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'USER_ACCOUNT_AUTHORIZED_AND_CREATED',
      details: `Created new user account [${role}] for ${fullName} (${username}). Account is immediately Active with login rights.`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: `User account for ${fullName} (${role}) added successfully. User can now log in immediately.`,
      user: {
        id: userId,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role,
        teacherType: role === 'teacher' ? teacherType : undefined,
        avatar: avatarUrl,
        status: 'Active',
        mustChangePassword: false,
        createdAt: now.substring(0, 10)
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: error.message || 'Failed to create user account' });
  }
}

export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role, status, avatar } = req.body;

    const targetUser = await db.query(`SELECT id, role, full_name, username FROM users WHERE id = ?`, [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing owner role or deactivating owner
    if ((targetUser.rows[0].role === 'owner' || targetUser.rows[0].role === 'super_admin') && (role && role !== 'owner' || status === 'Inactive')) {
      return res.status(403).json({ error: 'Cannot downgrade or deactivate the Super Admin / Owner account.' });
    }

    const isActiveVal = status === 'Inactive' ? 0 : 1;

    await db.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           role = COALESCE(?, role),
           status = COALESCE(?, status),
           avatar_url = COALESCE(?, avatar_url),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : null,
        email ? email.trim().toLowerCase() : null,
        phone || null,
        role || null,
        status || null,
        avatar || null,
        status ? isActiveVal : null,
        id
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'USER_UPDATED',
      details: `Updated profile details for user ${targetUser.rows[0].username}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update user' });
  }
}

export async function updateUserStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Active or Inactive' });
    }

    const targetUser = await db.query(`SELECT id, role, full_name, username FROM users WHERE id = ?`, [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protect Super Admin / Owner from deactivation
    if (targetUser.rows[0].role === 'owner' || targetUser.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'The Super Admin / School Owner account cannot be deactivated.' });
    }

    const isActiveVal = status === 'Active' ? 1 : 0;
    await db.query(
      `UPDATE users SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, isActiveVal, id]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Super Admin',
      role: 'owner',
      action: 'USER_STATUS_CHANGE',
      details: `Updated account status for ${targetUser.rows[0].full_name} (${targetUser.rows[0].username}) to ${status}`,
      ipAddress: req.ip
    });

    return res.json({ message: `Account status updated to ${status}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update user status' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!PRIVILEGED_STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Permitted staff roles are: ${PRIVILEGED_STAFF_ROLES.join(', ')}`
      });
    }

    const targetUser = await db.query(`SELECT id, role, full_name, username FROM users WHERE id = ?`, [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.rows[0].role === 'owner' || targetUser.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify role of the primary Super Admin / Owner.' });
    }

    await db.query(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [role, id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Super Admin',
      role: 'owner',
      action: 'USER_ROLE_REASSIGNED',
      details: `Reassigned role for ${targetUser.rows[0].full_name} (${targetUser.rows[0].username}) from ${targetUser.rows[0].role} to ${role}`,
      ipAddress: req.ip
    });

    return res.json({ message: `Role changed to ${role} successfully` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to change role' });
  }
}

export async function resetUserPassword(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    if (!temporaryPassword || temporaryPassword.length < 6) {
      return res.status(400).json({ error: 'Temporary password must contain at least 6 characters' });
    }

    const targetUser = await db.query(`SELECT id, full_name, username, role FROM users WHERE id = ?`, [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await db.query(
      `UPDATE users
       SET password_hash = ?, must_change_password = 1, status = 'PENDING_FIRST_LOGIN', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, id]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Super Admin',
      role: 'owner',
      action: 'USER_PASSWORD_RESET',
      details: `Reset password for ${targetUser.rows[0].full_name} (${targetUser.rows[0].username}). User forced to change password on next login.`,
      ipAddress: req.ip
    });

    return res.json({
      message: `Password reset successfully. The user must set their new password upon their next login.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const targetUser = await db.query(`SELECT id, full_name, username, role FROM users WHERE id = ?`, [id]);
    if (targetUser.rows.length === 0) {
      return res.json({ message: 'User account removed successfully' });
    }

    if (targetUser.rows[0].role === 'owner' || targetUser.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete the Super Admin / Owner account.' });
    }

    await db.query(`DELETE FROM users WHERE id = ?`, [id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Super Admin',
      role: 'owner',
      action: 'USER_DELETED',
      details: `Permanently removed user account: ${targetUser.rows[0].full_name} (${targetUser.rows[0].username}, ${targetUser.rows[0].role})`,
      ipAddress: req.ip
    });

    return res.json({ message: 'User account removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
}
