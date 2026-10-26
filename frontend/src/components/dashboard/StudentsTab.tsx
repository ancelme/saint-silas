import React, { useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Student, SchoolLevel } from '../../types';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  X,
  Check,
  GraduationCap,
  Baby,
  BookOpen,
  ImagePlus,
  LoaderCircle
} from 'lucide-react';

interface StudentsTabProps {
  students: Student[];
  onAddStudent: (newStudent: Student) => Promise<void> | void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
  isParentView?: boolean;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  isParentView = false,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'All' | SchoolLevel>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // New Student Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'F' as 'M' | 'F',
    dob: '2019-05-15',
    grade: 'Primary 1',
    section: 'Alpha (Kibondo)',
    parentName: '',
    parentPhone: '+250 788 ',
    parentEmail: '',
    address: 'Kibondo Village, Simbwa Cell, Kabarore, Gatsibo',
  });

  const allGrades = [
    'All',
    'Nursery 1',
    'Nursery 2',
    'Nursery 3',
    'Primary 1',
    'Primary 2',
    'Primary 3',
    'Primary 4',
    'Primary 5',
    'Primary 6'
  ];

  const getLevelForGrade = (grade: string): SchoolLevel => {
    if (grade.includes('Nursery')) return 'Nursery';
    if (['Primary 1', 'Primary 2', 'Primary 3'].includes(grade)) return 'Lower Primary';
    return 'Upper Primary';
  };

  const filtered = students.filter(s => {
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = selectedLevel === 'All' || s.level === selectedLevel;
    const matchesGrade = selectedGrade === 'All' || s.grade === selectedGrade;

    return matchesSearch && matchesLevel && matchesGrade;
  });

  const handlePhotoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setPhotoError('The pupil photo must be 4 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setPhotoError('');
        setSubmitError('');
      } else {
        setPhotoError('Unable to read this image. Please select it again.');
      }
    };
    reader.onerror = () => setPhotoError('Unable to read this image. Please select it again.');
    reader.readAsDataURL(file);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;
    if (!photoUrl) {
      setPhotoError('Upload a pupil photo before completing enrollment.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);

    const level = getLevelForGrade(form.grade);
    const codePrefix = form.grade.startsWith('Nursery') ? 'N' : 'P';
    const num = form.grade.replace(/[^0-9]/g, '');

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      rollNo: `SSP-2026-${codePrefix}${num}-${Math.floor(100 + Math.random() * 900)}`,
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      dob: form.dob,
      grade: form.grade,
      level: level,
      section: form.section,
      parentName: form.parentName || 'Guardian',
      parentPhone: form.parentPhone || '+250 788 000 000',
      parentEmail: form.parentEmail || `${form.firstName.toLowerCase()}@parents.rw`,
      address: form.address,
      status: 'Active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      feeStatus: 'Pending',
      photoUrl,
      attendanceRate: 100,
      overallGPA: 88.0,
    };

    try {
      await onAddStudent(newStudent);
      setIsEnrollModalOpen(false);
      setPhotoUrl('');
      setForm({
        firstName: '',
        lastName: '',
        gender: 'F',
        dob: '2019-05-15',
        grade: 'Primary 1',
        section: 'Alpha (Kibondo)',
        parentName: '',
        parentPhone: '+250 788 ',
        parentEmail: '',
        address: 'Kibondo Village, Simbwa Cell, Kabarore, Gatsibo',
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to enroll this pupil. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('dashStudents')}
          </h2>
          <p className="text-xs text-slate-500">
            {isParentView
              ? `${students.length} linked ${students.length === 1 ? 'pupil' : 'pupils'}`
              : `${students.length} pupils enrolled across Nursery, Lower Primary, and Upper Primary`}
          </p>
        </div>

        {!isParentView && (
          <button
            type="button"
            onClick={() => setIsEnrollModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Pupil</span>
          </button>
        )}
      </div>

      {/* Level Filter Tabs */}
      <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setSelectedLevel('All'); setSelectedGrade('All'); }}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
            selectedLevel === 'All'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All Levels ({students.length})
        </button>
        <button
          type="button"
          onClick={() => { setSelectedLevel('Nursery'); setSelectedGrade('All'); }}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            selectedLevel === 'Nursery'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Baby className="w-3.5 h-3.5" />
          <span>Nursery ECD (N1-N3)</span>
        </button>
        <button
          type="button"
          onClick={() => { setSelectedLevel('Lower Primary'); setSelectedGrade('All'); }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            selectedLevel === 'Lower Primary'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lower Primary (P1-P3)</span>
        </button>
        <button
          type="button"
          onClick={() => { setSelectedLevel('Upper Primary'); setSelectedGrade('All'); }}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            selectedLevel === 'Upper Primary'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Upper Primary (P4-P6)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={t('dashSearchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Grade Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 whitespace-nowrap">Class Stream:</span>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {allGrades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Pupil Info</th>
                <th className="px-6 py-4">Level & Class</th>
                {!isParentView && <th className="px-6 py-4">Parent / Guardian</th>}
                <th className="px-6 py-4">Residence (Gatsibo)</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4">Feeding & Fees</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.map(student => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.photoUrl}
                        alt={student.firstName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {student.rollNo}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {student.grade}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {student.level} • {student.section}
                    </span>
                  </td>
                  {!isParentView && (
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {student.parentName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {student.parentPhone}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate max-w-[170px]">{student.address}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {student.attendanceRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        student.feeStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : student.feeStatus === 'Partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {student.feeStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveStudent(student)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pupil Profile Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              type="button"
              onClick={() => setActiveStudent(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <img
                src={activeStudent.photoUrl}
                alt={activeStudent.firstName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-600 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeStudent.firstName} {activeStudent.lastName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Roll No: {activeStudent.rollNo} • Level: {activeStudent.level}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {activeStudent.grade} ({activeStudent.section})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-slate-500">Date of Birth:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{activeStudent.dob}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-slate-500">Average Academic Score:</span>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{activeStudent.overallGPA}%</p>
              </div>
            </div>

            {!isParentView && <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white">Parent & Residential Details (Gatsibo)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <span className="text-slate-500">Parent / Guardian:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{activeStudent.parentName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500">Telephone:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{activeStudent.parentPhone}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-slate-500">Village & Sector Address:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{activeStudent.address}</p>
                </div>
              </div>
            </div>}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveStudent(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Pupil Enrollment Modal */}
      {!isParentView && isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Enroll New Pupil
              </h3>
              <p className="text-xs text-slate-500">
                Register pupil into St. Silas Primary School database (Kibondo, Simbwa, Gatsibo).
              </p>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              {submitError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name (Izina) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aline"
                    value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name (Irimbi) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Keza"
                    value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pupil photo <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Selected pupil photo preview" className="h-14 w-14 rounded-xl border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-900">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {photoUrl ? 'Photo ready for enrollment' : 'Upload a clear, recent pupil photo'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">JPEG, PNG, or WebP · maximum 4 MB</p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="mt-2 inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:ring-slate-700 dark:hover:bg-emerald-950/40"
                    >
                      {photoUrl ? 'Choose another photo' : 'Choose photo'}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelected}
                      className="sr-only"
                      aria-label="Upload pupil photo"
                    />
                  </div>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label="Remove selected pupil photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {photoError && <p role="alert" className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{photoError}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="F">Female (Gore)</option>
                    <option value="M">Male (Gabo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class / Stream
                  </label>
                  <select
                    value={form.grade}
                    onChange={e => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <optgroup label="Nursery (ECD / Inshuke)">
                      <option value="Nursery 1">Nursery 1 (Baby Class)</option>
                      <option value="Nursery 2">Nursery 2 (Middle Class)</option>
                      <option value="Nursery 3">Nursery 3 (Top Class)</option>
                    </optgroup>
                    <optgroup label="Lower Primary (Abanza yo Hasi)">
                      <option value="Primary 1">Primary 1 (P1)</option>
                      <option value="Primary 2">Primary 2 (P2)</option>
                      <option value="Primary 3">Primary 3 (P3)</option>
                    </optgroup>
                    <optgroup label="Upper Primary (Abanza yo Hejuru)">
                      <option value="Primary 4">Primary 4 (P4)</option>
                      <option value="Primary 5">Primary 5 (P5)</option>
                      <option value="Primary 6">Primary 6 (P6 PLE)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={form.section}
                    onChange={e => setForm({ ...form, section: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option>Alpha (Kibondo)</option>
                    <option>Beta (Simbwa)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emmanuel Habimana"
                    value={form.parentName}
                    onChange={e => setForm({ ...form, parentName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Mobile (+250 78/73/72...)
                  </label>
                  <input
                    type="tel"
                    placeholder="+250 788 564 890"
                    value={form.parentPhone}
                    onChange={e => setForm({ ...form, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Village / Cell (Aho Batuye)
                </label>
                <input
                  type="text"
                  placeholder="Kibondo Village, Simbwa Cell, Kabarore, Gatsibo"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEnrollModalOpen(false);
                    setSubmitError('');
                    setPhotoError('');
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !photoUrl}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <LoaderCircle className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
                  {isSubmitting ? 'Saving pupil…' : 'Complete Pupil Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
