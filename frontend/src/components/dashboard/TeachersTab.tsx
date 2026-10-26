import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Teacher, SchoolLevel } from '../../types';
import { Search, Plus, Mail, Phone, BookOpen, GraduationCap, X, Camera, Upload } from 'lucide-react';

interface TeachersTabProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => Promise<void> | void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onDeleteTeacher?: (id: string) => void;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({ teachers, onAddTeacher }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [teacherAvatar, setTeacherAvatar] = useState('');
  const [teacherAvatarName, setTeacherAvatarName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '+250 788 ',
    subject: '',
    department: 'Upper Primary (P4 - P6 Sciences)',
    level: 'Upper Primary' as SchoolLevel | 'All',
    qualification: 'Bachelor in Primary Education (UR-CE)',
    assignedClasses: 'Primary 5 Alpha, Primary 6 Candidates',
  });

  const filtered = teachers.filter(tch =>
    tch.name.toLowerCase().includes(search.toLowerCase()) ||
    (tch.subject || tch.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
    (tch.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTeacher.name || !newTeacher.subject || !teacherAvatar) {
      setFormError('Enter the teacher name and subject, and select a profile photo.');
      return;
    }

    const teacherObj: Teacher = {
      id: `tch-${Date.now()}`,
      name: newTeacher.name,
      email: newTeacher.email || `${newTeacher.name.toLowerCase().replace(/\s+/g, '.')}@stsilaskibondo.rw`,
      phone: newTeacher.phone,
      subject: newTeacher.subject,
      department: newTeacher.department,
      level: newTeacher.level,
      qualification: newTeacher.qualification || 'Diploma in Primary Education',
      assignedClasses: newTeacher.assignedClasses.split(',').map(s => s.trim()),
      status: 'Active',
      avatar: teacherAvatar,
      joinDate: new Date().toISOString().split('T')[0],
    };

    setIsSaving(true);
    try {
      await onAddTeacher(teacherObj);
      setIsAddModalOpen(false);
      setTeacherAvatar('');
      setTeacherAvatarName('');
      setNewTeacher({
        name: '',
        email: '',
        phone: '+250 788 ',
        subject: '',
        department: 'Upper Primary (P4 - P6 Sciences)',
        level: 'Upper Primary',
        qualification: 'Bachelor in Primary Education (UR-CE)',
        assignedClasses: 'Primary 5 Alpha, Primary 6 Candidates',
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Teacher could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Choose a JPEG, PNG, or WebP profile photo.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Profile photos must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTeacherAvatar(reader.result);
        setTeacherAvatarName(file.name);
        setFormError('');
      }
    };
    reader.onerror = () => setFormError('The selected profile photo could not be read.');
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('dashTeachers')}
          </h2>
          <p className="text-xs text-slate-500">
            {teachers.length} certified primary & early childhood educators at St. Silas Kibondo
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Appoint Primary Educator</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search educator by name, subject, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(teacher => (
          <div
            key={teacher.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start gap-4">
              <img
                src={teacher.avatar}
                alt={teacher.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600/40"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {teacher.name}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                  {teacher.subject}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {teacher.department}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{teacher.qualification}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{teacher.email}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{teacher.phone}</span>
              </div>
            </div>

            {/* Assigned Classes */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Assigned Streams:
              </span>
              <div className="flex flex-wrap gap-1">
                {(teacher.assignedClasses || teacher.assignedGrades || ['All Streams']).map((cls, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {cls}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Appoint Primary Teacher
              </h3>
              <p className="text-xs text-slate-500">
                Add certified faculty to St. Silas Primary School staff roster.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formError}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teacher Profile Photo *
                </label>
                <div className="flex items-center gap-3">
                  {teacherAvatar ? (
                    <img src={teacherAvatar} alt="Teacher profile preview" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="teacher-profile-photo" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {teacherAvatar ? 'Change Photo' : 'Choose Photo'}
                    </label>
                    <input
                      id="teacher-profile-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">{teacherAvatarName || 'JPEG, PNG, or WebP; maximum 5 MB'}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teacher Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jean Bosco Mugabo"
                  value={newTeacher.name}
                  onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics & SET"
                    value={newTeacher.subject}
                    onChange={e => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Education Level
                  </label>
                  <select
                    value={newTeacher.level}
                    onChange={e => setNewTeacher({ ...newTeacher, level: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Nursery">Nursery Section (ECD)</option>
                    <option value="Lower Primary">Lower Primary (P1 - P3)</option>
                    <option value="Upper Primary">Upper Primary (P4 - P6)</option>
                    <option value="All">All School Levels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={newTeacher.department}
                  onChange={e => setNewTeacher({ ...newTeacher, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Nursery Section (Inshuke)">Nursery Section (Inshuke)</option>
                  <option value="Lower Primary (P1 - P3)">Lower Primary (P1 - P3)</option>
                  <option value="Upper Primary (P4 - P6 Sciences)">Upper Primary (P4 - P6 Sciences)</option>
                  <option value="Upper Primary (P4 - P6 Humanities)">Upper Primary (P4 - P6 Humanities)</option>
                  <option value="Culture, Sports & Itorero">Culture, Sports & Itorero</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone (+250 78...)
                  </label>
                  <input
                    type="tel"
                    value={newTeacher.phone}
                    onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1 / B.Ed Primary Education"
                    value={newTeacher.qualification}
                    onChange={e => setNewTeacher({ ...newTeacher, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Classes (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Primary 5 Alpha, Primary 6 Candidates"
                  value={newTeacher.assignedClasses}
                  onChange={e => setNewTeacher({ ...newTeacher, assignedClasses: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Appoint Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
