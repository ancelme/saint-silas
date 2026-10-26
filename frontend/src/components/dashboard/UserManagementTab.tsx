import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Copy,
  Check,
  Building,
  GraduationCap,
  BookOpen,
  Wallet,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Camera,
  Upload,
  FileEdit,
  ChevronDown
} from 'lucide-react';
import { User, Role, Student } from '../../types';
import {
  fetchUsers,
  fetchStudents,
  createStaffUser,
  updateUser,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  deleteUserAccount
} from '../../services/api';

const ALL_ASSIGNABLE_ROLES: { role: Role; label: string; icon: any; desc: string }[] = [
  { role: 'admin', label: 'Administrator', icon: Shield, desc: 'Manage school operations, students, parents, attendance, classes' },
  { role: 'head_teacher', label: 'Head Teacher (Umuyobozi)', icon: GraduationCap, desc: 'Academic governance, examination results, teacher supervision' },
  { role: 'teacher', label: 'Teacher (Mwalimu)', icon: BookOpen, desc: 'Classroom roll-call, CBC lesson delivery, marks entry' },
  { role: 'accountant', label: 'Accountant (Bursar)', icon: Wallet, desc: 'Tuition fees, expenses, receipts, financial reporting' },
  { role: 'librarian', label: 'Librarian (Umubitsi)', icon: BookOpen, desc: 'Library catalog, borrowing, returns, book inventory' },
  { role: 'parent', label: 'Parent / Guardian', icon: Users, desc: 'View child progress, attendance, reports, fee statements' },
  { role: 'student', label: 'Student / Pupil', icon: GraduationCap, desc: 'View timetables, marks, assignments, announcements' },
];

