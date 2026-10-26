import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { sendAdmissionFeedbackEmail, sendAdmissionReceivedEmail } from '../services/emailService';
import { isValidProfileImage } from '../utils/profileImage';

export async function getAdmissions(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `SELECT * FROM admissions WHERE 1=1`;
    const params: any[] = [];

    // If parent/student, only see applications submitted by them or matching their email
    if (userRole === 'parent' || userRole === 'student') {
      query += ` AND (user_id = ? OR LOWER(parent_email) = LOWER(?))`;
      params.push(userId, req.user?.email || '');
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);

    const admissions = result.rows.map(row => ({
      id: row.id,
      applicantName: row.applicant_name,
      gender: row.gender,
      dob: row.dob,
      applyingGrade: row.applying_grade,
      level: row.level,
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      parentEmail: row.parent_email || '',
      photoUrl: row.photo_url || undefined,
      district: row.district || 'Gatsibo',
      sector: row.sector || 'Kabarore',
      cell: row.cell || 'Simbwa',
      village: row.village || 'Kibondo',
      previousSchool: row.previous_school || '',
      submissionDate: (row.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
      status: row.status,
      assignedStream: row.assigned_stream || undefined,
      adminResponse: row.admin_response || undefined,
      adminResponseDate: row.admin_response_date || undefined,
      adminResponder: row.admin_responder || undefined,
    }));

    return res.json(admissions);
  } catch (error: any) {
    console.error('Error fetching admissions:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admissions' });
  }
}

export async function submitAdmission(req: AuthRequest, res: Response) {
  try {
    // User MUST be authenticated as requested!
    if (!req.user) {
      return res.status(401).json({ error: 'You must sign in or register an account before submitting an admission application.' });
    }

    const {
      applicantName,
      gender,
      dob,
      applyingGrade,
      level,
      parentName,
      parentPhone,
      parentEmail,
      photoUrl,
      district,
      sector,
      cell,
      village,
      previousSchool
    } = req.body;

    if (!applicantName || !gender || !dob || !applyingGrade || !parentName || !parentPhone) {
      return res.status(400).json({ error: 'Applicant name, gender, birth date, grade, parent name, and phone are required.' });
    }
    if (!isValidProfileImage(photoUrl, 4 * 1024 * 1024)) {
      return res.status(400).json({ error: 'A JPEG, PNG, or WebP pupil photo of 4 MB or smaller is required' });
    }

    const admissionId = `adm-${Date.now()}`;
    const calculatedLevel = level || (applyingGrade.includes('Nursery') ? 'Nursery' : ['Primary 1', 'Primary 2', 'Primary 3'].includes(applyingGrade) ? 'Lower Primary' : 'Upper Primary');
    const targetEmail = parentEmail ? parentEmail.trim().toLowerCase() : req.user.email;

    await db.query(
      `INSERT INTO admissions (
        id, user_id, applicant_name, gender, dob, applying_grade, level,
        parent_name, parent_phone, parent_email, photo_url, district, sector, cell, village,
        previous_school, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)`,
      [
        admissionId,
        req.user.id,
        applicantName.trim(),
        gender,
        dob,
        applyingGrade,
        calculatedLevel,
        parentName.trim(),
        parentPhone.trim(),
        targetEmail,
        photoUrl,
        district || 'Gatsibo',
        sector || 'Kabarore',
        cell || 'Simbwa',
        village || 'Kibondo',
        previousSchool || 'N/A'
      ]
    );

    // Notify administrators by recording an audit log
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      userEmail: req.user.email,
      role: req.user.role,
      action: 'ADMISSION_SUBMIT',
      details: `New online admission application submitted for pupil ${applicantName} (${applyingGrade}) by parent ${parentName} (${targetEmail})`,
      ipAddress: req.ip
    });

    // Send immediate confirmation feedback email to parent's email address
    let emailStatus = { success: false, message: '' };
    if (targetEmail) {
      emailStatus = await sendAdmissionReceivedEmail({
        toEmail: targetEmail,
        parentName: parentName.trim(),
        pupilName: applicantName.trim(),
        grade: applyingGrade,
        admissionId,
        district,
        sector,
        cell,
        village
      });
    }

    // In-app notification for user
    const notifId = `notif-${Date.now()}`;
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'info', 0, CURRENT_TIMESTAMP)`,
      [
        notifId,
        req.user.id,
        `Application Submitted: ${applicantName}`,
        `Your admission application for ${applicantName} (${applyingGrade}) has been received (Ref: ${admissionId}). A confirmation email has been dispatched to ${targetEmail}.`
      ]
    );

    return res.status(201).json({
      message: `Admission application submitted successfully. Official confirmation feedback email dispatched to ${targetEmail}.`,
      admissionId,
      status: 'Pending',
      emailSent: emailStatus.success,
      recipientEmail: targetEmail
    });
  } catch (error: any) {
    console.error('Error submitting admission:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit admission application' });
  }
}

export async function answerAdmission(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { decision, answerText, assignedStream } = req.body;

    if (!decision || !['Approved', 'Rejected', 'Under Review'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision (Approved, Rejected, Under Review) is required' });
    }

    const admRes = await db.query(`SELECT * FROM admissions WHERE id = ?`, [id]);
    if (admRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission application not found' });
    }

    const adm = admRes.rows[0];
    if (decision === 'Approved' && !isValidProfileImage(adm.photo_url, 4 * 1024 * 1024)) {
      return res.status(400).json({ error: 'This application has no valid pupil photo. Submit a new application with a JPEG, PNG, or WebP photo before approval.' });
    }
    const responder = `${req.user?.fullName || 'Office of Head Teacher'} (${req.user?.role || 'admin'})`;
    const today = new Date().toISOString().split('T')[0];
    const streamToAssign = assignedStream || adm.assigned_stream || 'Alpha';

    await db.query(
      `UPDATE admissions
       SET status = ?,
           assigned_stream = COALESCE(?, assigned_stream),
           admin_response = ?,
           admin_response_date = ?,
           admin_responder = ?
       WHERE id = ?`,
      [decision, streamToAssign, answerText || '', today, responder, id]
    );

    // If decision is Approved, automatically enroll the pupil into students table if not already enrolled!
    if (decision === 'Approved') {
      const existingStudent = await db.query(
        `SELECT id FROM students WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)`,
        [adm.applicant_name.split(' ')[0], adm.applicant_name.split(' ').slice(1).join(' ')]
      );

      if (existingStudent.rows.length === 0) {
        const studentId = `std-${Date.now()}`;
        const nameParts = adm.applicant_name.trim().split(' ');
        const firstName = nameParts[0] || adm.applicant_name;
        const lastName = nameParts.slice(1).join(' ') || 'Pupil';
        const admissionNo = `SSP-2026-${adm.applying_grade.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

        // Parent record
        let parentId: string | null = null;
        if (adm.parent_name) {
          parentId = `par-${Date.now()}`;
          await db.query(
            `INSERT INTO parents (id, user_id, full_name, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)`,
            [parentId, adm.user_id || null, adm.parent_name, adm.parent_phone, adm.parent_email || '', `${adm.village}, ${adm.cell}`]
          );
        }

        const classRes = await db.query(`SELECT id FROM classes WHERE name LIKE ? LIMIT 1`, [`%${adm.applying_grade}%`]);
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
            firstName,
            lastName,
            adm.gender,
            adm.dob,
            classId,
            parentId,
            adm.level,
            adm.applying_grade,
            streamToAssign,
            today,
            `${adm.village} Village, ${adm.cell} Cell`,
            adm.photo_url
          ]
        );
      }
    }

    // 1. Send Official Email Feedback to Parent's Email!
    const emailTarget = adm.parent_email;
    let emailResult = { success: false, message: 'No email found' };
    if (emailTarget) {
      emailResult = await sendAdmissionFeedbackEmail({
        toEmail: emailTarget,
        parentName: adm.parent_name,
        pupilName: adm.applicant_name,
        grade: adm.applying_grade,
        decision,
        feedbackText: answerText || (decision === 'Approved' ? 'Your child has met the admission standards and is accepted.' : 'Thank you for your application.'),
        assignedStream: `${adm.applying_grade} ${streamToAssign}`,
        responderName: responder
      });
    }

    // 2. Also record an in-app notification in notifications table for the parent
    if (adm.user_id) {
      const notifId = `notif-${Date.now()}`;
      await db.query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          notifId,
          adm.user_id,
          `Admission Feedback: ${adm.applicant_name} (${decision})`,
          `Official decision for ${adm.applicant_name} (${adm.applying_grade}): ${decision}. Feedback: "${answerText || 'Decision recorded'}". A full copy has been dispatched to ${emailTarget || 'your account email'}.`,
          decision === 'Approved' ? 'success' : decision === 'Rejected' ? 'error' : 'info'
        ]
      );
    }

    // 3. Security Audit Log
    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'ADMISSION_REVIEW_WITH_EMAIL_FEEDBACK',
      details: `Processed admission #${id} for ${adm.applicant_name}: ${decision}. Official feedback email dispatched to parent ${emailTarget}.`,
      ipAddress: req.ip
    });

    return res.json({
      message: `Admission successfully marked as ${decision}. Official decision feedback email dispatched to ${emailTarget}.`,
      status: decision,
      emailSent: emailResult.success,
      recipientEmail: emailTarget
    });
  } catch (error: any) {
    console.error('Error answering admission:', error);
    return res.status(500).json({ error: error.message || 'Failed to review admission' });
  }
}

