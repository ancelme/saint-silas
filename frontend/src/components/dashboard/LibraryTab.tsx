import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpen, Download, Library, Plus, RotateCcw,
  Search, Trash2, UserPlus, Users, X
} from 'lucide-react';
import { BorrowingRecord, LibraryBook, Student } from '../../types';
import {
  borrowBook, createLibraryBook, deleteLibraryBook, fetchBorrowingRecords,
  fetchLibraryBooks, fetchStudents, returnBook
} from '../../services/api';
import { INITIAL_BOOKS } from '../../data/mockData';

interface LibraryTabProps {
  managementMode?: boolean;
}

type LibraryPage = 'books' | 'members' | 'borrowing' | 'returns' | 'overdue' | 'reports';

interface LibraryMember {
  id: string;
  name: string;
  registrationNo: string;
  type: string;
  grade: string;
  status: 'Active' | 'Suspended';
}

const pages: { id: LibraryPage; label: string; icon: React.ElementType }[] = [
  { id: 'books', label: 'Books Management', icon: BookOpen },
  { id: 'members', label: 'Library Member Management', icon: Users },
  { id: 'borrowing', label: 'Borrowing Management', icon: Library },
  { id: 'returns', label: 'Book Returns Management', icon: RotateCcw },
  { id: 'overdue', label: 'Overdue Books Management', icon: AlertTriangle },
  { id: 'reports', label: 'Library Reports Management', icon: Download },
];

