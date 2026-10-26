import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getFees(req: AuthRequest, res: Response) {
  let feeApplied = false;
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = `
      SELECT f.*, s.first_name, s.last_name, s.grade, s.admission_number, p.phone as parent_phone,
             (SELECT payment_method FROM payments WHERE fee_id = f.id AND status = 'Completed' ORDER BY created_at DESC LIMIT 1) as latest_payment_method
      FROM fees f
      JOIN students s ON f.student_id = s.id
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
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await db.query(query, params);

    const invoices = result.rows.map(row => ({
      id: row.id,
      invoiceNumber: `INV-${row.id.slice(-6).toUpperCase()}`,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      grade: row.grade,
      term: 'Term 2',
      academicYear: '2026',
      amountTotal: Number(row.amount_total),
      amountPaid: Number(row.amount_paid),
      balance: Number(row.balance),
      dueDate: row.due_date || '2026-06-30',
      status: row.status,
      paymentMethod: row.latest_payment_method || undefined,
      items: [
        { description: 'Term 2 Tuition Fee', amount: Number(row.amount_total) * 0.7 },
        { description: 'Daily Feeding Program (Hot Lunch & Milk)', amount: Number(row.amount_total) * 0.3 }
      ]
    }));

    return res.json(invoices);
  } catch (error: any) {
    console.error('Error fetching fees:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch fee invoices' });
  }
}

export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const { invoiceId, amount, paymentMethod, referenceNo, phoneNumber } = req.body;
    const supportedPaymentMethods = ['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Cash'];
    const paymentAmount = Number(amount);

    if (!invoiceId || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invoice ID and valid positive amount are required' });
    }
    if (!supportedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Payment method must be one of: ${supportedPaymentMethods.join(', ')}` });
    }
    if (referenceNo !== undefined && (typeof referenceNo !== 'string' || referenceNo.length > 100)) {
      return res.status(400).json({ error: 'Payment reference must be 100 characters or fewer' });
    }
    if (phoneNumber !== undefined && (typeof phoneNumber !== 'string' || phoneNumber.length > 50)) {
      return res.status(400).json({ error: 'Payer phone number must be 50 characters or fewer' });
    }

    const feeRes = await db.query(`SELECT * FROM fees WHERE id = ?`, [invoiceId]);
    if (feeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee invoice not found' });
    }

    const fee = feeRes.rows[0];
    const balance = Math.max(0, Number(fee.amount_total) - Number(fee.amount_paid));
    if (paymentAmount > balance) {
      return res.status(400).json({ error: `Payment exceeds the remaining balance of ${balance} RWF` });
    }

    const newPaid = Number(fee.amount_paid) + paymentAmount;
    const newBalance = Math.max(0, Number(fee.amount_total) - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

    // Update fee record
    await db.query(
      `UPDATE fees SET amount_paid = ?, balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newPaid, newBalance, newStatus, invoiceId]
    );

    // Update student fee_status
    await db.query(`UPDATE students SET fee_status = ? WHERE id = ?`, [newStatus, fee.student_id]);

    // Insert payment record
    const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ref = typeof referenceNo === 'string' && referenceNo.trim()
      ? referenceNo.trim()
      : `SSP-${Date.now()}`;

    await db.query(
      `INSERT INTO payments (id, fee_id, student_id, amount, payment_method, reference_no, phone_number, status, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?)`,
      [
        paymentId,
        invoiceId,
        fee.student_id,
        paymentAmount,
        paymentMethod,
        ref,
        phoneNumber || '',
        req.user?.id || 'sys'
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Accountant',
      role: req.user?.role || 'accountant',
      action: 'PAYMENT_RECORD',
      details: `Recorded verified payment of ${paymentAmount} RWF for invoice ${invoiceId} (Ref: ${ref}) via ${paymentMethod}`,
      ipAddress: req.ip
    });

    return res.json({
      message: 'Payment recorded successfully',
      paymentId,
      referenceNo: ref,
      paymentMethod,
      amountPaid: newPaid,
      newBalance,
      status: newStatus
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
}

export async function submitParentPaymentRequest(req: AuthRequest, res: Response) {
  try {
    const { invoiceId, amount, paymentMethod, referenceNo, phoneNumber } = req.body;
    const supportedPaymentMethods = ['MTN Mobile Money', 'Airtel Money', 'Bank Transfer', 'Cash'];
    const paymentAmount = Number(amount);
    if (!invoiceId || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invoice and valid positive payment amount are required' });
    }
    if (!supportedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Payment method must be one of: ${supportedPaymentMethods.join(', ')}` });
    }
    if (referenceNo !== undefined && (typeof referenceNo !== 'string' || referenceNo.length > 100)) {
      return res.status(400).json({ error: 'Payment reference must be 100 characters or fewer' });
    }
    if (phoneNumber !== undefined && (typeof phoneNumber !== 'string' || phoneNumber.length > 50)) {
      return res.status(400).json({ error: 'Payer phone number must be 50 characters or fewer' });
    }

    const feeRes = await db.query(
      `SELECT f.* FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN parents p ON p.id = s.parent_id
       WHERE f.id = ? AND (
         p.user_id = ? OR EXISTS (
           SELECT 1 FROM parent_students ps
           JOIN parents linked_parent ON linked_parent.id = ps.parent_id
           WHERE ps.student_id = s.id AND linked_parent.user_id = ?
         )
       )`,
      [invoiceId, req.user?.id, req.user?.id],
    );
    if (!feeRes.rows.length) {
      return res.status(404).json({ error: 'Invoice not found for a pupil linked to your account' });
    }

    const fee = feeRes.rows[0];
    const balance = Math.max(0, Number(fee.amount_total) - Number(fee.amount_paid));
    const pendingRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS pending_amount
       FROM payments WHERE fee_id = ? AND status = 'Pending Verification'`,
      [invoiceId],
    );
    const availableBalance = Math.max(0, balance - Number(pendingRes.rows[0]?.pending_amount || 0));
    if (paymentAmount > availableBalance) {
      return res.status(400).json({ error: `Payment exceeds the available balance of ${availableBalance} RWF` });
    }

    const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const reference = typeof referenceNo === 'string' && referenceNo.trim()
      ? referenceNo.trim()
      : `PARENT-${Date.now()}`;
    await db.query(
      `INSERT INTO payments (id, fee_id, student_id, amount, payment_method, reference_no, phone_number, status, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending Verification', ?)`,
      [
        paymentId,
        invoiceId,
        fee.student_id,
        paymentAmount,
        paymentMethod,
        reference,
        phoneNumber || '',
        req.user?.id || null,
      ],
    );

    return res.status(201).json({
      message: 'Payment details sent to the school for verification. The fee balance will change after confirmation.',
      paymentRequestId: paymentId,
      status: 'Pending Verification',
    });
  } catch (error: any) {
    console.error('Error submitting parent payment request:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit payment details' });
  }
}

