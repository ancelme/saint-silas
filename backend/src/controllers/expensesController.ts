import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getExpenses(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(`SELECT * FROM expenses ORDER BY date DESC, created_at DESC`);
    const expenses = result.rows.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount || 0),
      date: e.date,
      receiptNo: e.receipt_no || '',
      recordedBy: e.recorded_by || 'Bursar Office',
      notes: e.notes || '',
      createdAt: e.created_at
    }));

    return res.json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch expenses' });
  }
}

export async function createExpense(req: AuthRequest, res: Response) {
  try {
    const { title, category, amount, date, receiptNo, notes } = req.body;

    if (!title || !category || !amount) {
      return res.status(400).json({ error: 'Title, category, and amount are required' });
    }

    const id = `exp-${Date.now()}`;
    const expenseDate = date || new Date().toISOString().split('T')[0];
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Expense amount must be greater than zero' });
    }

    await db.query(
      `INSERT INTO expenses (id, title, category, amount, date, receipt_no, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title.trim(),
        category,
        numAmount,
        expenseDate,
        receiptNo || `REC-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        req.user?.fullName || 'Accountant',
        notes || ''
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Accountant',
      role: req.user?.role || 'accountant',
      action: 'EXPENSE_RECORDED',
      details: `Recorded school operational expense "${title}" (${category}): ${numAmount.toLocaleString()} RWF`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Operational expense recorded successfully',
      expense: {
        id,
        title,
        category,
        amount: numAmount,
        date: expenseDate,
        receiptNo: receiptNo || '',
        recordedBy: req.user?.fullName || 'Accountant'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to record expense' });
  }
}