export const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create Staff Form
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPhone, setFormPhone] = useState('+250 78');
  const [formRole, setFormRole] = useState<Role>('teacher');
  const [formPassword, setFormPassword] = useState('');
  const [formAvatar, setFormAvatar] = useState<string>('');
  const [formAvatarFileName, setFormAvatarFileName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit User Form
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<Role>('teacher');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editAvatar, setEditAvatar] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Reset Password Form
  const [resetTempPassword, setResetTempPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // New Role Form
  const [targetRole, setTargetRole] = useState<Role>('admin');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{ username: string; tempPass: string; role: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setToastMsg({ type: 'error', text: e.message || 'Failed to load user directory' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen || formRole !== 'parent') return;
    let isCurrent = true;
    setIsLoadingStudents(true);
    fetchStudents()
      .then(items => {
        if (isCurrent) setStudents(items);
      })
      .catch(error => {
        if (isCurrent) {
          setToastMsg({ type: 'error', text: error.message || 'Failed to load students for parent registration' });
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingStudents(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [isCreateModalOpen, formRole]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = 'SS-';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(pwd);
  };

  const handleDeviceImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setToastMsg({ type: 'error', text: 'Please select a JPEG, PNG, or WEBP image' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMsg({ type: 'error', text: 'Image size must be 5 MB or smaller' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (isEditMode) {
          setEditAvatar(reader.result);
        } else {
          setFormAvatar(reader.result);
          setFormAvatarFileName(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName || !formEmail || !formUsername || !formPassword || !formAvatar) {
      setToastMsg({ type: 'error', text: 'Please fill in all required fields and select a profile photo' });
      return;
    }
    if (formRole === 'parent' && selectedStudentIds.length === 0) {
      setToastMsg({ type: 'error', text: 'Select at least one student for this parent account' });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createStaffUser({
        fullName: formFullName,
        email: formEmail,
        username: formUsername,
        password: formPassword,
        role: formRole,
        phone: formPhone,
        avatar: formAvatar,
        studentIds: formRole === 'parent' ? selectedStudentIds : undefined,
      });

      setCreatedSummary({
        username: formUsername,
        tempPass: formPassword,
        role: formRole,
      });

      setToastMsg({ type: 'success', text: res.message || `Account for ${formFullName} created! User can log in directly.` });
      setIsCreateModalOpen(false);
      setFormFullName('');
      setFormEmail('');
      setFormUsername('');
      setFormPassword('');
      setFormAvatar('');
      setFormAvatarFileName('');
      setSelectedStudentIds([]);
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to create staff account' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFullName(user.fullName || user.name || '');
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditStatus(user.status === 'Active' ? 'Active' : 'Inactive');
    setEditAvatar(user.avatar || '');
    setIsEditModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsUpdatingUser(true);
    try {
      const res = await updateUser(selectedUser.id, {
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        status: editStatus,
        avatar: editAvatar,
      });
      setToastMsg({ type: 'success', text: res.message || 'User account updated successfully' });
      setIsEditModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to update user' });
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await updateUserStatus(user.id, nextStatus);
      setToastMsg({ type: 'success', text: res.message });
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to update user status' });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetTempPassword) return;

    setIsResetting(true);
    try {
      const res = await resetUserPassword(selectedUser.id, resetTempPassword);
      setToastMsg({ type: 'success', text: res.message });
      setIsResetModalOpen(false);
      setResetTempPassword('');
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRoleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsUpdatingRole(true);
    try {
      const res = await updateUserRole(selectedUser.id, targetRole);
      setToastMsg({ type: 'success', text: res.message });
      setIsRoleModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to update role' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account for ${user.fullName} (${user.username})?`)) {
      return;
    }

    try {
      const res = await deleteUserAccount(user.id);
      setToastMsg({ type: 'success', text: res.message });
      loadUsers();
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to delete account' });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Temporary Credentials Delivery Notice (Shown once when Owner creates staff) */}
      {createdSummary && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 text-xs text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <ShieldCheck className="w-4 h-4" />
              User Account Provisioned — Provide These Credentials Once:
            </span>
            <div className="font-mono text-xs space-x-3">
              <span>Username: <strong>{createdSummary.username}</strong></span>
              <span>•</span>
              <span>Temporary Password: <strong className="bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded">{createdSummary.tempPass}</strong></span>
              <span>•</span>
              <span>Role: <strong className="uppercase">{createdSummary.role}</strong></span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              * The user will be strictly forced to set their permanent personal password and recovery contact on their first login. This password is never displayed again.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`St. Silas Portal Credentials:\nUsername: ${createdSummary.username}\nTemporary Password: ${createdSummary.tempPass}\nPortal URL: ${window.location.origin}`);
              setCopiedCredentials(true);
              setTimeout(() => setCopiedCredentials(false), 2500);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
          >
            {copiedCredentials ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCredentials ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Administrator / Owner Authority
          </span>
          <h2 className="text-xl font-black font-heading text-slate-900 dark:text-white mt-1">
            System User & Staff Governance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administrators and owners can create accounts for the available school roles, including staff and parents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh User Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              handleGeneratePassword();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/10 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Controls: Search and Role Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, email, phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="owner">Super Admin / Owner</option>
            <option value="admin">Administrator</option>
            <option value="head_teacher">Head Teacher</option>
            <option value="teacher">Teacher</option>
            <option value="accountant">Accountant</option>
            <option value="librarian">Librarian</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">User / Legal Name</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Owner Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading authentic user directory from MySQL database...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isOwner = user.role === 'owner' || user.role === 'super_admin';
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            isOwner
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {user.fullName.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {user.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {user.phone || 'No phone recorded'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{user.username}</span>
                        <span className="text-slate-400 text-[10px]">{user.email}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOwner
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : user.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : user.role === 'head_teacher'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : user.role === 'accountant'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : user.role === 'librarian'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {user.status === 'PENDING_FIRST_LOGIN' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3 animate-spin" />
                            Pending 1st Login
                          </span>
                        ) : user.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {user.lastLogin || 'Never logged in'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {user.createdAt || 'System Init'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isOwner ? (
                          <span className="text-[11px] text-amber-600 font-bold">Primary Owner</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                user.status === 'Active'
                                  ? 'border-slate-200 dark:border-slate-700 text-slate-600 hover:text-amber-600'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              }`}
                              title={user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {user.status === 'Active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setResetTempPassword(`SSP-${Math.floor(100000 + Math.random() * 900000)}`);
                                setIsResetModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                              title="Edit User Details & Photo"
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setTargetRole(user.role);
                                setIsRoleModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Change Role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF / USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Add Authorized User & Role
                  </h3>
                  <span className="text-[10px] text-slate-400">Administrator / Owner provisioning — instant login access</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="space-y-3.5 text-xs">
              {/* Photo Upload from Device */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Upload User Photo from Device
                </label>
                <div className="p-3 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 flex items-center gap-3">
                  {formAvatar ? (
                    <img
                      src={formAvatar}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-600 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="staff-avatar-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formAvatar ? 'Change Photo' : 'Select Photo from Device'}</span>
                    </label>
                    <input
                      id="staff-avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => handleDeviceImageUpload(e, false)}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {formAvatarFileName ? `Selected: ${formAvatarFileName}` : 'Profile photo required: JPEG, PNG, or WEBP (max 5 MB)'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Select System Role</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_ASSIGNABLE_ROLES.map(r => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setFormRole(r.role)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formRole === r.role
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold block text-xs">{r.label}</span>
                      <span className="text-[10px] opacity-75 leading-tight block mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formRole === 'parent' && (
                <fieldset className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
                  <legend className="px-1 text-slate-700 dark:text-slate-200 font-bold">Link this parent to student(s)</legend>
                  <p className="mb-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                    The parent account will only see student records for the student(s) selected here.
                  </p>
                  {isLoadingStudents ? (
                    <div className="flex items-center gap-2 py-3 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading active students…
                    </div>
                  ) : students.length === 0 ? (
                    <p className="py-3 text-amber-700 dark:text-amber-300">No active students are available to link.</p>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        aria-expanded={isStudentDropdownOpen}
                        aria-controls="parent-student-options"
                        onClick={() => setIsStudentDropdownOpen(open => !open)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <span className={selectedStudentIds.length ? 'font-semibold' : 'text-slate-500'}>
                          {selectedStudentIds.length
                            ? `${selectedStudentIds.length} pupil${selectedStudentIds.length === 1 ? '' : 's'} selected`
                            : 'Select pupil(s)'}
                        </span>
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isStudentDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isStudentDropdownOpen && (
                        <div
                          id="parent-student-options"
                          className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                        >
                          {students.map(student => {
                            const studentId = student.id;
                            const checked = selectedStudentIds.includes(studentId);
                            return (
                              <label
                                key={studentId}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-indigo-50 dark:hover:bg-slate-800"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setSelectedStudentIds(current =>
                                    checked
                                      ? current.filter(id => id !== studentId)
                                      : [...current, studentId]
                                  )}
                                  className="accent-indigo-600"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {student.firstName} {student.lastName}
                                </span>
                                <span className="ml-auto text-xs text-slate-400">
                                  {student.grade} · {student.rollNo}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </fieldset>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={e => setFormFullName(e.target.value)}
                  placeholder="e.g. Mwalimu Jean Bosco Mugabo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Username (for sign in)</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="e.g. jbosco"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="jbosco@st-silas.rw"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 dark:text-slate-300 font-bold">
                    Login Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    ⚡ Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Set account password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  * User will be immediately authorized and active to log in directly into their dashboard.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Authorize & Add User</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Update User Account: {selectedUser.fullName}
                  </h3>
                  <span className="text-[10px] text-slate-400">Username: {selectedUser.username}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5 text-xs">
              {/* Photo Upload from Device */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Profile Photo from Device
                </label>
                <div className="p-3 rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-50/20 dark:bg-sky-950/20 flex items-center gap-3">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-sky-600 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="edit-user-avatar-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editAvatar ? 'Change Photo' : 'Upload from Device'}</span>
                    </label>
                    <input
                      id="edit-user-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={e => handleDeviceImageUpload(e, true)}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Select image file from device to update profile</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">System Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as Role)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    {ALL_ASSIGNABLE_ROLES.map(r => (
                      <option key={r.role} value={r.role}>{r.label} ({r.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Active">Active (Can Login)</option>
                    <option value="Inactive">Inactive (Login Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Reset Password for {selectedUser.fullName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <p className="text-slate-500">
                Generate or enter a new temporary password for <strong>{selectedUser.username}</strong> ({selectedUser.role}). The user will be required to set a permanent password upon their next login.
              </p>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  New Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={resetTempPassword}
                  onChange={e => setResetTempPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Reset</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <span>Change Role: {selectedUser.fullName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Select New Staff Role</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  {ALL_ASSIGNABLE_ROLES.map((r: { role: Role; label: string }) => (
                    <option key={r.role} value={r.role}>{r.label} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Role</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
