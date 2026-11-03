import { Router } from 'express';
import {
  getSetupStatus,
  setupInitialOwner,
  login,
  registerApplicant,
  completeFirstLogin,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout
} from '../controllers/authController';
import {
  getUsers,
  createStaffUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  deleteUser
} from '../controllers/usersController';
import {
  getStudents,
  createStudent,
  updateStudent,
  archiveStudent
} from '../controllers/studentsController';
import {
  getTeachers,
  getTeacherAssignmentOptions,
  getMyTeacherAssignments,
  updateTeacherAssignments,
  createTeacher,
  updateTeacher,
  deleteTeacher
} from '../controllers/teachersController';
import { getStudentReports, publishMidtermReports } from '../controllers/reportsController';
import {
  getAdmissions,
  submitAdmission,
  answerAdmission,
  updateAdmission,
  deleteAdmission
} from '../controllers/admissionsController';
import {
  getFees,
  createFeeInvoice,
  updateFeeInvoice,
  deleteFeeInvoice,
  recordPayment,
  submitParentPaymentRequest,
  getPaymentRequests,
  reviewPaymentRequest
} from '../controllers/feesController';
import {
  getExpenses,
  createExpense
} from '../controllers/expensesController';
import {
  getInventory,
  createStockItem,
  recordStockMovement,
} from '../controllers/inventoryController';
import {
  getLibraryBooks,
  createLibraryBook,
  updateLibraryBook,
  deleteLibraryBook,
  getBorrowingRecords,
  borrowBook,
  returnBook,
  getLibrarySummary
} from '../controllers/libraryController';
import {
  getAttendance,
  saveAttendance,
  deleteAttendance,
} from '../controllers/attendanceController';
import {
  getGrades,
  updateGrade,
  deleteGrade,
} from '../controllers/gradesController';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/announcementsController';
import { getAuditLogs } from '../controllers/auditLogsController';
import { getNotifications, markNotificationRead } from '../controllers/notificationsController';
import {
  getMessageContacts,
  getFeedbackInbox,
  markFeedbackRequestRead,
  getConversation,
  sendDirectMessage,
  deleteDirectMessage,
  getMessagePrivacy,
  updateMessagePrivacy,
  createChatGroup,
} from '../controllers/messagesController';
import {
  getDashboardInsights,
  askRoleAssistant
} from '../controllers/aiController';
import {
  getSchoolSettings,
  updateSchoolSetting,
  exportDatabaseDump,
  getSystemHealth
} from '../controllers/systemController';
import {
  getSchoolEvents,
  getTimetable,
  saveSchoolEvents,
  saveTimetable,
} from '../controllers/schoolContentController';
import { authenticateToken, requireRole, requireOwnerOnly, requireAccountCreator } from '../middleware/auth';
import {
  getSocialFeed, createStory, deleteStory, viewStory, reactToStory,
  createPost, updatePost, deletePost, togglePostLike, addPostComment,
} from '../controllers/socialController';
import { getSocialPermissions, updateSocialPermission } from '../controllers/socialPermissionsController';

const router = Router();

// ==========================================
// 1. Initial Setup & Authentication
// ==========================================
router.get('/setup/status', getSetupStatus);
router.post('/setup/owner', setupInitialOwner);

router.post('/auth/login', login);
router.post('/auth/applicant/register', registerApplicant);
router.post('/auth/complete-first-login', authenticateToken, completeFirstLogin);
router.get('/auth/me', authenticateToken, getCurrentUser);
router.put('/auth/profile', authenticateToken, updateProfile);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/logout', logout);
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/:id/read', authenticateToken, markNotificationRead);
router.get('/timetable', authenticateToken, getTimetable);
router.put('/timetable', authenticateToken, requireRole('admin', 'head_teacher'), saveTimetable);
router.get('/events', getSchoolEvents);
router.put('/events', authenticateToken, requireRole('admin', 'head_teacher'), saveSchoolEvents);
router.get('/messages/privacy', authenticateToken, getMessagePrivacy);
router.put('/messages/privacy', authenticateToken, updateMessagePrivacy);
router.get('/messages/contacts', authenticateToken, getMessageContacts);
router.post('/messages/groups', authenticateToken, createChatGroup);
router.get('/messages/feedback/inbox', authenticateToken, requireRole('admin'), getFeedbackInbox);
router.put('/messages/feedback/:id/read', authenticateToken, requireRole('admin'), markFeedbackRequestRead);
router.get('/messages/:userId', authenticateToken, getConversation);
router.post('/messages/:userId', authenticateToken, sendDirectMessage);
router.delete('/messages/:id', authenticateToken, deleteDirectMessage);

