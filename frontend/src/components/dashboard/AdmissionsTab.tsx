import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../context/LanguageContext';
import { AdmissionApplication, Student } from '../../types';
import {
  FileCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Sparkles,
  Printer,
  X,
  FileText,
  Building,
  GraduationCap,
  MessageSquare,
  Send,
  Camera,
  Upload,
  ShieldCheck,
  Bot,
  RotateCcw
} from 'lucide-react';

interface AdmissionsTabProps {
  admissions: AdmissionApplication[];
  onApproveAdmission: (admissionId: string, assignedStream: string) => void;
  onRejectAdmission: (admissionId: string) => void;
  onNewAdmission: (application: AdmissionApplication) => Promise<void> | void;
  onAnswerAdmission?: (admissionId: string, decision: 'Approved' | 'Rejected' | 'Under Review', answerText: string, assignedStream?: string) => void;
  currentUserRole?: string;
}

export const AdmissionsTab: React.FC<AdmissionsTabProps> = ({
  admissions,
  onApproveAdmission,
  onRejectAdmission,
  onNewAdmission,
  onAnswerAdmission,
  currentUserRole = 'admin',
}) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Under Review' | 'Rejected'>('All');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAdmissionForLetter, setSelectedAdmissionForLetter] = useState<AdmissionApplication | null>(null);
  const [assignStreamModal, setAssignStreamModal] = useState<AdmissionApplication | null>(null);
  const [selectedStream, setSelectedStream] = useState('Alpha');

  // Admin Answer & Credentials Review Modal State
  const [answeringAdmission, setAnsweringAdmission] = useState<AdmissionApplication | null>(null);
  const [adminDecision, setAdminDecision] = useState<'Approved' | 'Rejected' | 'Under Review'>('Approved');
  const [adminAnswerText, setAdminAnswerText] = useState('');
  const [adminAnswerStream, setAdminAnswerStream] = useState('Alpha');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [admissionPhoto, setAdmissionPhoto] = useState('');
  const [admissionPhotoName, setAdmissionPhotoName] = useState('');
  const [admissionFormError, setAdmissionFormError] = useState('');
  const [isSubmittingAdmission, setIsSubmittingAdmission] = useState(false);

  // New Pupil Form State
  const [form, setForm] = useState({
    applicantName: '',
    gender: 'F' as 'M' | 'F',
    dob: '2020-05-14',
    applyingGrade: 'Primary 1',
    parentName: '',
    parentPhone: '+250 78',
    parentEmail: '',
    district: 'Gatsibo',
    sector: 'Kabarore',
    cell: 'Simbwa',
    village: 'Kibondo',
    previousSchool: 'Kibondo ECD Early Childhood Center',
    birthCertificate: true,
    immunizationCard: true,
    notes: '',
  });

  const pendingCount = admissions.filter(a => a.status === 'Pending').length;

  const filteredAdmissions = admissions.filter(adm => {
    const matchesSearch =
      adm.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.applyingGrade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.village.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || adm.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Open the Admin Answer & Credentials modal with pre-drafted text based on credentials
  const handleOpenAnswerModal = (adm: AdmissionApplication) => {
    setAnsweringAdmission(adm);
    setAdminDecision(adm.status === 'Approved' ? 'Approved' : adm.status === 'Rejected' ? 'Rejected' : 'Approved');
    setAdminAnswerStream(adm.assignedStream?.replace(adm.applyingGrade, '').trim() || 'Alpha');

    if (adm.adminResponse) {
      setAdminAnswerText(adm.adminResponse);
    } else {
      const defaultAnswer = `Dear ${adm.parentName},\n\nThe Office of the Head Teacher at St. Silas Private Primary School EAR Kibondo has officially reviewed the admission credentials for ${adm.applicantName} for ${adm.applyingGrade} from ${adm.village} Village.\n\nWe are pleased to inform you that your child's application is APPROVED for enrollment into ${adm.applyingGrade} (Stream Alpha). Classes include daily fortified school feeding (Ifunguro), foundational literacy, and science kits. Please report to the administrative secretariat on Monday at 7:30 AM with physical vaccination card.\n\nOffice of the Head Teacher - Emmanuel Twahirwa.`;
      setAdminAnswerText(defaultAnswer);
    }
  };

  const handleGenerateAiAnswer = () => {
    if (!answeringAdmission) return;
    setIsAiGenerating(true);

    const adm = answeringAdmission;
    setTimeout(() => {
      let letter = '';
      if (adminDecision === 'Approved') {
        if (language === 'fr') {
          letter = `Chers parents de ${adm.applicantName} (${adm.parentName}),\n\nLa Direction de l'École Primaire Privée St. Silas EAR Kibondo a le plaisir de vous annoncer l'admission officielle de votre enfant en classe de ${adm.applyingGrade} (Section ${adminAnswerStream}) pour l'année scolaire 2026/2027.\n\nRésidant au Village ${adm.village}, votre enfant bénéficiera de notre encadrement bilingue d'excellence (100% de réussite PLE) et du programme de cantine quotidienne chaude (Ifunguro). Veuillez vous présenter au secrétariat le lundi de rentrée dès 07h30 pour retirer la tenue officielle.\n\nDirecteur de l'Établissement - Emmanuel Twahirwa`;
        } else if (language === 'rw') {
          letter = `Banyamuryango ba ${adm.applicantName} (${adm.parentName}),\n\nIbiro by'Umuyobozi w'Ishuri Ryigenga rya St. Silas EAR Kibondo bishimiye kumenyesha ko ubusabe bwanyu bwo kwandikisha umwana mu ishuri rya ${adm.applyingGrade} (Icyiciro ${adminAnswerStream}) bwemewe.\n\nUmwana wanyu atuye mu Mudugudu wa ${adm.village}, azahabwa uburere bw'indashyikirwa (100% gutsinda ikizamini cya Leta) n'ifunguro ryiza ry'amanywa ku ishuri. Muzaze ku biro by'ishuri ku wa Mbere saa moya n'igice za mugitondo (07h30).\n\nUmuyobozi w'Ishuri - Mwalimu Emmanuel Twahirwa`;
        } else {
          letter = `Dear ${adm.parentName},\n\nThe Office of the Head Teacher at St. Silas Private Primary School EAR Kibondo is delighted to officially confirm the admission of ${adm.applicantName} into ${adm.applyingGrade} (Stream ${adminAnswerStream}) for the 2026/2027 academic year.\n\nAs residents of ${adm.village} Village, your child will benefit from our 100% PLE distinction record, Christian values, and daily hot school feeding program (Ifunguro). Please visit the campus on opening Monday at 07:30 AM to collect school uniform and class supplies.\n\nHead Teacher - Emmanuel Twahirwa`;
        }
      } else if (adminDecision === 'Under Review') {
        letter = `Dear ${adm.parentName},\n\nRegarding the admission credentials for ${adm.applicantName} in ${adm.applyingGrade}, the academic board has placed the application under active review. We warmly invite you and your child for a brief physical interaction at our Kibondo campus on Wednesday at 9:00 AM.\n\nHead Teacher - Emmanuel Twahirwa`;
      } else {
        letter = `Dear ${adm.parentName},\n\nThank you for your interest in St. Silas Private Primary School for ${adm.applicantName}. At this moment, classroom capacity for ${adm.applyingGrade} has reached its statutory ceiling. Your child has been placed on our priority waitlist.\n\nHead Teacher - Emmanuel Twahirwa`;
      }

      setAdminAnswerText(letter);
      setIsAiGenerating(false);
    }, 600);
  };

  const handleDispatchOfficialAnswer = () => {
    if (!answeringAdmission) return;

    if (onAnswerAdmission) {
      onAnswerAdmission(
        answeringAdmission.id,
        adminDecision,
        adminAnswerText,
        adminDecision === 'Approved' ? `${answeringAdmission.applyingGrade} ${adminAnswerStream}` : undefined
      );
    } else if (adminDecision === 'Approved') {
      onApproveAdmission(answeringAdmission.id, `${answeringAdmission.applyingGrade} ${adminAnswerStream}`);
    } else if (adminDecision === 'Rejected') {
      onRejectAdmission(answeringAdmission.id);
    }

    if (adminDecision === 'Approved') {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    setToastMessage(`Official decision & feedback email successfully dispatched to ${answeringAdmission.parentEmail || answeringAdmission.parentName}!`);
    setTimeout(() => setToastMessage(null), 4500);
    setAnsweringAdmission(null);
  };

  const handleAdmissionPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAdmissionFormError('Choose a JPEG, PNG, or WebP pupil photo.');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setAdmissionFormError('Pupil photos must be 4 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAdmissionPhoto(reader.result);
        setAdmissionPhotoName(file.name);
        setAdmissionFormError('');
      }
    };
    reader.onerror = () => setAdmissionFormError('The selected pupil photo could not be read.');
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmissionFormError('');
    if (!form.applicantName || !form.parentName || !admissionPhoto) {
      setAdmissionFormError('Complete the required details and choose a pupil photo.');
      return;
    }

    const gradeLevel = form.applyingGrade.includes('Nursery')
      ? 'Nursery'
      : ['Primary 1', 'Primary 2', 'Primary 3'].includes(form.applyingGrade)
      ? 'Lower Primary'
      : 'Upper Primary';

    const newApp: AdmissionApplication = {
      id: `adm-${Date.now()}`,
      applicantName: form.applicantName,
      photoUrl: admissionPhoto,
      gender: form.gender,
      dob: form.dob,
      applyingGrade: form.applyingGrade,
      level: gradeLevel,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      parentEmail: form.parentEmail || `${form.applicantName.toLowerCase().replace(/\s+/g, '.')}@parents.rw`,
      district: form.district,
      sector: form.sector,
      cell: form.cell,
      village: form.village,
      previousSchool: form.previousSchool,
      birthCertificateSubmitted: form.birthCertificate,
      immunizationCardSubmitted: form.immunizationCard,
      status: 'Pending',
      applicationDate: new Date().toISOString().split('T')[0],
      notes: form.notes || 'Submitted via St. Silas Portal.',
    };

    setIsSubmittingAdmission(true);
    try {
      await onNewAdmission(newApp);
      setIsNewModalOpen(false);
      setAdmissionPhoto('');
      setAdmissionPhotoName('');
    } catch (error) {
      setAdmissionFormError(error instanceof Error ? error.message : 'The application could not be saved. Please try again.');
      return;
    } finally {
      setIsSubmittingAdmission(false);
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Live Applicant Beacon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Kibondo Village • Simbwa Cell • Kabarore • Gatsibo</span>
            </div>

            {/* Glowing Applicant Light Beacon: Shows Admin when applicants are pending */}
            {pendingCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span>{pendingCount} Applicant(s) Awaiting Official Answer</span>
              </div>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-heading">
            Student Admissions & Online Applications Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review online applications, inspect parent credentials, and dispatch official answers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Pupil Admission</span>
        </button>
      </div>

      {/* Summary KPI Cards with Status Beacon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Applications</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{admissions.length}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">2026-2027 Academic Year</span>
        </div>

        {/* Pending Review with Glowing Active Light */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Review</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </p>
          <span className="text-[10px] text-slate-400">Click applicant to answer</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Approved & Enrolled</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {admissions.filter(a => a.status === 'Approved').length}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Enrolled into P1 - P6</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-bold text-sky-600 uppercase">Kibondo & Simbwa</span>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {admissions.filter(a => a.village.toLowerCase().includes('kibondo') || a.cell?.toLowerCase().includes('simbwa')).length}
          </p>
          <span className="text-[10px] text-slate-400">Local Village Community</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search pupil name, parent, village or grade..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Pending', 'Approved', 'Under Review', 'Rejected'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Admissions Table with Live Beacon Lights and "Review & Answer" actions */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3.5 px-4">Applicant Pupil</th>
                <th className="py-3.5 px-4">Grade & Stream</th>
                <th className="py-3.5 px-4">Parent / Guardian</th>
                <th className="py-3.5 px-4">Village Location</th>
                <th className="py-3.5 px-4">Status & Beacon</th>
                <th className="py-3.5 px-4 text-right">Official Decision & Answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredAdmissions.length > 0 ? (
                filteredAdmissions.map(adm => {
                  const isPending = adm.status === 'Pending';
                  const hasAnswer = Boolean(adm.adminResponse);

                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {/* Active Beacon Dot on Avatar */}
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                              {adm.applicantName.charAt(0)}
                            </div>
                            {isPending && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {adm.applicantName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              DOB: {adm.dob} • Gender: {adm.gender}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                          {adm.applyingGrade}
                        </span>
                        {adm.assignedStream && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Stream: {adm.assignedStream}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {adm.parentName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {adm.parentPhone}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {adm.village}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {adm.cell} Cell, {adm.sector}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              adm.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : adm.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : adm.status === 'Under Review'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {isPending ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                            ) : adm.status === 'Approved' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{adm.status}</span>
                          </span>

                          {hasAnswer && (
                            <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                              ✓ Answered by Head Teacher
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Answer / Review Applicant Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenAnswerModal(adm)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all cursor-pointer"
                            title="Answer applicant according to credentials"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{hasAnswer ? 'Update Answer' : 'Answer Applicant'}</span>
                          </button>

                          {adm.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => setSelectedAdmissionForLetter(adm)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                              title="Print Official Admission Letter"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Letter</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    No admission applications found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Admission Decision & Answer Modal (Answering according to credentials) */}
      <AnimatePresence>
        {answeringAdmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      Official Decision & Answer to Applicant
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Answer parent according to submitted pupil credentials
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnsweringAdmission(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Applicant Credentials Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Submitted Applicant Credentials
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pupil Full Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{answeringAdmission.applicantName}</span>
                    <span className="text-[10px] text-slate-400 block">({answeringAdmission.gender === 'F' ? 'Female' : 'Male'}, DOB: {answeringAdmission.dob})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Applying Class / Grade:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{answeringAdmission.applyingGrade}</span>
                    <span className="text-[10px] text-slate-400 block">Level: {answeringAdmission.level}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Parent / Guardian:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{answeringAdmission.parentName}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">{answeringAdmission.parentPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Village & Cell Location:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{answeringAdmission.village}</span>
                    <span className="text-[10px] text-slate-400 block">{answeringAdmission.cell} Cell, {answeringAdmission.sector}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Previous School / Center:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{answeringAdmission.previousSchool || 'Home / Kibondo ECD'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Verification Status:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Birth Cert & Immunization Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Decision Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Admission Decision:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminDecision('Approved')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adminDecision === 'Approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Admit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminDecision('Under Review')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adminDecision === 'Under Review'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Under Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminDecision('Rejected')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adminDecision === 'Rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Waitlist / Decline</span>
                  </button>
                </div>
              </div>

              {/* Stream Selection if Approved */}
              {adminDecision === 'Approved' && (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Allocated Stream for {answeringAdmission.applyingGrade}:
                  </span>
                  <div className="flex gap-2">
                    {['Alpha', 'Beta'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAdminAnswerStream(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          adminAnswerStream === st
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Answer Body with AI Assist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Official Message / Decision Letter to Parent:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiAnswer}
                    disabled={isAiGenerating}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Regenerate with AI</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={adminAnswerText}
                  onChange={e => setAdminAnswerText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAnsweringAdmission(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchOfficialAnswer}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Official Answer & Update Status</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Existing New Pupil Modal and Letter Modals remain intact */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Register New Pupil Application
                  </h3>
                  <p className="text-xs text-slate-500">
                    St. Silas Private Primary School • Kibondo Campus
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {admissionFormError && (
                  <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {admissionFormError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pupil Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Keza Aline"
                      value={form.applicantName}
                      onChange={e => setForm({ ...form, applicantName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Applying Grade *
                    </label>
                    <select
                      value={form.applyingGrade}
                      onChange={e => setForm({ ...form, applyingGrade: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {['Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pupil Profile Photo *
                  </label>
                  <div className="flex items-center gap-3">
                    {admissionPhoto ? (
                      <img src={admissionPhoto} alt="Pupil profile preview" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <label htmlFor="admission-pupil-photo" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {admissionPhoto ? 'Change Photo' : 'Choose Photo'}
                      </label>
                      <input
                        id="admission-pupil-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAdmissionPhotoChange}
                        className="sr-only"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">{admissionPhotoName || 'JPEG, PNG, or WebP; maximum 4 MB'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parent / Guardian Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Emmanuel Habimana"
                      value={form.parentName}
                      onChange={e => setForm({ ...form, parentName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Parent Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+250 788 123 456"
                      value={form.parentPhone}
                      onChange={e => setForm({ ...form, parentPhone: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdmission}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {isSubmittingAdmission ? 'Submitting...' : 'Register Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Admission Letter Modal for Approved Students */}
      <AnimatePresence>
        {selectedAdmissionForLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl bg-white text-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none"
            >
              <div className="flex items-center justify-between border-b pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Official Admission Letter
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Letter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAdmissionForLetter(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase">
                    ST. SILAS PRIVATE PRIMARY SCHOOL
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    EAR Kibondo Parish • Gatsibo District • REB Center Code: 530413
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="font-bold text-slate-900">
                    PROVISIONAL ADMISSION CONFIRMATION
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Pupil: <strong>{selectedAdmissionForLetter.applicantName}</strong> has been granted admission into{' '}
                    <strong>{selectedAdmissionForLetter.assignedStream || selectedAdmissionForLetter.applyingGrade}</strong>.
                  </p>
                </div>

                {selectedAdmissionForLetter.adminResponse && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-900 block mb-1">
                      Direct Note from Head Teacher Emmanuel Twahirwa:
                    </span>
                    <p className="whitespace-pre-line text-emerald-800">
                      {selectedAdmissionForLetter.adminResponse}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
