import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/public/Navbar';
import { Hero } from './components/public/Hero';
import { About } from './components/public/About';
import { Academics } from './components/public/Academics';
import { Admissions } from './components/public/Admissions';
import { NewsEvents } from './components/public/NewsEvents';
import { Contact } from './components/public/Contact';
import { Footer } from './components/public/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { NationalSuccess } from './components/public/NationalSuccess';
import { HomeInteractiveFeatures } from './components/public/HomeInteractiveFeatures';
import { GoogleMapModal } from './components/common/GoogleMapModal';
import { AppSuccessToast, notifySuccess } from './components/common/AppSuccessToast';

import {
  Student,
  Teacher,
  FeeInvoice,
  AttendanceRecord,
  GradeEntry,
  SchoolEvent,
  Announcement,
  TimetableSlot,
  AdmissionApplication,
} from './types';

import {
  fetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  archiveStudent as apiArchiveStudent,
  fetchTeachers,
  createTeacher as apiCreateTeacher,
  updateTeacher as apiUpdateTeacher,
  deleteTeacher as apiDeleteTeacher,
  fetchFees,
  createFeeInvoice as apiCreateFeeInvoice,
  updateFeeInvoice as apiUpdateFeeInvoice,
  deleteFeeInvoice as apiDeleteFeeInvoice,
  recordPayment as apiRecordPayment,
  fetchAttendance,
  saveAttendance as apiSaveAttendance,
  fetchGrades,
  saveGrade as apiSaveGrade,
  fetchAnnouncements,
  createAnnouncement as apiCreateAnnouncement,
  updateAnnouncement as apiUpdateAnnouncement,
  deleteAnnouncement as apiDeleteAnnouncement,
  fetchSchoolEvents,
  saveSchoolEvents as apiSaveSchoolEvents,
  fetchTimetable,
  saveTimetable as apiSaveTimetable,
  fetchAdmissions,
  submitAdmission as apiSubmitAdmission,
  answerAdmission as apiAnswerAdmission,
  deleteAdmission as apiDeleteAdmission,
} from './services/api';

import { INITIAL_EVENTS, INITIAL_TIMETABLE } from './data/mockData';