router.get('/social/feed', authenticateToken, getSocialFeed);
router.post('/social/stories', authenticateToken, createStory);
router.delete('/social/stories/:id', authenticateToken, deleteStory);
router.post('/social/stories/:id/view', authenticateToken, viewStory);
router.post('/social/stories/:id/react', authenticateToken, reactToStory);
router.post('/social/posts', authenticateToken, createPost);
router.put('/social/posts/:id', authenticateToken, updatePost);
router.delete('/social/posts/:id', authenticateToken, deletePost);
router.post('/social/posts/:id/like', authenticateToken, togglePostLike);
router.post('/social/posts/:id/comments', authenticateToken, addPostComment);
router.get('/social/permissions', authenticateToken, requireRole('owner', 'super_admin'), getSocialPermissions);
router.put('/social/permissions/:role', authenticateToken, requireRole('owner', 'super_admin'), updateSocialPermission);

// ==========================================
// 2. User & Staff Management (Administrator & Super Admin / Owner)
// ==========================================
router.get('/users', authenticateToken, requireAccountCreator, getUsers);
router.post('/users/staff', authenticateToken, requireAccountCreator, createStaffUser);
router.put('/users/:id', authenticateToken, requireAccountCreator, updateUser);
router.put('/users/:id/status', authenticateToken, requireAccountCreator, updateUserStatus);
router.put('/users/:id/role', authenticateToken, requireAccountCreator, updateUserRole);
router.post('/users/:id/reset-password', authenticateToken, requireAccountCreator, resetUserPassword);
router.delete('/users/:id', authenticateToken, requireAccountCreator, deleteUser);

// ==========================================
// 3. Students & Faculty (Full CRUD: Add, View, Update, Delete)
// ==========================================
router.get('/students', authenticateToken, getStudents);
router.post('/students', authenticateToken, requireRole('admin', 'head_teacher'), createStudent);
router.put('/students/:id', authenticateToken, requireRole('admin', 'head_teacher', 'teacher'), updateStudent);
router.delete('/students/:id', authenticateToken, requireRole('admin'), archiveStudent);

router.get('/teachers', authenticateToken, requireRole('admin', 'head_teacher'), getTeachers);
router.get('/teachers/assignment-options', authenticateToken, requireRole('admin'), getTeacherAssignmentOptions);
router.get('/teachers/my-assignments', authenticateToken, requireRole('teacher'), getMyTeacherAssignments);
router.post('/teachers', authenticateToken, requireRole('admin'), createTeacher);
router.put('/teachers/:id/assignments', authenticateToken, requireRole('admin'), updateTeacherAssignments);
router.put('/teachers/:id', authenticateToken, requireRole('admin'), updateTeacher);
router.delete('/teachers/:id', authenticateToken, requireRole('admin'), deleteTeacher);

// ==========================================
// 4. Admissions (Online Application & Email Feedback)
// ==========================================
router.get('/admissions', authenticateToken, requireRole('admin', 'head_teacher', 'parent', 'applicant'), getAdmissions);
router.post('/admissions', authenticateToken, submitAdmission);
router.put('/admissions/:id', authenticateToken, requireRole('admin', 'head_teacher'), updateAdmission);
router.post('/admissions/:id/answer', authenticateToken, requireRole('admin', 'head_teacher'), answerAdmission);
router.delete('/admissions/:id', authenticateToken, requireRole('admin'), deleteAdmission);

