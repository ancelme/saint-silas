import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';

export async function getLibraryBooks(req: AuthRequest, res: Response) {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM library_books WHERE 1=1`;
    const params: any[] = [];

    if (category && category !== 'All') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY title ASC`;

    const result = await db.query(query, params);
    const books = result.rows.map(b => ({
      id: b.id,
      isbn: b.isbn || '',
      title: b.title,
      author: b.author,
      category: b.category,
      targetLevel: b.target_level || 'All',
      totalCopies: Number(b.total_copies || 1),
      availableCopies: Number(b.available_copies || 0),
      location: b.location || 'Shelf A1',
      createdAt: b.created_at
    }));

    return res.json(books);
  } catch (error: any) {
    console.error('Error fetching library books:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch library books' });
  }
}

export async function createLibraryBook(req: AuthRequest, res: Response) {
  try {
    const { isbn, title, author, category, targetLevel, totalCopies, location } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ error: 'Title, author, and category are required' });
    }

    const id = `bk-${Date.now()}`;
    const copies = Number(totalCopies) || 1;

    await db.query(
      `INSERT INTO library_books (id, isbn, title, author, category, target_level, total_copies, available_copies, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        isbn || '',
        title.trim(),
        author.trim(),
        category,
        targetLevel || 'All',
        copies,
        copies,
        location || 'Main Shelf'
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Librarian',
      role: req.user?.role || 'librarian',
      action: 'LIBRARY_BOOK_ADDED',
      details: `Added new book "${title}" (${copies} copies) to library catalog`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Book cataloged successfully',
      book: {
        id,
        isbn: isbn || '',
        title,
        author,
        category,
        targetLevel: targetLevel || 'All',
        totalCopies: copies,
        availableCopies: copies,
        location: location || 'Main Shelf'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to add library book' });
  }
}

export async function getBorrowingRecords(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(
      `SELECT br.*, lb.title as book_title
       FROM borrowing_records br
       LEFT JOIN library_books lb ON br.book_id = lb.id
       ORDER BY br.created_at DESC`
    );

    const records = result.rows.map(r => ({
      id: r.id,
      bookId: r.book_id,
      bookTitle: r.book_title || 'Library Book',
      borrowerId: r.borrower_id,
      borrowerName: r.borrower_name,
      borrowerType: r.borrower_type || 'Student',
      borrowDate: r.borrow_date,
      dueDate: r.due_date,
      returnDate: r.return_date,
      status: r.status,
      fineAmount: Number(r.fine_amount || 0),
      issuedBy: r.issued_by
    }));

    return res.json(records);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch borrowing records' });
  }
}

export async function borrowBook(req: AuthRequest, res: Response) {
  try {
    const { bookId, borrowerName, borrowerType, days = 14 } = req.body;

    if (!bookId || !borrowerName) {
      return res.status(400).json({ error: 'Book ID and borrower name are required' });
    }

    const bookRes = await db.query(`SELECT id, title, available_copies FROM library_books WHERE id = ?`, [bookId]);
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookRes.rows[0];
    if (Number(book.available_copies) <= 0) {
      return res.status(400).json({ error: 'No copies available for checkout' });
    }

    const id = `borrow-${Date.now()}`;
    const borrowDate = new Date().toISOString().split('T')[0];
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + Number(days));
    const dueDate = dueDateObj.toISOString().split('T')[0];

    // Decrement available copies
    await db.query(`UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?`, [bookId]);

    // Insert borrowing record
    await db.query(
      `INSERT INTO borrowing_records (id, book_id, borrower_name, borrower_type, borrow_date, due_date, status, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, 'Borrowed', ?)`,
      [
        id,
        bookId,
        borrowerName.trim(),
        borrowerType || 'Student',
        borrowDate,
        dueDate,
        req.user?.fullName || 'Librarian'
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Librarian',
      role: req.user?.role || 'librarian',
      action: 'LIBRARY_BOOK_CHECKOUT',
      details: `Checked out "${book.title}" to ${borrowerName} (${borrowerType || 'Student'}), due on ${dueDate}`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: `Book "${book.title}" successfully issued to ${borrowerName}`,
      recordId: id,
      dueDate
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to checkout book' });
  }
}

export async function returnBook(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const recordRes = await db.query(
      `SELECT br.*, lb.title as book_title
       FROM borrowing_records br
       LEFT JOIN library_books lb ON br.book_id = lb.id
       WHERE br.id = ?`,
      [id]
    );

    if (recordRes.rows.length === 0) {
      return res.status(404).json({ error: 'Borrowing record not found' });
    }

    const record = recordRes.rows[0];
    if (record.status === 'Returned') {
      return res.status(400).json({ error: 'Book already marked as returned' });
    }

    const returnDate = new Date().toISOString().split('T')[0];

    // Increment available copies
    if (record.book_title) {
      await db.query(`UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?`, [record.book_id]);
    }

    // Update borrowing record
    await db.query(
      `UPDATE borrowing_records SET return_date = ?, status = 'Returned' WHERE id = ?`,
      [returnDate, id]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Librarian',
      role: req.user?.role || 'librarian',
      action: 'LIBRARY_BOOK_RETURNED',
      details: `Returned "${record.book_title || 'deleted library book'}" from ${record.borrower_name}`,
      ipAddress: req.ip
    });

    const bookTitle = record.book_title || 'Deleted library book';
    const shelfMessage = record.book_title ? ' and restored to shelf' : '';
    return res.json({ message: `Book "${bookTitle}" successfully returned${shelfMessage}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to return book' });
  }
}

