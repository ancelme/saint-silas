export type Language = 'en' | 'fr' | 'rw';

export type Role =
  | 'owner'
  | 'super_admin'
  | 'admin'
  | 'head_teacher'
  | 'teacher'
  | 'accountant'
  | 'librarian'
  | 'parent'
  | 'student';

export type SchoolLevel = 'Nursery' | 'Lower Primary' | 'Upper Primary';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  name?: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: string;
  grade?: string;
  level?: SchoolLevel;
  assignedClass?: string;
  studentId?: string;
  childrenIds?: string[];
  village?: string;
  cell?: string;
  sector?: string;
  district?: string;
  status?: 'Active' | 'Inactive' | 'PENDING_FIRST_LOGIN';
  mustChangePassword?: boolean;
  recoveryEmail?: string;
  recoveryPhone?: string;
  lastLogin?: string;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
}

export interface Student {
  id: string;
  rollNo: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  dob: string;
  grade: string;
  level: SchoolLevel;
  section: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  status: 'Active' | 'Suspended' | 'Alumni' | 'Archived';
  enrollmentDate: string;
  feeStatus: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  photoUrl: string;
  attendanceRate: number;
  overallGPA: number;
}

export interface Teacher {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  phone: string;
  subject?: string;
  specialization?: string;
  department?: string;
  level?: SchoolLevel | 'All';
  qualification: string;
  assignedClasses?: string[];
  assignedGrades?: string[];
  status: 'Active' | 'On Leave' | 'Archived';
  avatar: string;
  joinDate: string;
  address?: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: string;
  subject: string;
  teacherName: string;
  classroom: string;
  grade: string;
  level?: SchoolLevel;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  level?: SchoolLevel;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  note?: string;
  remarks?: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  studentName: string;
  grade?: string;
  level?: SchoolLevel;
  subject: string;
  term: string;
  quiz?: number;
  midTerm?: number;
  finalExam?: number;
  total?: number;
  marks?: number;
  gradeLetter?: string;
  remarks?: string;
  teacherName?: string;
  quizScore?: number;
  midtermScore?: number;
  finalExamScore?: number;
  totalScore?: number;
  letterGrade?: string;
}

export interface FeeInvoice {
  id: string;
  invoiceNumber: string;
  invoiceNo?: string;
  title?: string;
  studentId: string;
  studentName: string;
  grade: string;
  level?: SchoolLevel;
  term: string;
  amountTotal: number;
  amountPaid: number;
  balance?: number;
  dueDate: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  paymentMethod?: 'MTN MoMo' | 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash';
  paymentDate?: string;
  items?: { description: string; amount: number }[];
}

export interface FeePaymentRequest {
  id: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName: string;
  amount: number;
  paymentMethod: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash';
  referenceNo: string;
  phoneNumber: string;
  submittedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  receiptNo?: string;
  recordedBy?: string;
  notes?: string;
  createdAt?: string;
}

export interface LibraryBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  targetLevel?: SchoolLevel | 'All';
  totalCopies: number;
  availableCopies: number;
  location: string;
  createdAt?: string;
}

export interface BorrowingRecord {
  id: string;
  bookId: string;
  bookTitle?: string;
  borrowerId?: string;
  borrowerName: string;
  borrowerType: 'Student' | 'Teacher' | 'Staff';
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Borrowed' | 'Returned' | 'Overdue';
  fineAmount?: number;
  issuedBy?: string;
  createdAt?: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'Academic' | 'Sports' | 'Cultural' | 'Meeting';
  description: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  targetRole?: 'All' | 'Teachers' | 'Students' | 'Parents';
  targetAudience?: string;
  category?: string;
  date: string;
  priority?: 'High' | 'Normal' | 'Urgent';
}

export interface AdmissionApplication {
  id: string;
  applicantName: string;
  gender: 'M' | 'F';
  dob: string;
  applyingGrade: string;
  level: SchoolLevel;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  photoUrl?: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  previousSchool?: string;
  birthCertificateSubmitted?: boolean;
  immunizationCardSubmitted?: boolean;
  status: 'Pending' | 'Approved' | 'Enrolled' | 'Rejected' | 'Under Review';
  applicationDate?: string;
  submissionDate?: string;
  notes?: string;
  assignedStream?: string;
  adminResponse?: string;
  adminResponseDate?: string;
  adminResponder?: string;
}

export interface UserAuditLog {
  id: string;
  userId?: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  role: string;
  action: string;
  details: string;
  ipAddress: string;
  device?: string;
  status?: string;
}

export interface UserRequest {
  id: string;
  trackingNumber?: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderRole?: Role | 'visitor';
  subject: string;
  message: string;
  category: string;
  submittedAt?: string;
  createdAt?: string;
  status: 'Pending' | 'In Review' | 'Responded' | 'Resolved' | 'Under Review' | 'Rejected';
  response?: string | {
    respondedAt?: string;
    respondedBy?: string;
    responseMessage?: string;
    actionTaken?: string;
  };
  adminResponse?: string;
  actionTaken?: string;
  respondedAt?: string;
  respondedBy?: string;
}

export interface UserSession {
  id?: string;
  sessionId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  ipAddress: string;
  device: string;
  browser?: string;
  location?: string;
  loginTime: string;
  lastActive: string;
  expiresAt?: string;
  tokenSnippet?: string;
  status: 'Active' | 'ACTIVE' | 'Revoked' | 'Expired';
  isCurrentSession?: boolean;
}