const MainApp: React.FC = () => {
  const { user, isOwnerConfigured } = useAuth();

  // Mode: 'public' or 'dashboard'
  const [viewMode, setViewMode] = useState<'public' | 'dashboard'>('public');

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'setup'>('login');

  // Interactive Google Map Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Database-driven domain states (loaded via REST API from MySQL / SQL backend)
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [fees, setFees] = useState<FeeInvoice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionApplication[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>(INITIAL_EVENTS);
  const [timetable, setTimetable] = useState<TimetableSlot[]>(INITIAL_TIMETABLE);

  useEffect(() => {
    setStudents([]);
    setTeachers([]);
    setFees([]);
    setAttendance([]);
    setGrades([]);
    setAnnouncements([]);
    setAdmissions([]);
    setTimetable([]);
    if (!user) return;

    let isCurrentUser = true;
    const loadDatabaseData = async () => {
      try {
        const canViewTeachers = ['owner', 'super_admin', 'admin', 'head_teacher'].includes(user.role);
        const canViewAdmissions = ['owner', 'super_admin', 'admin', 'head_teacher'].includes(user.role);
        const [
          studentsData,
          teachersData,
          feesData,
          attendanceData,
          gradesData,
          announcementsData,
          admissionsData,
          timetableData,
        ] = await Promise.allSettled([
          fetchStudents(),
          canViewTeachers ? fetchTeachers() : Promise.resolve([]),
          fetchFees(),
          fetchAttendance(),
          fetchGrades(),
          fetchAnnouncements(),
          canViewAdmissions ? fetchAdmissions() : Promise.resolve([]),
          fetchTimetable(),
        ]);

        if (!isCurrentUser) return;
        if (studentsData.status === 'fulfilled') setStudents(studentsData.value);
        if (teachersData.status === 'fulfilled') setTeachers(teachersData.value);
        if (feesData.status === 'fulfilled') setFees(feesData.value);
        if (attendanceData.status === 'fulfilled') setAttendance(attendanceData.value);
        if (gradesData.status === 'fulfilled') setGrades(gradesData.value);
        if (announcementsData.status === 'fulfilled') setAnnouncements(announcementsData.value);
        if (admissionsData.status === 'fulfilled') setAdmissions(admissionsData.value);
        if (timetableData.status === 'fulfilled') {
          setTimetable(timetableData.value ?? (user.role === 'parent' ? [] : INITIAL_TIMETABLE));
        }
      } catch (err) {
        if (isCurrentUser) console.warn('Error fetching live data from backend:', err);
      }
    };

    void loadDatabaseData();
    return () => {
      isCurrentUser = false;
    };
  }, [user]);

  useEffect(() => {
    fetchSchoolEvents()
      .then(savedEvents => {
        if (savedEvents !== null) setEvents(savedEvents);
      })
      .catch(error => console.error('Failed to load public school events:', error));
  }, []);

  // If system has no owner configured, prompt setup wizard
  useEffect(() => {
    if (!isOwnerConfigured) {
      setAuthModalTab('setup');
      setIsAuthModalOpen(true);
    }
  }, [isOwnerConfigured]);

  // If user logs in, switch to dashboard automatically
  useEffect(() => {
    if (user) {
      setViewMode('dashboard');
    } else {
      setViewMode('public');
    }
  }, [user]);

  // Handlers
  const handleOpenAuth = (tab: 'login' | 'setup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      const res = await apiCreateStudent(newStudent);
      if (res && res.student) {
        setStudents(prev => [res.student, ...prev]);
      } else {
        setStudents(prev => [newStudent, ...prev]);
      }
      notifySuccess(`Pupil ${newStudent.firstName} ${newStudent.lastName} enrolled successfully.`);
    } catch (e) {
      console.error('Failed to create student via API:', e);
      throw e;
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      await apiUpdateStudent(updatedStudent.id, updatedStudent);
      setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
      notifySuccess(`Pupil ${updatedStudent.firstName} ${updatedStudent.lastName} updated successfully.`);
    } catch (e) {
      console.error('Failed to update student via API:', e);
      setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await apiArchiveStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      notifySuccess('Pupil record archived successfully.');
    } catch (e) {
      console.error('Failed to archive student via API:', e);
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddTeacher = async (newTeacher: Teacher) => {
    try {
      const res = await apiCreateTeacher(newTeacher);
      if (res && res.teacher) {
        setTeachers(prev => [res.teacher, ...prev]);
      } else {
        setTeachers(prev => [newTeacher, ...prev]);
      }
      notifySuccess(`Teacher ${newTeacher.name} added successfully.`);
    } catch (e) {
      console.error('Failed to create teacher via API:', e);
      setTeachers(prev => [newTeacher, ...prev]);
    }
  };

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    try {
      await apiUpdateTeacher(updatedTeacher.id, updatedTeacher);
      setTeachers(prev => prev.map(t => (t.id === updatedTeacher.id ? updatedTeacher : t)));
      notifySuccess(`Teacher ${updatedTeacher.name} updated successfully.`);
    } catch (e) {
      console.error('Failed to update teacher via API:', e);
      setTeachers(prev => prev.map(t => (t.id === updatedTeacher.id ? updatedTeacher : t)));
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await apiDeleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      notifySuccess('Teacher record deleted successfully.');
    } catch (e) {
      console.error('Failed to delete teacher via API:', e);
      setTeachers(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveAttendance = async (newRecords: AttendanceRecord[]) => {
    try {
      await apiSaveAttendance(newRecords);
      notifySuccess('Attendance records saved successfully.');
      setAttendance(prev => {
        const recordMap = new Map<string, AttendanceRecord>();
        prev.forEach(r => recordMap.set(r.id, r));
        newRecords.forEach(r => recordMap.set(r.id, r));
        return Array.from(recordMap.values());
      });
      // Refresh students to update attendance rate
      fetchStudents().then(res => setStudents(res)).catch(() => {});
    } catch (e) {
      console.error('Failed to save attendance via API:', e);
      throw e;
    }
  };

  const handleSaveTimetable = async (updatedTimetable: TimetableSlot[]) => {
    await apiSaveTimetable(updatedTimetable);
    setTimetable(updatedTimetable);
    notifySuccess('School timetable saved successfully.');
  };

  const handleSaveSchoolEvents = async (updatedEvents: SchoolEvent[]) => {
    await apiSaveSchoolEvents(updatedEvents);
    setEvents(updatedEvents);
    notifySuccess('School calendar events saved successfully.');
  };

  const handleUpdateGrade = async (updatedGrade: GradeEntry) => {
    try {
      await apiSaveGrade({
        studentId: updatedGrade.studentId,
        subject: updatedGrade.subject,
        marks: updatedGrade.marks !== undefined ? updatedGrade.marks : (updatedGrade.totalScore || 85),
        remarks: updatedGrade.remarks
      });
      setGrades(prev => prev.map(g => (g.id === updatedGrade.id ? updatedGrade : g)));
      notifySuccess('Pupil grade saved successfully.');
    } catch (e) {
      console.error('Failed to save grade via API:', e);
      setGrades(prev => prev.map(g => (g.id === updatedGrade.id ? updatedGrade : g)));
    }
  };

  const handleRecordPayment = async (
    invoiceId: string,
    amount: number,
    method: 'MTN Mobile Money' | 'Airtel Money' | 'Bank Transfer' | 'Cash',
    referenceNo?: string,
    phoneNumber?: string,
  ) => {
    const result = await apiRecordPayment({
      invoiceId,
      amount,
      paymentMethod: method,
      referenceNo,
      phoneNumber,
    });
    setFees(prev => prev.map(f => {
      if (f.id !== invoiceId) return f;
      return {
        ...f,
        amountPaid: result.amountPaid,
        balance: result.newBalance,
        status: result.status as FeeInvoice['status'],
        paymentMethod: result.paymentMethod,
      };
    }));
    notifySuccess('Payment recorded successfully.');
    return result.referenceNo;
  };

  const handleAddFeeInvoice = async (invoice: FeeInvoice) => {
    try {
      const res = await apiCreateFeeInvoice({
        studentId: invoice.studentId || '',
        title: invoice.title || 'Term Tuition Fee',
        amountTotal: invoice.amountTotal,
        dueDate: invoice.dueDate
      });
      if (res && res.invoice) {
        setFees(prev => [res.invoice, ...prev]);
      } else {
        setFees(prev => [invoice, ...prev]);
      }
      notifySuccess('Fee invoice created successfully.');
    } catch (e) {
      console.error('Failed to create fee invoice via API:', e);
      setFees(prev => [invoice, ...prev]);
    }
  };

  const handleUpdateFeeInvoice = async (invoice: FeeInvoice) => {
    try {
      await apiUpdateFeeInvoice(invoice.id, invoice);
      setFees(prev => prev.map(f => f.id === invoice.id ? invoice : f));
      notifySuccess('Fee invoice updated successfully.');
    } catch (e) {
      console.error('Failed to update fee invoice via API:', e);
      setFees(prev => prev.map(f => f.id === invoice.id ? invoice : f));
    }
  };

  const handleDeleteFeeInvoice = async (id: string) => {
    try {
      await apiDeleteFeeInvoice(id);
      setFees(prev => prev.filter(f => f.id !== id));
      notifySuccess('Fee invoice deleted successfully.');
    } catch (e) {
      console.error('Failed to delete fee invoice via API:', e);
      setFees(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleAddAnnouncement = async (newAnnouncement: Announcement) => {
    try {
      const res = await apiCreateAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        targetAudience: newAnnouncement.targetRole || 'All',
        category: 'Academic'
      });
      if (res && res.announcement) {
        setAnnouncements(prev => [res.announcement, ...prev]);
      } else {
        setAnnouncements(prev => [newAnnouncement, ...prev]);
      }
      notifySuccess('Announcement published successfully.');
    } catch (e) {
      console.error('Failed to create announcement via API:', e);
      setAnnouncements(prev => [newAnnouncement, ...prev]);
    }
  };

  const handleUpdateAnnouncement = async (updated: Announcement) => {
    try {
      await apiUpdateAnnouncement(updated.id, updated);
      setAnnouncements(prev => prev.map(a => a.id === updated.id ? updated : a));
      notifySuccess('Announcement updated successfully.');
    } catch (e) {
      console.error('Failed to update announcement via API:', e);
      setAnnouncements(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await apiDeleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      notifySuccess('Announcement deleted successfully.');
    } catch (e) {
      console.error('Failed to delete announcement via API:', e);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleDeleteAdmission = async (id: string) => {
    try {
      await apiDeleteAdmission(id);
      setAdmissions(prev => prev.filter(a => a.id !== id));
      notifySuccess('Admission application deleted successfully.');
    } catch (e) {
      console.error('Failed to delete admission via API:', e);
      setAdmissions(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleNewAdmission = async (newApp: AdmissionApplication) => {
    try {
      await apiSubmitAdmission(newApp);
      const updatedAdmissions = await fetchAdmissions();
      setAdmissions(updatedAdmissions);
      notifySuccess(`Admission application for ${newApp.applicantName} submitted successfully.`);
    } catch (e) {
      console.error('Failed to submit admission via API:', e);
      setAdmissions(prev => [newApp, ...prev]);
    }
  };

  const handleApproveAdmission = async (admissionId: string, assignedStream: string) => {
    try {
      await apiAnswerAdmission(admissionId, {
        decision: 'Approved',
        answerText: 'Congratulations! Your admission has been reviewed and officially approved.',
        assignedStream
      });
      const [updatedAdmissions, updatedStudents] = await Promise.all([
        fetchAdmissions(),
        fetchStudents()
      ]);
      setAdmissions(updatedAdmissions);
      setStudents(updatedStudents);
      notifySuccess('Admission approved and pupil enrollment updated successfully.');
    } catch (e) {
      console.error('Failed to approve admission via API:', e);
    }
  };

  const handleRejectAdmission = async (admissionId: string) => {
    try {
      await apiAnswerAdmission(admissionId, {
        decision: 'Rejected',
        answerText: 'Thank you for your application. Unfortunately, enrollment capacity has been reached.',
      });
      const updatedAdmissions = await fetchAdmissions();
      setAdmissions(updatedAdmissions);
      notifySuccess('Admission application rejected and decision saved successfully.');
    } catch (e) {
      console.error('Failed to reject admission via API:', e);
    }
  };

  const handleAnswerAdmission = async (
    admissionId: string,
    decision: 'Approved' | 'Rejected' | 'Under Review',
    answerText: string,
    assignedStream?: string
  ) => {
    try {
      await apiAnswerAdmission(admissionId, {
        decision,
        answerText,
        assignedStream
      });
      const [updatedAdmissions, updatedStudents] = await Promise.all([
        fetchAdmissions(),
        fetchStudents()
      ]);
      setAdmissions(updatedAdmissions);
      setStudents(updatedStudents);
      notifySuccess(`Admission decision "${decision}" saved successfully.`);
    } catch (e) {
      console.error('Failed to answer admission via API:', e);
    }
  };

  // Render Dashboard View if authenticated and in dashboard mode
  if (user && viewMode === 'dashboard') {
    return (
      <DashboardLayout
        students={students}
        teachers={teachers}
        fees={fees}
        attendance={attendance}
        grades={grades}
        events={events}
        announcements={announcements}
        timetable={timetable}
        admissions={admissions}
        onAddStudent={handleAddStudent}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
        onAddTeacher={handleAddTeacher}
        onUpdateTeacher={handleUpdateTeacher}
        onDeleteTeacher={handleDeleteTeacher}
        onSaveAttendance={handleSaveAttendance}
        onSaveTimetable={handleSaveTimetable}
        onSaveSchoolEvents={handleSaveSchoolEvents}
        onUpdateGrade={handleUpdateGrade}
        onRecordPayment={handleRecordPayment}
        onAddFeeInvoice={handleAddFeeInvoice}
        onUpdateFeeInvoice={handleUpdateFeeInvoice}
        onDeleteFeeInvoice={handleDeleteFeeInvoice}
        onAddAnnouncement={handleAddAnnouncement}
        onUpdateAnnouncement={handleUpdateAnnouncement}
        onDeleteAnnouncement={handleDeleteAnnouncement}
        onApproveAdmission={handleApproveAdmission}
        onRejectAdmission={handleRejectAdmission}
        onNewAdmission={handleNewAdmission}
        onDeleteAdmission={handleDeleteAdmission}
        onAnswerAdmission={handleAnswerAdmission}
        onSwitchToPublic={() => setViewMode('public')}
      />
    );
  }

  // Otherwise, render Public-facing website
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Public Navbar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onNavigateToDashboard={() => setViewMode('dashboard')}
        onOpenMap={() => setIsMapModalOpen(true)}
      />

      {/* Main Public Sections */}
      <main className="flex-1">
        <Hero
          onOpenAuth={handleOpenAuth}
          onOpenMap={() => setIsMapModalOpen(true)}
        />
        <NationalSuccess onOpenAuth={handleOpenAuth} />
        <HomeInteractiveFeatures onOpenAuth={handleOpenAuth} />
        <About />
        <Academics />
        <Admissions onOpenAuth={handleOpenAuth} onNewAdmission={handleNewAdmission} />
        <NewsEvents events={events} />
        <Contact onOpenMap={() => setIsMapModalOpen(true)} />
      </main>

      {/* Public Footer */}
      <Footer onOpenAuth={handleOpenAuth} />

      {/* Interactive Google Map Modal */}
      <GoogleMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />

      {/* Branded Authentication Gate & Owner Setup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setViewMode('dashboard');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
          <AppSuccessToast />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