export async function getLibrarySummary(req: AuthRequest, res: Response) {
  try {
    const booksRes = await db.query(`SELECT SUM(total_copies) as total_books, SUM(available_copies) as available_books FROM library_books`);
    const borrowedRes = await db.query(`SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'Borrowed'`);
    const overdueRes = await db.query(`SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'Borrowed' AND due_date < CURRENT_DATE`);

    return res.json({
      totalBooks: Number(booksRes.rows[0]?.total_books || 0),
      availableBooks: Number(booksRes.rows[0]?.available_books || 0),
      activeLoans: Number(borrowedRes.rows[0]?.count || 0),
      overdueLoans: Number(overdueRes.rows[0]?.count || 0)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to generate library summary' });
  }
}

export async function updateLibraryBook(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, author, category, targetLevel, totalCopies, availableCopies, location, isbn } = req.body;

    const bookRes = await db.query(`SELECT * FROM library_books WHERE id = ?`, [id]);
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Library book not found' });
    }

    await db.query(
      `UPDATE library_books
       SET title = COALESCE(?, title),
           author = COALESCE(?, author),
           category = COALESCE(?, category),
           target_level = COALESCE(?, target_level),
           total_copies = COALESCE(?, total_copies),
           available_copies = COALESCE(?, available_copies),
           location = COALESCE(?, location),
           isbn = COALESCE(?, isbn)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        author ? author.trim() : null,
        category || null,
        targetLevel || null,
        totalCopies !== undefined ? Number(totalCopies) : null,
        availableCopies !== undefined ? Number(availableCopies) : null,
        location || null,
        isbn || null,
        id
      ]
    );

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Librarian',
      role: req.user?.role || 'librarian',
      action: 'LIBRARY_BOOK_UPDATE',
      details: `Updated book details for ${id}`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Library book updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update book' });
  }
}

export async function deleteLibraryBook(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const bookRes = await db.query(`SELECT * FROM library_books WHERE id = ?`, [id]);
    if (bookRes.rows.length === 0) {
      return res.json({ message: 'Book deleted from library successfully' });
    }

    const activeLoans = await db.query(
      `SELECT COUNT(*) AS count FROM borrowing_records WHERE book_id = ? AND status = 'Borrowed'`,
      [id],
    );
    if (Number(activeLoans.rows[0]?.count || 0) > 0) {
      return res.status(409).json({ error: 'This book has active borrowings. Record all returns before deleting it.' });
    }

    await db.query(`DELETE FROM library_books WHERE id = ?`, [id]);

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName || 'Librarian',
      role: req.user?.role || 'librarian',
      action: 'LIBRARY_BOOK_DELETE',
      details: `Deleted book ${bookRes.rows[0].title} from library`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Book deleted from library successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete book' });
  }
}