export const LibraryTab: React.FC<LibraryTabProps> = ({ managementMode = false }) => {
  const [activePage, setActivePage] = useState<LibraryPage>('books');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [bookForm, setBookForm] = useState({ isbn: '', title: '', author: '', category: 'Textbook', targetLevel: 'All', totalCopies: 1, location: 'Main Shelf' });
  const [borrowForm, setBorrowForm] = useState({ bookId: '', borrowerName: '', borrowerType: 'Student' as 'Student' | 'Teacher' | 'Staff', days: 14 });
  const [memberForm, setMemberForm] = useState({ name: '', registrationNo: '', type: 'Student', grade: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookData, borrowingData, studentData] = await Promise.all([
        fetchLibraryBooks(), fetchBorrowingRecords(), fetchStudents()
      ]);
      setBooks(bookData.length ? bookData : INITIAL_BOOKS);
      setBorrowings(borrowingData);
      setStudents(studentData);
    } catch (requestError) {
      setBooks(INITIAL_BOOKS);
      setError(requestError instanceof Error ? requestError.message : 'Library data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    try {
      const stored = localStorage.getItem('st-silas-library-members');
      if (stored) setMembers(JSON.parse(stored));
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    if (!students.length) return;
    setMembers(current => {
      const studentMembers = students.map(student => ({
        id: student.id,
        name: student.name,
        registrationNo: String(student.admissionNo || student.id).toUpperCase(),
        type: 'Student',
        grade: student.grade || '',
        status: 'Active' as const
      }));
      const ids = new Set(current.map(member => member.id));
      return [...studentMembers, ...current.filter(member => !ids.has(member.id))];
    });
  }, [students]);

  const saveMembers = (next: LibraryMember[]) => {
    setMembers(next);
    localStorage.setItem('st-silas-library-members', JSON.stringify(next.filter(member => member.id.startsWith('member-'))));
  };

  const overdue = borrowings.filter(record =>
    record.status === 'Borrowed' && new Date(record.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );
  const activeLoans = borrowings.filter(record => record.status === 'Borrowed');
  const returned = borrowings.filter(record => record.status === 'Returned');

  const filteredBooks = useMemo(() => books.filter(book =>
    `${book.title} ${book.author} ${book.isbn} ${book.category}`.toLowerCase().includes(search.toLowerCase())
  ), [books, search]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const addBook = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createLibraryBook({ ...bookForm, totalCopies: Number(bookForm.totalCopies) });
      setShowBookModal(false);
      setBookForm({ isbn: '', title: '', author: '', category: 'Textbook', targetLevel: 'All', totalCopies: 1, location: 'Main Shelf' });
      flash('Book added to the library catalog.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Book could not be added.');
    } finally {
      setSaving(false);
    }
  };

  const removeBook = async (book: LibraryBook) => {
    if (!window.confirm(`Remove "${book.title}" from the catalog?`)) return;
    try {
      await deleteLibraryBook(book.id);
      flash('Book removed from the catalog.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Book could not be removed.');
    }
  };

  const issueBook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!borrowForm.bookId || !borrowForm.borrowerName.trim()) return;
    setSaving(true);
    try {
      await borrowBook(borrowForm);
      setShowBorrowModal(false);
      setBorrowForm({ bookId: '', borrowerName: '', borrowerType: 'Student', days: 14 });
      flash('Book successfully issued.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Book could not be issued.');
    } finally {
      setSaving(false);
    }
  };

  const processReturn = async (record: BorrowingRecord) => {
    try {
      await returnBook(record.id);
      flash(`${record.bookTitle || 'Book'} returned successfully.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Book could not be returned.');
    }
  };

  const addMember = (event: React.FormEvent) => {
    event.preventDefault();
    const member: LibraryMember = {
      id: `member-${Date.now()}`,
      name: memberForm.name.trim(),
      registrationNo: memberForm.registrationNo.trim().toUpperCase(),
      type: memberForm.type,
      grade: memberForm.grade.trim(),
      status: 'Active'
    };
    if (!member.name) return;
    saveMembers([...members.filter(memberItem => !memberItem.id.startsWith('member-')), member]);
    setShowMemberModal(false);
    setMemberForm({ name: '', registrationNo: '', type: 'Student', grade: '' });
    flash('Library member added.');
  };

  const printReport = () => window.print();

  if (!managementMode) {
    return <LibraryReaderView books={books.length ? books : INITIAL_BOOKS} search={search} setSearch={setSearch} onBorrow={async () => {
      setActivePage('borrowing');
      setShowBorrowModal(true);
    }} />;
  }

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-800 text-white shadow-xl">
        <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
              <Library className="h-4 w-4" /> St. Silas Library
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">Library Management</h1>
            <p className="mt-2 max-w-xl text-sm text-violet-100">Manage the catalog, members, borrowing circulation and returns from one workspace.</p>
          </div>
          <button type="button" onClick={() => setShowBookModal(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-950 shadow-lg">
            <Plus className="h-4 w-4" /> Add New Book
          </button>
        </div>
      </header>

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

      <nav className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        {pages.map(page => (
          <button key={page.id} type="button" onClick={() => setActivePage(page.id)} className={`min-h-20 rounded-2xl px-3 py-3 text-center text-xs font-bold transition ${activePage === page.id ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <page.icon className="mx-auto mb-2 h-5 w-5" />
            <span>{page.label.replace(' Management', '')}</span>
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Library books', value: books.reduce((sum, book) => sum + book.totalCopies, 0), icon: BookOpen, colors: 'text-indigo-700 bg-indigo-50' },
          { label: 'Active members', value: members.length, icon: Users, colors: 'text-blue-700 bg-blue-50' },
          { label: 'Books borrowed', value: activeLoans.length, icon: Library, colors: 'text-violet-700 bg-violet-50' },
          { label: 'Overdue books', value: overdue.length, icon: AlertTriangle, colors: 'text-rose-700 bg-rose-50' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-3 inline-flex rounded-xl p-2 ${stat.colors}`}><stat.icon className="h-5 w-5" /></div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {activePage === 'books' && (
        <Panel title="Books Management" subtitle={`${filteredBooks.length} titles in the catalog`}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search by title, author, ISBN or category..." />
          {loading ? <LoadingRows /> : <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredBooks.map(book => (
              <article key={book.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{book.category}</span>
                  <button type="button" onClick={() => void removeBook(book)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="mt-3 font-black text-slate-900 dark:text-white">{book.title}</h3>
                <p className="mt-1 text-xs text-slate-500">by {book.author}</p>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                  <span className="text-slate-500">{book.location}</span><strong className={book.availableCopies ? 'text-emerald-700' : 'text-rose-700'}>{book.availableCopies} available</strong>
                </div>
              </article>
            ))}
          </div>}
        </Panel>
      )}

      {activePage === 'members' && (
        <Panel title="Library Member Management" subtitle="Students and staff registered for library services">
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setShowMemberModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white"><UserPlus className="h-4 w-4" /> Register Member</button>
          </div>
          <MemberTable members={members} search={search} setSearch={setSearch} />
        </Panel>
      )}

      {activePage === 'borrowing' && (
        <Panel title="Borrowing Management" subtitle={`${activeLoans.length} books currently issued`}>
          <div className="flex justify-end"><button type="button" onClick={() => setShowBorrowModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Issue a Book</button></div>
          <LoanTable records={activeLoans} action="Return Book" onAction={processReturn} />
        </Panel>
      )}

      {activePage === 'returns' && (
        <Panel title="Book Returns Management" subtitle={`${returned.length} completed returns`}>
          <LoanTable records={[...activeLoans, ...returned]} action="Return Book" onAction={processReturn} />
        </Panel>
      )}

      {activePage === 'overdue' && (
        <Panel title="Overdue Books Management" subtitle={`${overdue.length} overdue loans require attention`}>
          {overdue.length ? <LoanTable records={overdue} action="Record Return" onAction={processReturn} /> : <EmptyState icon={CheckIcon} title="No overdue books" detail="All current loans are within their due dates." />}
        </Panel>
      )}

      {activePage === 'reports' && (
        <Panel title="Library Reports Management" subtitle="A live summary of library activity">
          <div className="grid gap-4 sm:grid-cols-3">
            <ReportCard label="Total circulation" value={borrowings.length} />
            <ReportCard label="Returned" value={returned.length} />
            <ReportCard label="Overdue rate" value={`${borrowings.length ? Math.round(overdue.length / borrowings.length * 100) : 0}%`} />
          </div>
          <button type="button" onClick={printReport} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><Download className="h-4 w-4" /> Print Library Report</button>
        </Panel>
      )}

      {showBookModal && <Modal title="Add Library Book" onClose={() => setShowBookModal(false)}>
        <form onSubmit={addBook} className="grid gap-4 sm:grid-cols-2">
          {[
            ['title', 'Book title'], ['author', 'Author'], ['isbn', 'ISBN'], ['location', 'Shelf location']
          ].map(([field, label]) => <FormField key={field} label={label} value={(bookForm as any)[field]} onChange={value => setBookForm({ ...bookForm, [field]: value })} />)}
          <label className="text-xs font-bold text-slate-600">Category<select value={bookForm.category} onChange={event => setBookForm({ ...bookForm, category: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option>Textbook</option><option>Storybook</option><option>Reference</option><option>Fiction</option><option>General Knowledge</option></select></label>
          <FormField label="Number of copies" type="number" value={String(bookForm.totalCopies)} onChange={value => setBookForm({ ...bookForm, totalCopies: Number(value) })} />
          <div className="sm:col-span-2 flex justify-end gap-3"><button type="button" onClick={() => setShowBookModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Saving...' : 'Add Book'}</button></div>
        </form>
      </Modal>}

      {showBorrowModal && <Modal title="Issue Book" onClose={() => setShowBorrowModal(false)}>
        <form onSubmit={issueBook} className="space-y-4">
          <label className="text-xs font-bold text-slate-600">Available book<select value={borrowForm.bookId} onChange={event => setBorrowForm({ ...borrowForm, bookId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Select a book</option>{books.filter(book => book.availableCopies > 0).map(book => <option key={book.id} value={book.id}>{book.title} ({book.availableCopies} available)</option>)}</select></label>
          <FormField label="Borrower name" value={borrowForm.borrowerName} onChange={value => setBorrowForm({ ...borrowForm, borrowerName: value })} />
          <div className="grid grid-cols-2 gap-4"><label className="text-xs font-bold text-slate-600">Member type<select value={borrowForm.borrowerType} onChange={event => setBorrowForm({ ...borrowForm, borrowerType: event.target.value as any })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option>Student</option><option>Teacher</option><option>Staff</option></select></label><FormField label="Loan period (days)" type="number" value={String(borrowForm.days)} onChange={value => setBorrowForm({ ...borrowForm, days: Number(value) })} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowBorrowModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button><button disabled={saving} className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Issuing...' : 'Issue Book'}</button></div>
        </form>
      </Modal>}

      {showMemberModal && <Modal title="Register Library Member" onClose={() => setShowMemberModal(false)}>
        <form onSubmit={addMember} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" value={memberForm.name} onChange={value => setMemberForm({ ...memberForm, name: value })} />
          <FormField label="Registration number" value={memberForm.registrationNo} onChange={value => setMemberForm({ ...memberForm, registrationNo: value })} />
          <label className="text-xs font-bold text-slate-600">Member type<select value={memberForm.type} onChange={event => setMemberForm({ ...memberForm, type: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option>Student</option><option>Teacher</option><option>Staff</option></select></label>
          <FormField label="Class / department" value={memberForm.grade} onChange={value => setMemberForm({ ...memberForm, grade: value })} />
          <div className="sm:col-span-2 flex justify-end"><button className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white">Register Member</button></div>
        </form>
      </Modal>}
    </section>
  );
};

const LibraryReaderView = ({ books, search, setSearch, onBorrow }: { books: LibraryBook[]; search: string; setSearch: (value: string) => void; onBorrow: () => void }) => (
  <div className="space-y-5"><h2 className="text-xl font-bold text-slate-900 dark:text-white">School Library</h2><SearchBox value={search} onChange={setSearch} placeholder="Search books..." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(search.toLowerCase())).map(book => <article key={book.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><span className="text-[10px] font-bold text-indigo-700">{book.category}</span><h3 className="mt-2 font-bold">{book.title}</h3><p className="text-xs text-slate-500">{book.author}</p><button type="button" onClick={onBorrow} disabled={!book.availableCopies} className="mt-4 w-full rounded-xl bg-indigo-700 py-2.5 text-xs font-bold text-white disabled:bg-slate-200">{book.availableCopies ? 'Request to Borrow' : 'Unavailable'}</button></article>)}</div></div>
);

const Panel = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"><header className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800"><h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></header>{children}</section>;
const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800" /></div>;
const LoadingRows = () => <div className="mt-4 space-y-3">{[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}</div>;
const FormField = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <label className="text-xs font-bold text-slate-600">{label}<input required type={type} min={type === 'number' ? 1 : undefined} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label>;
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{children}</div></div>;
const ReportCard = ({ label, value }: { label: string; value: React.ReactNode }) => <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></div>;
const CheckIcon = () => <BookOpen className="h-10 w-10 text-emerald-600" />;
const EmptyState = ({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) => <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 py-12 text-center"><Icon /><p className="mt-3 font-black text-slate-800">{title}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;

const MemberTable = ({ members, search, setSearch }: { members: LibraryMember[]; search: string; setSearch: (value: string) => void }) => <div className="mt-4"><SearchBox value={search} onChange={setSearch} placeholder="Search member..." /><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-3">Member</th><th className="p-3">Registration</th><th className="p-3">Type</th><th className="p-3">Status</th></tr></thead><tbody>{members.filter(member => `${member.name} ${member.registrationNo}`.toLowerCase().includes(search.toLowerCase())).map(member => <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{member.name}<span className="block font-normal text-slate-500">{member.grade}</span></td><td className="p-3">{member.registrationNo}</td><td className="p-3">{member.type}</td><td className="p-3"><span className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{member.status}</span></td></tr>)}</tbody></table></div></div>;

const LoanTable = ({ records, action, onAction }: { records: BorrowingRecord[]; action: string; onAction: (record: BorrowingRecord) => void }) => <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="p-3">Book</th><th className="p-3">Borrower</th><th className="p-3">Borrowed</th><th className="p-3">Due</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{records.map(record => <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{record.bookTitle || 'Library Book'}</td><td className="p-3">{record.borrowerName}<span className="block text-slate-500">{record.borrowerType}</span></td><td className="p-3">{record.borrowDate}</td><td className="p-3">{record.dueDate}</td><td className="p-3 text-right">{record.status === 'Borrowed' ? <button type="button" onClick={() => onAction(record)} className="rounded-lg bg-indigo-50 px-3 py-2 font-bold text-indigo-700">{action}</button> : <span className="font-bold text-emerald-700">Returned {record.returnDate}</span>}</td></tr>)}</tbody></table>{!records.length && <p className="py-10 text-center text-sm text-slate-500">No records found.</p>}</div>;
