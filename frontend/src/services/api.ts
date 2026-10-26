import {
  Student,
  Teacher,
  FeeInvoice,
  Expense,
  LibraryBook,
  BorrowingRecord,
  AttendanceRecord,
  GradeEntry,
  Announcement,
  AdmissionApplication,
  SchoolEvent,
  TimetableSlot,
  User,
  Role,
  UserAuditLog
} from '../types';

const TOKEN_KEY = 'st_silas_auth_token';

export interface ChatContact {
  id: string;
  fullName: string;
  role: Role;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachments?: ChatAttachment[];
  isDeleted?: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

export interface FeedbackRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface AccountNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | string;
  isRead: boolean;
  createdAt: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string, remember: boolean = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function hasAuthToken(): boolean {
  return !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
}

export async function fetchTimetable() {
  const response = await request<{ items: TimetableSlot[] | null }>('/api/timetable');
  return response.items;
}

export async function saveTimetable(items: TimetableSlot[]) {
  return request<{ message: string }>('/api/timetable', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function fetchSchoolEvents() {
  const response = await request<{ items: SchoolEvent[] | null }>('/api/events');
  return response.items;
}

export async function saveSchoolEvents(items: SchoolEvent[]) {
  return request<{ message: string }>('/api/events', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function fetchNotifications() {
  return request<AccountNotification[]>('/api/notifications');
}

export async function markNotificationRead(notificationId: string) {
  return request<{ message: string }>(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ==========================================
// 1. Setup & System Initialization
// ==========================================
export async function getSetupStatus() {
  return request<{ isOwnerConfigured: boolean; defaultOwnerUsername: string; schoolName: string; dbEngine: string; status: string }>('/api/setup/status');
}

export async function setupInitialOwner(payload: {
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
}) {
  const data = await request<{ message: string; token: string; mustChangePassword: boolean; user: User }>('/api/setup/owner', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.token) {
    saveAuthToken(data.token);
  }
  return data;
}

// ==========================================
// 2. Authentication and chat
// ==========================================
export async function loginUser(payload: { identifier: string; password: string }) {
  const data = await request<{ token: string; mustChangePassword?: boolean; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.token) {
    saveAuthToken(data.token);
  }
  return data;
}

export async function completeFirstLogin(payload: {
  currentPassword: string;
  newPassword: string;
  recoveryEmail: string;
  recoveryPhone: string;
}) {
  const data = await request<{ message: string; token: string; user: User }>('/api/auth/complete-first-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data.token) {
    saveAuthToken(data.token);
  }
  return data;
}

export async function fetchChatContacts() {
  return request<ChatContact[]>('/api/messages/contacts');
}

export async function fetchFeedbackInbox() {
  return request<FeedbackRequest[]>('/api/messages/feedback/inbox');
}

export async function markFeedbackRequestRead(requestId: string) {
  return request<{ message: string }>(`/api/messages/feedback/${requestId}/read`, {
    method: 'PUT',
  });
}

export async function fetchConversation(userId: string) {
  return request<DirectMessage[]>(`/api/messages/${encodeURIComponent(userId)}`);
}

export async function sendDirectMessage(
  userId: string,
  body: string,
  subject?: string,
  attachments: ChatAttachment[] = [],
) {
  return request<{ message: DirectMessage }>(`/api/messages/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify({ body, attachments, ...(subject ? { subject } : {}) }),
  });
}

export async function deleteDirectMessage(messageId: string, scope: 'me' | 'everyone') {
  return request<{ message: string }>(`/api/messages/${encodeURIComponent(messageId)}?scope=${scope}`, {
    method: 'DELETE',
  });
}

export async function fetchMessagePrivacy() {
  return request<{ showLastSeen: boolean; showReadReceipts: boolean }>('/api/messages/privacy');
}

export async function updateMessagePrivacy(payload: { showLastSeen: boolean; showReadReceipts: boolean }) {
  return request<{ showLastSeen: boolean; showReadReceipts: boolean }>('/api/messages/privacy', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  return request<User>('/api/auth/me');
}

export async function updateProfile(payload: Partial<User> & { fullName?: string; avatarUrl?: string }) {
  return request<{ message: string }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return request<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    clearAuthToken();
  }
}

// ==========================================
// 3. User & Staff Management (Super Admin / Owner ONLY)
// ==========================================
export async function fetchUsers() {
  return request<User[]>('/api/users');
}

export async function createStaffUser(payload: {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  phone?: string;
  specialization?: string;
  department?: string;
  avatar?: string;
  studentIds?: string[];
}) {
  return request<{ message: string; user: User }>('/api/users/staff', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId: string, payload: Partial<User>) {
  return request<{ message: string }>(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(userId: string, status: 'Active' | 'Inactive') {
  return request<{ message: string }>(`/api/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function updateUserRole(userId: string, role: Role) {
  return request<{ message: string }>(`/api/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPassword(userId: string, temporaryPassword: string) {
  return request<{ message: string }>(`/api/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ temporaryPassword }),
  });
}

export async function deleteUserAccount(userId: string) {
  return request<{ message: string }>(`/api/users/${userId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 4. Students
// ==========================================
export async function fetchStudents(params?: { search?: string; grade?: string; level?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<Student[]>(`/api/students${query ? `?${query}` : ''}`);
}

export async function createStudent(student: Partial<Student>) {
  return request<{ message: string; student: Student }>('/api/students', {
    method: 'POST',
    body: JSON.stringify(student),
  });
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  return request<{ message: string }>(`/api/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function archiveStudent(id: string) {
  return request<{ message: string }>(`/api/students/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 5. Teachers
// ==========================================
export async function fetchTeachers() {
  return request<Teacher[]>('/api/teachers');
}

export async function createTeacher(teacher: Partial<Teacher> & { password?: string }) {
  return request<{ message: string; teacher: Teacher }>('/api/teachers', {
    method: 'POST',
    body: JSON.stringify(teacher),
  });
}

export async function updateTeacher(id: string, updates: Partial<Teacher>) {
  return request<{ message: string }>(`/api/teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteTeacher(id: string) {
  return request<{ message: string }>(`/api/teachers/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 6. Admissions
// ==========================================
export async function fetchAdmissions() {
  return request<AdmissionApplication[]>('/api/admissions');
}

export async function submitAdmission(payload: Partial<AdmissionApplication>) {
  return request<{ message: string; admissionId: string; status: string }>('/api/admissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function answerAdmission(
  admissionId: string,
  payload: { decision: 'Approved' | 'Rejected' | 'Under Review'; answerText: string; assignedStream?: string }
) {
  return request<{ message: string; status: string; emailSent?: boolean; recipientEmail?: string }>(`/api/admissions/${admissionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdmission(admissionId: string) {
  return request<{ message: string }>(`/api/admissions/${admissionId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 7. Finance, Fees & Operational Expenses
// ==========================================
export async function fetchFees() {
  return request<FeeInvoice[]>('/api/fees');
}

export async function createFeeInvoice(payload: {
  studentId: string;
  title: string;
  amountTotal: number;
  dueDate?: string;
}) {
  return request<{ message: string; invoice: any }>('/api/fees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFeeInvoice(id: string, payload: Partial<FeeInvoice>) {
  return request<{ message: string }>(`/api/fees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteFeeInvoice(id: string) {
  return request<{ message: string }>(`/api/fees/${id}`, {
    method: 'DELETE',
  });
}

export async function recordPayment(payload: {
  invoiceId: string;
  amount: number;
  paymentMethod: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash';
  referenceNo?: string;
  phoneNumber?: string;
}) {
  return request<{
    message: string;
    paymentId: string;
    referenceNo: string;
    paymentMethod: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash';
    amountPaid: number;
    newBalance: number;
    status: string;
  }>('/api/fees/payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchExpenses() {
  return request<Expense[]>('/api/expenses');
}

export async function createExpense(payload: {
  title: string;
  category: string;
  amount: number;
  date?: string;
  receiptNo?: string;
  notes?: string;
}) {
  return request<{ message: string; expense: Expense }>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 8. Library Management (Librarian & Owner)
// ==========================================
export async function fetchLibraryBooks(params?: { category?: string; search?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<LibraryBook[]>(`/api/library/books${query ? `?${query}` : ''}`);
}

export async function createLibraryBook(payload: Partial<LibraryBook>) {
  return request<{ message: string; book: LibraryBook }>('/api/library/books', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLibraryBook(id: string, payload: Partial<LibraryBook>) {
  return request<{ message: string }>(`/api/library/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLibraryBook(id: string) {
  return request<{ message: string }>(`/api/library/books/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchBorrowingRecords() {
  return request<BorrowingRecord[]>('/api/library/borrowings');
}

export async function borrowBook(payload: {
  bookId: string;
  borrowerName: string;
  borrowerType?: 'Student' | 'Teacher' | 'Staff';
  days?: number;
}) {
  return request<{ message: string; recordId: string; dueDate: string }>('/api/library/borrow', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function returnBook(borrowingId: string) {
  return request<{ message: string }>(`/api/library/return/${borrowingId}`, {
    method: 'POST',
  });
}

export async function fetchLibrarySummary() {
  return request<{ totalBooks: number; availableBooks: number; activeLoans: number; overdueLoans: number }>('/api/library/summary');
}

// ==========================================
// 9. Attendance
// ==========================================
export async function fetchAttendance(date?: string) {
  return request<AttendanceRecord[]>(`/api/attendance${date ? `?date=${date}` : ''}`);
}

export async function saveAttendance(records: AttendanceRecord[]) {
  return request<{ message: string }>('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });
}

// ==========================================
// 10. Grades
// ==========================================
export async function fetchGrades() {
  return request<GradeEntry[]>('/api/grades');
}

export async function saveGrade(payload: { studentId: string; subject: string; marks: number; remarks?: string }) {
  return request<{ message: string; grade: GradeEntry }>('/api/grades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 11. Announcements
// ==========================================
export async function fetchAnnouncements() {
  return request<Announcement[]>('/api/announcements');
}

export async function createAnnouncement(payload: { title: string; content: string; targetAudience?: string; category?: string }) {
  return request<{ message: string; announcement: Announcement }>('/api/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAnnouncement(id: string, payload: Partial<Announcement>) {
  return request<{ message: string }>(`/api/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAnnouncement(id: string) {
  return request<{ message: string }>(`/api/announcements/${id}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 12. Security Audit Logs (Owner ONLY)
// ==========================================
export async function fetchAuditLogs(params?: { action?: string; role?: string; search?: string }) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return request<UserAuditLog[]>(`/api/audit-logs${query ? `?${query}` : ''}`);
}

// ==========================================
// 13. AI Intelligence & Insights
// ==========================================
export interface DashboardInsightsResponse {
  metrics: {
    totalStudents: number;
    nurseryCount: number;
    lowerCount: number;
    upperCount: number;
    totalTeachers: number;
    attendanceRate: number;
    totalBilled: number;
    totalPaid: number;
    totalBalance: number;
    collectionRate: number;
    pendingAdmissions: number;
  };
  insights: {
    schoolSummary: string;
    attendanceInsight: string;
    academicInsight: string;
    feeInsight: string;
    importantAlerts: string;
    recommendedActions: string;
  };
  generatedAt: string;
  source: string;
}

export async function fetchDashboardInsights() {
  return request<DashboardInsightsResponse>('/api/ai/dashboard-insights');
}

export async function askRoleAssistant(prompt: string, topic?: string) {
  return request<{ reply: string; role: string; timestamp: string }>('/api/ai/role-assistant', {
    method: 'POST',
    body: JSON.stringify({ prompt, topic }),
  });
}

export async function sendContactInquiry(payload: {
  name: string;
  email: string;
  phone: string;
  message: string;
  language: string;
}) {
  return request<{
    reply: string;
    ticketId: string;
    recipient: string;
    timestamp: string;
    engineLabel: string;
    status: string;
  }>('/api/contact/ai-reply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 14. System Settings & Database Dump Export
// ==========================================
export async function fetchSystemSettings() {
  return request<Record<string, string>>('/api/system/settings');
}

export async function downloadDatabaseBackup() {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch('/api/system/backup', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('Failed to export database backup');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `st_silas_database_backup_${new Date().toISOString().split('T')[0]}.sql`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function getSystemHealth() {
  return request<{
    status: string;
    institution: string;
    rebCenterCode: string;
    database: { engine: string; connected: boolean; isProductionConfigured: boolean };
    uptime: number;
  }>('/api/system/health');
}