// ==========================================
// 5. Finance, Fees & Operational Expenses (Full CRUD)
// ==========================================
router.get('/fees', authenticateToken, getFees);
router.post('/fees', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), createFeeInvoice);
router.put('/fees/:id', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), updateFeeInvoice);
router.delete('/fees/:id', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), deleteFeeInvoice);
router.post('/fees/payment', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), recordPayment);
router.post('/fees/payment-requests', authenticateToken, requireRole('parent'), submitParentPaymentRequest);
router.get('/fees/payment-requests', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), getPaymentRequests);
router.put('/fees/payment-requests/:id', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), reviewPaymentRequest);
router.get('/expenses', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), getExpenses);
router.post('/expenses', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), createExpense);
router.get('/inventory', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), getInventory);
router.post('/inventory/items', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), createStockItem);
router.post('/inventory/movements', authenticateToken, requireRole('owner', 'super_admin', 'accountant', 'admin'), recordStockMovement);

// ==========================================
// 6. Library Management (Full CRUD)
// ==========================================
router.get('/library/books', authenticateToken, requireRole('admin', 'head_teacher', 'teacher', 'librarian', 'student'), getLibraryBooks);
router.post('/library/books', authenticateToken, requireRole('librarian', 'admin'), createLibraryBook);
router.put('/library/books/:id', authenticateToken, requireRole('librarian', 'admin'), updateLibraryBook);
router.delete('/library/books/:id', authenticateToken, requireRole('librarian', 'admin'), deleteLibraryBook);
router.get('/library/borrowings', authenticateToken, requireRole('librarian', 'admin'), getBorrowingRecords);
router.post('/library/borrow', authenticateToken, requireRole('librarian', 'admin'), borrowBook);
router.post('/library/return/:id', authenticateToken, requireRole('librarian', 'admin'), returnBook);
router.get('/library/summary', authenticateToken, requireRole('admin', 'head_teacher', 'teacher', 'librarian', 'student'), getLibrarySummary);

// ==========================================
// 7. Attendance & Academic Grades (Educators & Head Teacher)
// ==========================================
router.get('/attendance', authenticateToken, getAttendance);
router.post('/attendance', authenticateToken, requireRole('teacher', 'admin', 'head_teacher'), saveAttendance);
router.delete('/attendance/:id', authenticateToken, requireRole('teacher', 'admin', 'head_teacher'), deleteAttendance);

router.get('/grades', authenticateToken, getGrades);
router.post('/grades', authenticateToken, requireRole('teacher', 'admin', 'head_teacher'), updateGrade);
router.delete('/grades/:id', authenticateToken, requireRole('teacher', 'admin', 'head_teacher'), deleteGrade);
router.get('/reports', authenticateToken, getStudentReports);
router.post('/reports/midterm/publish', authenticateToken, requireRole('teacher'), publishMidtermReports);

// ==========================================
// 8. Official Announcements (Full CRUD)
// ==========================================
router.get('/announcements', getAnnouncements);
router.post('/announcements', authenticateToken, requireRole('owner', 'super_admin', 'admin', 'head_teacher'), createAnnouncement);
router.put('/announcements/:id', authenticateToken, requireRole('owner', 'super_admin', 'admin', 'head_teacher'), updateAnnouncement);
router.delete('/announcements/:id', authenticateToken, requireRole('owner', 'super_admin', 'admin', 'head_teacher'), deleteAnnouncement);

// ==========================================
// 9. Security Audit Logs (Super Admin / Owner ONLY)
// ==========================================
router.get('/audit-logs', authenticateToken, requireOwnerOnly, getAuditLogs);

// ==========================================
// 10. AI Analytics & Role-Assisted Intelligence
// ==========================================
router.get('/ai/dashboard-insights', authenticateToken, requireRole('admin', 'head_teacher', 'accountant', 'teacher'), getDashboardInsights);
router.post('/ai/role-assistant', authenticateToken, askRoleAssistant);

// ==========================================
// 11. Institutional Settings & Database Backup (Owner ONLY)
// ==========================================
router.get('/system/settings', getSchoolSettings);
router.put('/system/settings', authenticateToken, requireAccountCreator, updateSchoolSetting);
router.get('/system/backup', authenticateToken, requireOwnerOnly, exportDatabaseDump);
router.get('/system/health', getSystemHealth);

export default router;
