import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index';
import { generateToken, AuthRequest, recordAuditLog } from '../middleware/auth';
import { isValidProfileImage } from '../utils/profileImage';

const PRIVILEGED_ROLES = ['owner', 'super_admin', 'admin', 'head_teacher', 'teacher', 'accountant', 'librarian'];

export async function getSetupStatus(req: Request, res: Response) {
  try {
    const isConfigured = await db.checkIsOwnerConfigured();
    const settingsRes = await db.query(`SELECT setting_value FROM school_settings WHERE setting_key = 'school_name'`);
    const schoolName = settingsRes.rows[0]?.setting_value || 'St. Silas Private Primary School';
    const dbInfo = db.getDatabaseEngine();

    return res.json({
      isOwnerConfigured: isConfigured,
      defaultOwnerUsername: 'innocent',
      schoolName,
      dbEngine: dbInfo.engine,
      status: 'ready'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error checking setup status' });
  }
}

export async function setupInitialOwner(req: Request, res: Response) {
  try {
    const isAlreadyConfigured = await db.checkIsOwnerConfigured();
    if (isAlreadyConfigured) {
      return res.status(403).json({ error: 'System already has a primary Super Admin / Owner account provisioned.' });
    }

    const { fullName, email, username, password, phone, avatar } = req.body;

    if (!isValidProfileImage(avatar)) {
      return res.status(400).json({ error: 'A JPEG, PNG, or WebP profile photo of 5 MB or smaller is required' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Temporary password must be at least 6 characters' });
    }

    // Default username requested is 'innocent' if not provided or empty
    const cleanUsername = (username && username.trim() ? username.trim() : 'innocent').toLowerCase();
    const cleanEmail = (email && email.trim() ? email.trim() : `${cleanUsername}@st-silas.rw`).toLowerCase();
    const cleanFullName = fullName && fullName.trim() ? fullName.trim() : 'Innocent Ndayishimiye (School Owner)';
    const avatarUrl = avatar;

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-owner-${Date.now()}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `INSERT INTO users (id, username, email, password_hash, full_name, role, phone, avatar_url, status, must_change_password, is_active, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'owner', ?, ?, 'PENDING_FIRST_LOGIN', 1, 1, 1, ?, ?)`,
      [
        userId,
        cleanUsername,
        cleanEmail,
        passwordHash,
        cleanFullName,
        phone || '+250 788 765 432',
        avatarUrl,
        now,
        now
      ]
    );

    await recordAuditLog({
      userId,
      userName: cleanFullName,
      userEmail: cleanEmail,
      role: 'owner',
      action: 'SYSTEM_INSTALL_OWNER',
      details: `Initial sovereign Super Admin / Owner account provisioned for ${cleanFullName} (${cleanUsername}) with temporary credentials. PENDING_FIRST_LOGIN enforced.`,
      ipAddress: req.ip
    });

    const token = generateToken({
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      role: 'owner',
      fullName: cleanFullName,
      mustChangePassword: true
    });

    return res.status(201).json({
      message: 'Owner account successfully created. Temporary password must be changed immediately on login.',
      token,
      mustChangePassword: true,
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        fullName: cleanFullName,
        role: 'owner',
        status: 'PENDING_FIRST_LOGIN',
        mustChangePassword: true,
        phone: phone || '+250 788 765 432',
        avatar: avatarUrl
      }
    });
  } catch (error: any) {
    console.error('Error in setupInitialOwner:', error);
    return res.status(500).json({ error: error.message || 'Failed to setup initial owner' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const userRes = await db.query(
      `SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) LIMIT 1`,
      [cleanIdentifier, cleanIdentifier]
    );

    if (userRes.rows.length === 0) {
      await recordAuditLog({
        userName: cleanIdentifier,
        role: 'unknown',
        action: 'FAILED_LOGIN_ATTEMPT',
        details: `Failed login attempt with non-existent identifier "${cleanIdentifier}"`,
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Access denied: User account is not registered or authorized in the school system.' });
    }

    const user = userRes.rows[0];

    if (user.is_active === 0 || user.status === 'Inactive') {
      await recordAuditLog({
        userId: user.id,
        userName: user.full_name,
        userEmail: user.email,
        role: user.role,
        action: 'DEACTIVATED_LOGIN_BLOCKED',
        details: `Login blocked for deactivated account: ${user.username}`,
        ipAddress: req.ip
      });
      return res.status(403).json({ error: 'Access denied: Only authorized active users can log in. Your account is inactive or not authorized. Please contact the School Administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await recordAuditLog({
        userId: user.id,
        userName: user.full_name,
        userEmail: user.email,
        role: user.role,
        action: 'FAILED_LOGIN_ATTEMPT',
        details: `Failed password verification for user ${user.username}`,
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Update last login timestamp
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await db.query(`UPDATE users SET last_login = ? WHERE id = ?`, [now, user.id]);

    const mustChangePassword = Number(user.must_change_password) === 1 || user.status === 'PENDING_FIRST_LOGIN';

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      mustChangePassword
    });

    await recordAuditLog({
      userId: user.id,
      userName: user.full_name,
      userEmail: user.email,
      role: user.role,
      action: 'USER_LOGIN',
      details: `Successful login via web portal for role [${user.role}]. Forced password change required: ${mustChangePassword}`,
      ipAddress: req.ip
    });

    return res.json({
      token,
      mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status || 'Active',
        mustChangePassword,
        recoveryEmail: user.recovery_email || '',
        recoveryPhone: user.recovery_phone || '',
        phone: user.phone || '',
        avatar: user.avatar_url || '',
        lastLogin: now
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
}

export async function completeFirstLogin(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { currentPassword, newPassword, recoveryEmail, recoveryPhone } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must contain at least 8 characters' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the temporary password' });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dbUser = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current temporary password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db.query(
      `UPDATE users
       SET password_hash = ?,
           must_change_password = 0,
           status = 'Active',
           recovery_email = ?,
           recovery_phone = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        newHash,
        recoveryEmail ? recoveryEmail.trim().toLowerCase() : (dbUser.recovery_email || dbUser.email),
        recoveryPhone ? recoveryPhone.trim() : (dbUser.recovery_phone || dbUser.phone),
        now,
        req.user.id
      ]
    );

    await recordAuditLog({
      userId: req.user.id,
      userName: dbUser.full_name,
      userEmail: dbUser.email,
      role: dbUser.role,
      action: 'FIRST_LOGIN_PASSWORD_SETUP',
      details: `First-time password change and recovery configuration completed successfully. Account activated to Active state.`,
      ipAddress: req.ip
    });

    // Generate fresh token without mustChangePassword flag
    const token = generateToken({
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      fullName: dbUser.full_name,
      mustChangePassword: false
    });

    return res.json({
      message: 'Permanent password and security recovery method configured successfully. Welcome to St. Silas School System!',
      token,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        status: 'Active',
        mustChangePassword: false,
        recoveryEmail: recoveryEmail || dbUser.recovery_email || dbUser.email,
        recoveryPhone: recoveryPhone || dbUser.recovery_phone || dbUser.phone,
        avatar: dbUser.avatar_url || ''
      }
    });
  } catch (error: any) {
    console.error('Error in completeFirstLogin:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete first login' });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const userRes = await db.query(
      `SELECT id, username, email, full_name, role, phone, address, district, sector, cell, village, avatar_url, status, must_change_password, recovery_email, recovery_phone, last_login
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = userRes.rows[0];

    return res.json({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      phone: u.phone,
      address: u.address,
      district: u.district,
      sector: u.sector,
      cell: u.cell,
      village: u.village,
      avatar: u.avatar_url,
      status: u.status || 'Active',
      mustChangePassword: Number(u.must_change_password) === 1,
      recoveryEmail: u.recovery_email || '',
      recoveryPhone: u.recovery_phone || '',
      lastLogin: u.last_login
    });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { fullName, phone, avatarUrl, address } = req.body;

    await db.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           avatar_url = COALESCE(?, avatar_url),
           address = COALESCE(?, address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fullName || null, phone || null, avatarUrl || null, address || null, req.user.id]
    );

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      role: req.user.role,
      action: 'PROFILE_UPDATE',
      details: `User updated personal profile details`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const userRes = await db.query(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newHash, req.user.id]
    );

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      role: req.user.role,
      action: 'PASSWORD_CHANGE',
      details: 'Password successfully modified by authenticated user',
      ipAddress: req.ip
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update password' });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  try {
    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        userName: req.user.fullName,
        role: req.user.role,
        action: 'USER_LOGOUT',
        details: 'User logged out and session terminated',
        ipAddress: req.ip
      });
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Logout failed' });
  }
}