export async function updateAdmission(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { applicantName, parentName, parentPhone, parentEmail, applyingGrade, level, gender, notes, status, assignedStream } = req.body;

    const admRes = await db.query(`SELECT * FROM admissions WHERE id = ?`, [id]);
    if (admRes.rows.length === 0) {
      return res.status(404).json({ error: 'Admission application not found' });
    }

    const current = admRes.rows[0];
    await db.query(
      `UPDATE admissions
       SET applicant_name = COALESCE(?, applicant_name),
           parent_name = COALESCE(?, parent_name),
           parent_phone = COALESCE(?, parent_phone),
           parent_email = COALESCE(?, parent_email),
           applying_grade = COALESCE(?, applying_grade),
           level = COALESCE(?, level),
           gender = COALESCE(?, gender),
           notes = COALESCE(?, notes),
           status = COALESCE(?, status),
           assigned_stream = COALESCE(?, assigned_stream)
       WHERE id = ?`,
      [
        applicantName || null,
        parentName || null,
        parentPhone || null,
        parentEmail || null,
        applyingGrade || null,
        level || null,
        gender || null,
        notes || null,
        status || null,
        assignedStream || null,
        id
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'ADMISSION_UPDATE',
      details: `Updated details for admission application #${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Admission application updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update admission' });
  }
}

export async function deleteAdmission(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM admissions WHERE id = ?`, [id]);
    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Administrator',
      role: req.user?.role || 'admin',
      action: 'ADMISSION_DELETE',
      details: `Deleted admission application #${id}`,
      ipAddress: req.ip
    });
    return res.json({ message: 'Admission application deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete admission' });
  }
}