export async function getPaymentRequests(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(
      `SELECT p.id, p.fee_id, p.student_id, p.amount, p.payment_method, p.reference_no,
              p.phone_number, p.status, p.created_at, s.first_name, s.last_name, s.grade,
              u.full_name AS parent_name
       FROM payments p
       JOIN students s ON s.id = p.student_id
       LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.status = 'Pending Verification'
       ORDER BY p.created_at ASC`,
    );
    return res.json(result.rows.map(row => ({
      id: row.id,
      invoiceId: row.fee_id,
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      grade: row.grade,
      parentName: row.parent_name || 'Parent / Guardian',
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      referenceNo: row.reference_no,
      phoneNumber: row.phone_number || '',
      submittedAt: row.created_at,
    })));
  } catch (error: any) {
    console.error('Error fetching pending payment requests:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch payment requests' });
  }
}

export async function reviewPaymentRequest(req: AuthRequest, res: Response) {
  try {
    const { decision } = req.body;
    if (!['Verified', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be Verified or Rejected' });
    }
    const paymentRes = await db.query(
      `SELECT * FROM payments WHERE id = ? AND status = 'Pending Verification'`,
      [req.params.id],
    );
    if (!paymentRes.rows.length) {
      return res.status(404).json({ error: 'Pending payment request not found' });
    }

    const payment = paymentRes.rows[0];
    if (decision === 'Rejected') {
      const result = await db.query(
        `UPDATE payments SET status = 'Rejected' WHERE id = ? AND status = 'Pending Verification'`,
        [payment.id],
      );
      if (!result.affectedRows) {
        return res.status(409).json({ error: 'This payment request has already been reviewed' });
      }
      return res.json({ message: 'Payment request rejected', status: 'Rejected' });
    }

    const claim = await db.query(
      `UPDATE payments SET status = 'Processing Verification' WHERE id = ? AND status = 'Pending Verification'`,
      [payment.id],
    );
    if (!claim.affectedRows) {
      return res.status(409).json({ error: 'This payment request has already been reviewed' });
    }

    try {
      const feeRes = await db.query(`SELECT * FROM fees WHERE id = ?`, [payment.fee_id]);
      if (!feeRes.rows.length) {
        await db.query(`UPDATE payments SET status = 'Pending Verification' WHERE id = ?`, [payment.id]);
        return res.status(404).json({ error: 'Fee invoice for this payment request no longer exists' });
      }
      const fee = feeRes.rows[0];
      if (Number(payment.amount) > Number(fee.amount_total) - Number(fee.amount_paid)) {
        await db.query(`UPDATE payments SET status = 'Pending Verification' WHERE id = ?`, [payment.id]);
        return res.status(409).json({ error: 'This request exceeds the current invoice balance. Reject it or contact the parent.' });
      }

      const feeUpdate = await db.query(
        `UPDATE fees
         SET amount_paid = amount_paid + ?,
             balance = amount_total - (amount_paid + ?),
             status = CASE WHEN amount_total - (amount_paid + ?) <= 0 THEN 'Paid' ELSE 'Partial' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND amount_total - amount_paid >= ?`,
        [Number(payment.amount), Number(payment.amount), Number(payment.amount), payment.fee_id, Number(payment.amount)],
      );
      if (!feeUpdate.affectedRows) {
        await db.query(`UPDATE payments SET status = 'Pending Verification' WHERE id = ?`, [payment.id]);
        return res.status(409).json({ error: 'The invoice balance changed. Refresh and review the payment again.' });
      }
      feeApplied = true;
      const updatedFeeRes = await db.query(
        `SELECT amount_paid, balance, status FROM fees WHERE id = ?`,
        [payment.fee_id],
      );
      const updatedFee = updatedFeeRes.rows[0];
      const updatedStatus = updatedFee.status as 'Paid' | 'Partial';
      await db.query(`UPDATE students SET fee_status = ? WHERE id = ?`, [updatedStatus, payment.student_id]);
      await db.query(
        `UPDATE payments SET status = 'Completed' WHERE id = ? AND status = 'Processing Verification'`,
        [payment.id],
      );

      await recordAuditLog({
        userId: req.user?.id,
        userName: req.user?.fullName || 'Accountant',
        role: req.user?.role || 'accountant',
        action: 'PAYMENT_REQUEST_VERIFIED',
        details: `Verified parent-submitted payment of ${payment.amount} RWF for invoice ${payment.fee_id} (Ref: ${payment.reference_no}) via ${payment.payment_method}`,
        ipAddress: req.ip,
      });

      return res.json({
        message: 'Payment verified and added to the invoice',
        status: 'Completed',
        invoiceId: payment.fee_id,
        amountPaid: Number(updatedFee.amount_paid),
        newBalance: Number(updatedFee.balance),
        feeStatus: updatedStatus,
      });
    } catch (error) {
      if (!feeApplied) {
        await db.query(`UPDATE payments SET status = 'Pending Verification' WHERE id = ? AND status = 'Processing Verification'`, [payment.id]);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error reviewing parent payment request:', error);
    return res.status(500).json({ error: error.message || 'Failed to review payment request' });
  }
}

export async function createFeeInvoice(req: AuthRequest, res: Response) {
  try {
    const { studentId, title, amountTotal, dueDate } = req.body;

    if (!studentId || !title || !amountTotal) {
      return res.status(400).json({ error: 'Student ID, invoice title, and total amount are required' });
    }

    const id = `fee-${Date.now()}`;
    const amount = Number(amountTotal);

    await db.query(
      `INSERT INTO fees (id, student_id, term_id, title, amount_total, amount_paid, balance, status, due_date)
       VALUES (?, ?, 'term-2026-2', ?, ?, 0.0, ?, 'Pending', ?)`,
      [id, studentId, title, amount, amount, dueDate || '2026-06-30']
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Accountant',
      role: req.user?.role || 'accountant',
      action: 'FEE_INVOICE_CREATE',
      details: `Created new tuition fee invoice "${title}" for amount ${amount} RWF`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Fee invoice created successfully',
      invoice: {
        id,
        studentId,
        title,
        amountTotal: amount,
        amountPaid: 0,
        balance: amount,
        status: 'Pending',
        dueDate: dueDate || '2026-06-30'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create fee invoice' });
  }
}

export async function updateFeeInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, amountTotal, dueDate, status } = req.body;

    const feeRes = await db.query(`SELECT * FROM fees WHERE id = ?`, [id]);
    if (feeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fee invoice not found' });
    }

    const currentFee = feeRes.rows[0];
    const newTotal = amountTotal !== undefined ? Number(amountTotal) : Number(currentFee.amount_total);
    const paid = Number(currentFee.amount_paid);
    const newBalance = Math.max(0, newTotal - paid);
    const newStatus = status || (newBalance === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');

    await db.query(
      `UPDATE fees
       SET title = COALESCE(?, title),
           amount_total = ?,
           balance = ?,
           status = ?,
           due_date = COALESCE(?, due_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title || null, newTotal, newBalance, newStatus, dueDate || null, id]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Accountant',
      role: req.user?.role || 'accountant',
      action: 'FEE_INVOICE_UPDATE',
      details: `Updated invoice ${id}: total ${newTotal} RWF, balance ${newBalance} RWF`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Fee invoice updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update fee invoice' });
  }
}

export async function deleteFeeInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const feeRes = await db.query(`SELECT * FROM fees WHERE id = ?`, [id]);
    if (feeRes.rows.length === 0) {
      return res.json({ message: 'Fee invoice deleted successfully' });
    }

    await db.query(`DELETE FROM payments WHERE fee_id = ?`, [id]);
    await db.query(`DELETE FROM fees WHERE id = ?`, [id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Accountant',
      role: req.user?.role || 'accountant',
      action: 'FEE_INVOICE_DELETE',
      details: `Deleted fee invoice ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Fee invoice deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete fee invoice' });
  }
}
