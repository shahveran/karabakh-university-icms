import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useLanguage } from '../LanguageContext';
import { 
  User as UserIcon, Plus, Trash2, Key, Mail, Check, X, Shield, 
  Search, RefreshCw, UserCheck, AlertCircle, Sparkles, Building2, 
  GraduationCap, Info, ChevronDown, Upload, Download, FileSpreadsheet, FileText, ChevronRight,
  BookOpen, Layers, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  currentUser: User;
  onRefreshApp: () => Promise<void>;
}

export default function AdminPanel({ currentUser, onRefreshApp }: AdminPanelProps) {
  const { language, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting states
  const [sortField, setSortField] = useState<'name' | 'role' | 'approved' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk actions states
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkPassword, setBulkPassword] = useState<string>('');
  const [bulkRole, setBulkRole] = useState<UserRole>('student');
  const [bulkStatus, setBulkStatus] = useState<boolean>(true);
  const [bulkSubmittingAction, setBulkSubmittingAction] = useState<boolean>(false);

  // Curriculum bulk import states
  const [showCurriculumBulkModal, setShowCurriculumBulkModal] = useState(false);
  const [bulkCurriculumItems, setBulkCurriculumItems] = useState<any[]>([]);
  const [bulkCurriculumPasteText, setBulkCurriculumPasteText] = useState('');
  const [bulkCurriculumFile, setBulkCurriculumFile] = useState<File | null>(null);
  const [bulkCurriculumErrors, setBulkCurriculumErrors] = useState<string[]>([]);
  const [bulkCurriculumSubmitting, setBulkCurriculumSubmitting] = useState(false);

  // Form states for creating a user
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newDetails, setNewDetails] = useState('');
  const [newApproved, setNewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states for editing a user
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editDetails, setEditDetails] = useState('');
  const [editApproved, setEditApproved] = useState(true);

  // Custom Inline Confirmation Dialog States (Replacing window.confirm)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);

  // States for Batch User Creation (XLS/CSV)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkParsedUsers, setBulkParsedUsers] = useState<any[]>([]);
  const [bulkParseErrors, setBulkParseErrors] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error(language === 'AZ' ? 'İstifadəçilər yüklənərkən xəta yarandı.' : 'Error loading users.');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || (language === 'AZ' ? 'İstifadəçilər gətirilə bilmədi.' : 'Could not fetch users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBulkActionSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bulkAction || selectedEmails.length === 0) return;

    setBulkSubmittingAction(true);
    setError('');
    setSuccess('');

    let payload: any = {};
    if (bulkAction === 'reset-password') {
      if (!bulkPassword.trim()) {
        setError(language === 'AZ' ? 'Zəhmət olmasa yeni şifrəni daxil edin.' : 'Please enter the new password.');
        setBulkSubmittingAction(false);
        return;
      }
      payload = { password: bulkPassword };
    } else if (bulkAction === 'update-role') {
      payload = { role: bulkRole };
    } else if (bulkAction === 'update-status') {
      payload = { approved: bulkStatus };
    }

    try {
      const res = await fetch('/api/admin/users/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emails: selectedEmails,
          action: bulkAction,
          payload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');

      setSuccess(
        language === 'AZ'
          ? `${data.affected} istifadəçi üzərində toplu əməliyyat uğurla icra olundu.`
          : `Successfully performed bulk action on ${data.affected} users.`
      );
      setSelectedEmails([]);
      setBulkAction('');
      setBulkPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error executing bulk action');
    } finally {
      setBulkSubmittingAction(false);
    }
  };

  const handleSelectUser = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleEmails = sortedUsers.map(u => u.email);
    const allSelected = visibleEmails.every(email => selectedEmails.includes(email));

    if (allSelected) {
      setSelectedEmails(prev => prev.filter(email => !visibleEmails.includes(email)));
    } else {
      setSelectedEmails(prev => {
        const union = new Set([...prev, ...visibleEmails]);
        return Array.from(union);
      });
    }
  };

  const downloadSampleCurriculumCSV = () => {
    const csvContent = "programCode;programName;syllabusCode;syllabusName;credits;description\n"
      + "PR-INF;Informatika muellimliyi;INF-101;Informatikanin esaslari;6;Komputer elmleri ve alqoritmlere giris kursu\n"
      + "PR-INF;Informatika muellimliyi;INF-102;Proqramlasdirma 1;6;C++ ve ya Python dilinde esas proqramlasdirma\n"
      + "PR-MATH;Riyaziyyat muellimliyi;MTH-101;Riyazi analiz 1;8;Limitler funksiyalar ve inteqrallar\n";
    
    const encodedUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tedris_plani_sablon.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCurriculumFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkCurriculumFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCurriculumCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCurriculumCSV = (text: string) => {
    const lines = text.split('\n');
    const parsed: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      if (idx === 0 || !line.trim()) return; // skip header or empty lines
      
      // Auto-detect delimiter: check for semicolon first, otherwise use comma
      const delimiter = line.includes(';') ? ';' : ',';
      const parts = line.split(delimiter).map(s => s.trim());
      
      if (parts.length < 4) {
        errors.push(language === 'AZ' ? `Satir ${idx + 1}: Sutun sayi 4-den az olmamalidir.` : `Line ${idx + 1}: Must have at least 4 columns.`);
        return;
      }
      const [programCode, programName, syllabusCode, syllabusName, credits, description] = parts;
      if (!programCode || !programName) {
        errors.push(language === 'AZ' ? `Satir ${idx + 1}: Proqram kodu ve adi mecburidir.` : `Line ${idx + 1}: Program code and name are required.`);
        return;
      }
      parsed.push({
        programCode,
        programName,
        syllabusCode: syllabusCode || '',
        syllabusName: syllabusName || '',
        credits: credits ? parseInt(credits, 10) : 6,
        description: description || ''
      });
    });

    setBulkCurriculumItems(parsed);
    setBulkCurriculumErrors(errors);
  };

  const handleCurriculumBulkSubmit = async () => {
    if (bulkCurriculumItems.length === 0) return;
    setBulkCurriculumSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/curriculum/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bulkCurriculumItems })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setSuccess(
        language === 'AZ'
          ? `Tedris Plani ugurla idxal olundu! ${data.programsAdded} proqram elave edildi, ${data.programsUpdated} yenilendi. ${data.syllabiAdded} sillabus elave edildi, ${data.syllabiUpdated} yenilendi.`
          : `Curriculum imported successfully! Added ${data.programsAdded} programs, updated ${data.programsUpdated}. Added ${data.syllabiAdded} syllabi, updated ${data.syllabiUpdated}.`
      );
      setShowCurriculumBulkModal(false);
      setBulkCurriculumItems([]);
      setBulkCurriculumFile(null);
      if (onRefreshApp) {
        await onRefreshApp();
      }
    } catch (err: any) {
      setError(err.message || 'Import error');
    } finally {
      setBulkCurriculumSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          details: newDetails,
          password: newPassword,
          approved: newApproved
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (language === 'AZ' ? 'İstifadəçi yaradıla bilmədi.' : 'Could not create user.'));
      }

      setSuccess(language === 'AZ' ? 'İstifadəçi uğurla yaradıldı.' : 'User successfully created.');
      setShowCreateModal(false);
      // Reset form
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('student');
      setNewDetails('');
      setNewApproved(true);
      
      await fetchUsers();
      await onRefreshApp();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (language === 'AZ' ? 'İstifadəçi təsdiqlənə bilmədi.' : 'Could not approve user.'));
      }

      setSuccess(language === 'AZ' ? `"${email}" istifadəçisi təsdiq olundu.` : `User "${email}" approved.`);
      await fetchUsers();
      await onRefreshApp();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
      setError(language === 'AZ' ? 'Öz hesabınızı silə bilməzsiniz.' : 'You cannot delete your own account.');
      setDeleteConfirmEmail(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (language === 'AZ' ? 'İstifadəçi silinə bilmədi.' : 'Could not delete user.'));
      }

      setSuccess(language === 'AZ' ? 'İstifadəçi uğurla silindi.' : 'User successfully deleted.');
      setDeleteConfirmEmail(null);
      await fetchUsers();
      await onRefreshApp();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPassword(''); // empty means keep current password
    setEditRole(user.role);
    setEditDetails(user.details || '');
    setEditApproved(user.approved !== false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const updatePayload: any = {
        name: editName,
        role: editRole,
        details: editDetails,
        approved: editApproved
      };
      if (editPassword.trim() !== '') {
        updatePayload.password = editPassword;
      }
      const res = await fetch(`/api/admin/users/${encodeURIComponent(editingUser.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (language === 'AZ' ? 'İstifadəçi yenilənə bilmədi.' : 'Could not update user.'));
      }

      setSuccess(language === 'AZ' ? 'İstifadəçi məlumatları uğurla yeniləndi.' : 'User data successfully updated.');
      setEditingUser(null);
      await fetchUsers();
      await onRefreshApp();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper parser for bulk CSV/XLS text
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { 
        users: [], 
        errors: [language === 'AZ' ? 'Faylda yetərli sətir tapılmadı (Başlıq sətirindən əlavə sətirlər olmalıdır).' : 'No sufficient rows found in the file (besides the header line).'] 
      };
    }

    // Identify standard CSV separator (comma or semicolon)
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';

    const parsed: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(separator).map(part => {
        let trimmed = part.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          trimmed = trimmed.substring(1, trimmed.length - 1).trim();
        }
        return trimmed;
      });

      if (parts.length < 3) {
        errors.push(language === 'AZ' 
          ? `Sətir ${i + 1}: Sütun sayı azdır (Minimum Ad Soyad, Email və Rol olmalıdır).` 
          : `Line ${i + 1}: Too few columns (Minimum Full Name, Email, and Role are required).`);
        continue;
      }

      const name = parts[0];
      const email = parts[1];
      const roleRaw = parts[2] ? parts[2].toLowerCase() : 'student';
      const password = parts[3] || '123456';
      const details = parts[4] || '';

      if (!name || !email) {
        errors.push(language === 'AZ' 
          ? `Sətir ${i + 1}: Ad və ya Email boş ola bilməz.` 
          : `Line ${i + 1}: Name or Email cannot be empty.`);
        continue;
      }

      if (!email.includes('@')) {
        errors.push(language === 'AZ' 
          ? `Sətir ${i + 1}: Yanlış email formatı "${email}".` 
          : `Line ${i + 1}: Invalid email format "${email}".`);
        continue;
      }

      let role = 'student';
      if (roleRaw.includes('head') || roleRaw.includes('rəhbər') || roleRaw.includes('rehber')) {
        role = 'head';
      } else if (roleRaw.includes('teacher') || roleRaw.includes('müəllim') || roleRaw.includes('muellim') || roleRaw.includes('müellim')) {
        role = 'teacher';
      } else if (roleRaw.includes('enterprise') || roleRaw.includes('müəssisə') || roleRaw.includes('muessise') || roleRaw.includes('şirkət') || roleRaw.includes('sirket')) {
        role = 'enterprise';
      } else if (roleRaw.includes('admin') || roleRaw.includes('administrator')) {
        role = 'admin';
      }

      parsed.push({ name, email, role, password, details, approved: true });
    }

    return { users: parsed, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { users: parsed, errors } = parseCSVText(text);
      setBulkParsedUsers(parsed);
      setBulkParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setBulkPasteText(text);
    if (!text.trim()) {
      setBulkParsedUsers([]);
      setBulkParseErrors([]);
      return;
    }
    const { users: parsed, errors } = parseCSVText(text);
    setBulkParsedUsers(parsed);
    setBulkParseErrors(errors);
  };

  const downloadSampleCSV = () => {
    const headers = language === 'AZ' 
      ? "Ad Soyad,Email,Rol,Sifre,Detallar" 
      : "Full Name,Email,Role,Password,Details";
    const row1 = language === 'AZ'
      ? "Elnur Qasımov,elnur@qu.edu.az,student,elnur123,Riyaziyyat 3-cü kurs"
      : "Elnur Gasimov,elnur@qu.edu.az,student,elnur123,Mathematics 3rd year";
    const row2 = language === 'AZ'
      ? "Aygün Əliyeva,aygun@qu.edu.az,head,aygun123,Pedaqogika kafedrası"
      : "Aygun Aliyeva,aygun@qu.edu.az,head,aygun123,Pedagogy department";
    const row3 = language === 'AZ'
      ? "Fərid Məmmədov,farid@qu.edu.az,enterprise,farid123,SOCAR HR mütəxəssis"
      : "Farid Mammadov,farid@qu.edu.az,enterprise,farid123,SOCAR HR specialist";
    const row4 = language === 'AZ'
      ? "Səbinə Rəsulova,sabina@qu.edu.az,teacher,sabina123,Pedaqogika müəllimi"
      : "Sabina Rasulova,sabina@qu.edu.az,teacher,sabina123,Pedagogy teacher";
    
    const csvContent = [headers, row1, row2, row3, row4].join("\n");
    const encodedUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", language === 'AZ' ? "qu_toplu_istifadeci_sablonu.csv" : "qu_bulk_user_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkSubmit = async () => {
    if (bulkParsedUsers.length === 0) return;
    setBulkSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: bulkParsedUsers })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (language === 'AZ' ? 'Toplu hesablar yaradıla bilmədi.' : 'Could not batch create users.'));
      }

      const data = await res.json();
      const successMsg = language === 'AZ'
        ? `Toplu hesablardan ${data.added} ədədi uğurla əlavə edildi! Buraxılan sətir: ${data.skipped}.`
        : `Successfully added ${data.added} accounts! Skipped rows: ${data.skipped}.`;
      
      setSuccess(successMsg);
      setShowBulkModal(false);
      setBulkParsedUsers([]);
      setBulkParseErrors([]);
      setBulkPasteText('');
      setBulkFile(null);

      await fetchUsers();
      await onRefreshApp();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Filtered lists
  const pendingUsers = users.filter(u => u.approved === false);
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.details && u.details.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'all' 
        ? true 
        : statusFilter === 'approved' 
          ? u.approved !== false 
          : u.approved === false;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSort = (field: 'name' | 'role' | 'approved') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'role' | 'approved') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" />
      : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />;
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    let aVal: any = '';
    let bVal: any = '';
    if (sortField === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortField === 'role') {
      aVal = a.role.toLowerCase();
      bVal = b.role.toLowerCase();
    } else if (sortField === 'approved') {
      aVal = a.approved ? 1 : 0;
      bVal = b.approved ? 1 : 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6" id="admin-panel">
      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'CƏM İSTİFADƏÇİ' : 'TOTAL USERS'}
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-800 font-mono text-left leading-none">{users.length}</h3>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0 ml-1">
            <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'TƏSDİQ GÖZLƏYƏN' : 'PENDING APPROVAL'}
            </p>
            <h3 className={`text-lg md:text-xl font-black font-mono text-left leading-none ${pendingUsers.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
              {pendingUsers.length}
            </h3>
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ml-1 ${pendingUsers.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <UserCheck className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'MÜƏLLİMLƏR' : 'TEACHERS'}
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-800 font-mono text-left leading-none">
              {users.filter(u => u.role === 'teacher').length}
            </h3>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg flex-shrink-0 ml-1">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'PROQRAM RƏHBƏRLƏRİ' : 'PROGRAM HEADS'}
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-800 font-mono text-left leading-none">
              {users.filter(u => u.role === 'head').length}
            </h3>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0 ml-1">
            <Layers className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'TƏLƏBƏLƏR' : 'STUDENTS'}
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-800 font-mono text-left leading-none">
              {users.filter(u => u.role === 'student').length}
            </h3>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0 ml-1">
            <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white py-3 px-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between min-w-0">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
              {language === 'AZ' ? 'MÜƏSSİSƏLƏR' : 'ENTERPRISES'}
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-800 font-mono text-left leading-none">
              {users.filter(u => u.role === 'enterprise').length}
            </h3>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg flex-shrink-0 ml-1">
            <Building2 className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>
      </div>

      {/* Notifications banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={() => setError('')} className="p-1 text-red-400 hover:text-red-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="p-1 text-emerald-400 hover:text-emerald-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Approval Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <UserCheck className="w-5 h-5 animate-bounce" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                {language === 'AZ' ? 'Təsdiq Gözləyən Üzvlər' : 'Users Pending Approval'}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingUsers.length} {language === 'AZ' ? 'Müraciət' : 'Applications'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map(u => (
              <div 
                key={u.email}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 text-left"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 font-mono uppercase">
                      {u.role === 'student' && (language === 'AZ' ? 'Tələbə' : 'Student')}
                      {u.role === 'enterprise' && (language === 'AZ' ? 'Müəssisə' : 'Enterprise')}
                      {u.role !== 'student' && u.role !== 'enterprise' && u.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{u.name}</h4>
                  {u.details && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
                      "{u.details}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                  <button
                    onClick={() => setDeleteConfirmEmail(u.email)}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Rədd Et' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApprove(u.email)}
                    className="px-3.5 py-1.5 text-xs bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-all font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Təsdiqlə' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main User Directory with Search & Controls */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-left">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-800" />
              {language === 'AZ' ? 'İstifadəçi Kataloqu' : 'User Directory'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'AZ' ? 'Sistemdəki bütün istifadəçilərin siyahısı və idarəedilməsi' : 'List and management of all users registered in the system'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-800" />
              {language === 'AZ' ? 'Toplu Yarat (XLS)' : 'Bulk Create (XLS)'}
            </button>
            <button
              onClick={() => setShowCurriculumBulkModal(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-800" />
              {language === 'AZ' ? 'Tədris Planı Yüklə (XLS)' : 'Import Curriculum (XLS)'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {language === 'AZ' ? 'İstifadəçi Yarat' : 'Create User'}
            </button>
            <button
              onClick={fetchUsers}
              title={language === 'AZ' ? 'Yenilə' : 'Refresh'}
              className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/20 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'AZ' ? 'Ad, email və ya detal üzrə axtar...' : 'Search by name, email or details...'}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Role filter */}
          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none text-slate-600 font-semibold cursor-pointer"
            >
              <option value="all">{language === 'AZ' ? 'Bütün Rollar' : 'All Roles'}</option>
              <option value="student">{language === 'AZ' ? 'Tələbə (student)' : 'Student (student)'}</option>
              <option value="teacher">{language === 'AZ' ? 'Müəllim (teacher)' : 'Teacher (teacher)'}</option>
              <option value="enterprise">{language === 'AZ' ? 'Müəssisə (enterprise)' : 'Enterprise (enterprise)'}</option>
              <option value="head">{language === 'AZ' ? 'Proqram Rəhbəri (head)' : 'Program Head (head)'}</option>
              <option value="admin">{language === 'AZ' ? 'Administrator (admin)' : 'Administrator (admin)'}</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none text-slate-600 font-semibold cursor-pointer"
            >
              <option value="all">{language === 'AZ' ? 'Bütün Statuslar' : 'All Statuses'}</option>
              <option value="approved">{language === 'AZ' ? 'Təsdiq Edilmiş' : 'Approved'}</option>
              <option value="pending">{language === 'AZ' ? 'Təsdiq Gözləyən' : 'Pending Approval'}</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Panel */}
        <AnimatePresence>
          {selectedEmails.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-emerald-905"
            >
              <div className="flex items-center gap-2">
                <span className="bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full font-black font-mono">
                  {selectedEmails.length}
                </span>
                <span>{language === 'AZ' ? 'istifadəçi seçildi' : 'users selected'}</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmails([])}
                  className="text-slate-400 hover:text-slate-600 ml-2 font-bold cursor-pointer"
                >
                  {language === 'AZ' ? 'Seçimi təmizlə' : 'Clear selection'}
                </button>
              </div>

              <form onSubmit={handleBulkActionSubmit} className="flex flex-wrap items-center gap-3">
                <select
                  value={bulkAction}
                  onChange={e => {
                    setBulkAction(e.target.value);
                    setBulkPassword('');
                  }}
                  className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 font-bold focus:outline-none text-slate-700 cursor-pointer"
                >
                  <option value="">-- {language === 'AZ' ? 'Toplu Əməliyyat Seçin' : 'Select Bulk Action'} --</option>
                  <option value="reset-password">{language === 'AZ' ? 'Şifrəni Dəyiş' : 'Reset Password'}</option>
                  <option value="update-role">{language === 'AZ' ? 'Rolu Dəyiş' : 'Change Role'}</option>
                  <option value="update-status">{language === 'AZ' ? 'Statusu Dəyiş' : 'Change Status'}</option>
                  <option value="delete">{language === 'AZ' ? 'İstifadəçiləri Sil' : 'Delete Users'}</option>
                </select>

                {bulkAction === 'reset-password' && (
                  <input
                    type="text"
                    value={bulkPassword}
                    onChange={e => setBulkPassword(e.target.value)}
                    placeholder={language === 'AZ' ? 'Yeni şifrə...' : 'New password...'}
                    className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none placeholder-slate-400 font-medium"
                    required
                  />
                )}

                {bulkAction === 'update-role' && (
                  <select
                    value={bulkRole}
                    onChange={e => setBulkRole(e.target.value as UserRole)}
                    className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="student">{language === 'AZ' ? 'Tələbə' : 'Student'}</option>
                    <option value="teacher">{language === 'AZ' ? 'Müəllim' : 'Teacher'}</option>
                    <option value="head">{language === 'AZ' ? 'Proqram Rəhbəri' : 'Program Head'}</option>
                    <option value="enterprise">{language === 'AZ' ? 'Müəssisə' : 'Enterprise'}</option>
                  </select>
                )}

                {bulkAction === 'update-status' && (
                  <select
                    value={String(bulkStatus)}
                    onChange={e => setBulkStatus(e.target.value === 'true')}
                    className="bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="true">{language === 'AZ' ? 'Təsdiqlə (Aktiv)' : 'Approve (Active)'}</option>
                    <option value="false">{language === 'AZ' ? 'Təsdiqi ləğv et (Blok)' : 'Disapprove (Block)'}</option>
                  </select>
                )}

                <button
                  type="submit"
                  disabled={!bulkAction || bulkSubmittingAction}
                  onClick={(e) => {
                    if (bulkAction === 'delete') {
                      const msg = language === 'AZ' 
                        ? `Seçilmiş ${selectedEmails.length} istifadəçini silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz!`
                        : `Are you sure you want to delete the ${selectedEmails.length} selected users? This action cannot be undone!`;
                      if (!window.confirm(msg)) {
                        e.preventDefault();
                      }
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg font-black transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer ${
                    bulkAction === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-800 hover:bg-emerald-950 text-white'
                  }`}
                >
                  {bulkSubmittingAction ? t('pleaseWait') : (language === 'AZ' ? 'Tətbiq Et' : 'Apply')}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table/List View */}
        <div className="overflow-x-auto">
          {loading && users.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-700 animate-spin mx-auto"></div>
              <p className="text-xs font-medium">{language === 'AZ' ? 'Yüklənir...' : 'Loading...'}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium italic">
                {language === 'AZ' ? 'Axtarışa uyğun istifadəçi tapılmadı.' : 'No users matching your search criteria.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="admin-users-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center select-none rounded-tl-xl">
                    <input
                      type="checkbox"
                      checked={sortedUsers.length > 0 && sortedUsers.every(u => selectedEmails.includes(u.email))}
                      onChange={handleSelectAllVisible}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th onClick={() => handleSort('name')} className="py-3 px-6 cursor-pointer group hover:bg-slate-100/70 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-start">
                      {language === 'AZ' ? 'İstifadəçi' : 'User'}
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('role')} className="py-3 px-4 cursor-pointer group hover:bg-slate-100/70 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-start">
                      {language === 'AZ' ? 'Rol' : 'Role'}
                      {getSortIcon('role')}
                    </div>
                  </th>
                  <th className="py-3 px-4 select-none">{language === 'AZ' ? 'Əlaqəli Detallar' : 'Associated Details'}</th>
                  <th onClick={() => handleSort('approved')} className="py-3 px-4 cursor-pointer group hover:bg-slate-100/70 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-start">
                      Status
                      {getSortIcon('approved')}
                    </div>
                  </th>
                  <th className="py-3 px-6 text-right select-none rounded-tr-xl">{language === 'AZ' ? 'Əməliyyatlar' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-left">
                {sortedUsers.map(u => (
                  <tr key={u.email} className={`hover:bg-slate-50/50 transition-colors ${selectedEmails.includes(u.email) ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-4 px-4 w-10 text-center select-none">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(u.email)}
                        onChange={() => handleSelectUser(u.email)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer w-4 h-4"
                      />
                    </td>
                    {/* User profile */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          u.role === 'admin' ? 'bg-red-50 text-red-700' :
                          u.role === 'head' ? 'bg-amber-50 text-amber-700' :
                          u.role === 'teacher' ? 'bg-blue-50 text-blue-700' :
                          u.role === 'enterprise' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {u.role === 'admin' ? <Shield className="w-4 h-4" /> :
                           u.role === 'head' ? <UserIcon className="w-4 h-4" /> :
                           u.role === 'teacher' ? <GraduationCap className="w-4 h-4" /> :
                           u.role === 'enterprise' ? <Building2 className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 leading-none">{u.name}</h5>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4 font-semibold">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                        u.role === 'admin' ? 'bg-red-50 text-red-800 border-red-100' :
                        u.role === 'head' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                        u.role === 'teacher' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                        u.role === 'enterprise' ? 'bg-purple-50 text-purple-800 border-purple-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      }`}>
                        {u.role === 'admin' && 'Admin'}
                        {u.role === 'head' && (language === 'AZ' ? 'Proqram Rəhbəri' : 'Program Head')}
                        {u.role === 'teacher' && (language === 'AZ' ? 'Müəllim' : 'Teacher')}
                        {u.role === 'enterprise' && (language === 'AZ' ? 'Müəssisə' : 'Enterprise')}
                        {u.role === 'student' && (language === 'AZ' ? 'Tələbə' : 'Student')}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="py-4 px-4 text-slate-500 max-w-xs truncate leading-normal" title={u.details}>
                      {u.details || <span className="text-slate-300 italic">{language === 'AZ' ? 'Yoxdur' : 'None'}</span>}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {u.approved !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <Check className="w-3 h-3" />
                          {language === 'AZ' ? 'Təsdiqli' : 'Approved'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          {language === 'AZ' ? 'Təsdiq gözləyir' : 'Pending'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.approved === false && (
                          <button
                            onClick={() => handleApprove(u.email)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title={language === 'AZ' ? 'Təsdiqlə' : 'Approve'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title={language === 'AZ' ? 'Redaktə et' : 'Edit'}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmEmail(u.email)}
                          disabled={u.email.toLowerCase() === currentUser.email.toLowerCase()}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.email.toLowerCase() === currentUser.email.toLowerCase() 
                              ? 'bg-slate-50 text-slate-200 cursor-not-allowed' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer'
                          }`}
                          title={language === 'AZ' ? 'Sil' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {language === 'AZ' ? 'Yeni İstifadəçi Yarat' : 'Create New User'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'AZ' ? 'Yeni heyət və ya tələbə profilinin əlavə edilməsi' : 'Add new staff or student profile'}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'AZ' ? 'Email Ünvanı *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="name.surname@qu.edu.az"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'AZ' ? 'Ad və Soyad *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Elvin Qasımov' : 'E.g. Elvin Gasimov'}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'AZ' ? 'Şifrə *' : 'Password *'}
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Məs. 123456"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'AZ' ? 'Rol *' : 'Role *'}
                    </label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="student">{language === 'AZ' ? 'Tələbə' : 'Student'}</option>
                      <option value="teacher">{language === 'AZ' ? 'Müəllim' : 'Teacher'}</option>
                      <option value="enterprise">{language === 'AZ' ? 'Müəssisə' : 'Enterprise'}</option>
                      <option value="head">{language === 'AZ' ? 'Proqram Rəhbəri' : 'Program Head'}</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'AZ' ? 'Filial / Kurs detalları' : 'Branch / Course details'}
                  </label>
                  <input
                    type="text"
                    value={newDetails}
                    onChange={e => setNewDetails(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Riyaziyyat, 3-cü kurs' : 'E.g. Math, 3rd year'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="new-approved"
                    checked={newApproved}
                    onChange={e => setNewApproved(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="new-approved" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                    {language === 'AZ' ? 'Hesab birbaşa təsdiqlənmiş (aktiv) olsun' : 'Approve and activate account immediately'}
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {submitting 
                      ? (language === 'AZ' ? 'Yaradılır...' : 'Creating...') 
                      : (language === 'AZ' ? 'İstifadəçini Yarat' : 'Create User')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {language === 'AZ' ? 'İstifadəçini Redaktə Et' : 'Edit User'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {language === 'AZ' ? 'Hesab' : 'Account'}: {editingUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'AZ' ? 'Ad və Soyad *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'AZ' ? 'Yeni Şifrə' : 'New Password'}
                    </label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder={language === 'AZ' ? 'Dəyişməmək üçün boş buraxın' : 'Leave blank to keep current'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {language === 'AZ' ? 'Rol *' : 'Role *'}
                    </label>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="student">{language === 'AZ' ? 'Tələbə' : 'Student'}</option>
                      <option value="teacher">{language === 'AZ' ? 'Müəllim' : 'Teacher'}</option>
                      <option value="enterprise">{language === 'AZ' ? 'Müəssisə' : 'Enterprise'}</option>
                      <option value="head">{language === 'AZ' ? 'Proqram Rəhbəri' : 'Program Head'}</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {language === 'AZ' ? 'Filial / Kurs detalları' : 'Branch / Course details'}
                  </label>
                  <input
                    type="text"
                    value={editDetails}
                    onChange={e => setEditDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-approved"
                    checked={editApproved}
                    onChange={e => setEditApproved(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="edit-approved" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                    {language === 'AZ' ? 'Hesab təsdiqlənmiş (aktiv) olsun' : 'Account is active and approved'}
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {submitting 
                      ? (language === 'AZ' ? 'Yenilənir...' : 'Updating...') 
                      : (language === 'AZ' ? 'Dəyişiklikləri Yadda Saxla' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM INLINE DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmEmail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0 animate-pulse">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                    {language === 'AZ' ? 'Silmə Əməliyyatını Təsdiqləyin' : 'Confirm Deletion'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal">
                    {language === 'AZ' 
                      ? `"${deleteConfirmEmail}" ünvanlı istifadəçi hesabını sistemdən tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.` 
                      : `Are you sure you want to permanently delete user account "${deleteConfirmEmail}" from the system? This action cannot be undone.`}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmEmail(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(deleteConfirmEmail)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {language === 'AZ' ? 'Sil / Rədd Et' : 'Delete / Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BATCH EXCEL / CSV IMPORT MODAL */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
                    {language === 'AZ' ? 'Toplu İstifadəçi Hesabları Yarat' : 'Create Bulk User Accounts'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'AZ' ? 'Excel (CSV) sənədini yükləməklə və ya məlumatları kopyalayıb yapışdırmaqla toplu qeydiyyat edin.' : 'Register bulk accounts by uploading an Excel (CSV) template or pasting text.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkParsedUsers([]);
                    setBulkParseErrors([]);
                    setBulkPasteText('');
                    setBulkFile(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Download Template & Instructions banner */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      {language === 'AZ' ? 'Şablon Excel (CSV) faylını yükləyin' : 'Download Sample Excel (CSV)'}
                    </h4>
                    <p className="text-[10px] text-emerald-800/80 leading-normal">
                      {language === 'AZ' 
                        ? 'Excel-də rahatlıqla hazırlayıb yükləmək üçün nümunə strukturu əldə edin.' 
                        : 'Get the exact spreadsheet structure required for bulk import.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Excel Şablonunu Yüklə' : 'Download Excel Template'}
                  </button>
                </div>

                {/* Split layouts: Upload or Paste */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload zone */}
                  <div className="space-y-2 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'AZ' ? '1. Fayl yükləyin' : '1. Upload File'}
                    </label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-5 bg-slate-50/30 text-center hover:bg-white transition-all relative flex flex-col items-center justify-center min-h-[140px]">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      />
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {bulkFile ? bulkFile.name : (language === 'AZ' ? 'Faylı bura sürükləyin və ya klikləyin' : 'Drag file here or click to select')}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        CSV və ya TXT formatı (Excel tərəfindən dəstəklənir)
                      </p>
                    </div>
                  </div>

                  {/* Copy Paste zone */}
                  <div className="space-y-2 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'AZ' ? 'və ya 2. Birbaşa mətni yapışdırın' : 'or 2. Paste text directly'}
                    </label>
                    <textarea
                      value={bulkPasteText}
                      onChange={e => handlePasteChange(e.target.value)}
                      rows={6}
                      placeholder={language === 'AZ' 
                        ? "Ad Soyad,Email,Rol,Sifre,Detallar\nAli Aliyev,ali@qu.edu.az,student,ali123,Riyaziyyat\nSəbinə Rəsulova,sabina@qu.edu.az,teacher,sabina123,Pedaqogika müəllimi\nLeyla Hasanova,leyla@qu.edu.az,head,leyla123,Kafedra" 
                        : "Full Name,Email,Role,Password,Details\nAli Aliyev,ali@qu.edu.az,student,ali123,Math\nSabina Rasulova,sabina@qu.edu.az,teacher,sabina123,Pedagogy teacher\nLeyla Hasanova,leyla@qu.edu.az,head,leyla123,Faculty"}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder:text-slate-300 resize-none min-h-[140px]"
                    />
                  </div>
                </div>

                {/* Errors display */}
                {bulkParseErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl space-y-1">
                    <h5 className="text-xs font-bold flex items-center gap-1.5 text-left">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {language === 'AZ' ? 'İdxal zamanı müəyyən edilən xətalar:' : 'Errors spotted during parsing:'}
                    </h5>
                    <ul className="list-disc list-inside text-[10px] leading-relaxed pl-1 space-y-0.5 text-left">
                      {bulkParseErrors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {bulkParseErrors.length > 5 && <li>... və daha {bulkParseErrors.length - 5} xəta.</li>}
                    </ul>
                  </div>
                )}

                {/* Previews display */}
                {bulkParsedUsers.length > 0 && (
                  <div className="space-y-2 text-left">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-800" />
                      {language === 'AZ' ? 'Yaradılacaq Hesablar' : 'Accounts to Create'} ({bulkParsedUsers.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-[220px]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400">
                            <th className="py-2 px-3">{language === 'AZ' ? 'Ad Soyad' : 'Full Name'}</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Rol' : 'Role'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Şifrə' : 'Password'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Detallar' : 'Details'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bulkParsedUsers.map((user, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="py-2 px-3 font-semibold text-slate-800">{user.name}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono">{user.email}</td>
                              <td className="py-2 px-3 font-medium">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] uppercase font-mono">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500">{user.password}</td>
                              <td className="py-2 px-3 text-slate-400 italic max-w-xs truncate">{user.details || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkParsedUsers([]);
                    setBulkParseErrors([]);
                    setBulkPasteText('');
                    setBulkFile(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={bulkSubmitting || bulkParsedUsers.length === 0}
                  onClick={handleBulkSubmit}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {bulkSubmitting 
                    ? (language === 'AZ' ? 'Yaradılır...' : 'Creating...') 
                    : (language === 'AZ' ? 'Hesabları Toplu Yarat' : 'Create Accounts in Bulk')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BATCH CURRICULUM IMPORT MODAL */}
      <AnimatePresence>
        {showCurriculumBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto text-left font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-800" />
                    {language === 'AZ' ? 'Tədris Planı Toplu Yüklə' : 'Import Curriculum in Bulk'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'AZ' ? 'Excel (CSV) sənədini yükləməklə toplu proqram və fənləri daxil edin.' : 'Import bulk programs and courses by uploading an Excel (CSV) template.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCurriculumBulkModal(false);
                    setBulkCurriculumItems([]);
                    setBulkCurriculumErrors([]);
                    setBulkCurriculumPasteText('');
                    setBulkCurriculumFile(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      {language === 'AZ' ? 'Şablon Excel (CSV) faylını yükləyin' : 'Download Sample Excel (CSV)'}
                    </h4>
                    <p className="text-[10px] text-emerald-800/80 leading-normal">
                      {language === 'AZ' 
                        ? 'Excel-də proqram və fənləri hazırlamaq üçün şablon strukturu əldə edin.' 
                        : 'Get the exact spreadsheet structure required for bulk curriculum import.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleCurriculumCSV}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Excel Şablonunu Yüklə' : 'Download Excel Template'}
                  </button>
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {language === 'AZ' ? '1. Fayl yükləyin' : '1. Upload File'}
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-5 bg-slate-50/30 text-center hover:bg-white transition-all relative flex flex-col items-center justify-center min-h-[140px]">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCurriculumFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      {bulkCurriculumFile ? bulkCurriculumFile.name : (language === 'AZ' ? 'Faylı bura sürükləyin və ya klikləyin' : 'Drag file here or click to select')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      CSV formatı (Excel tərəfindən dəstəklənir)
                    </p>
                  </div>
                </div>

                {bulkCurriculumErrors.length > 0 && (
                  <div className="p-3.5 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-2.5 text-xs text-left">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold">{language === 'AZ' ? 'Format Xətaları Tapıldı:' : 'Formatting Errors Found:'}</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-700 max-h-[120px] overflow-y-auto">
                        {bulkCurriculumErrors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {bulkCurriculumItems.length > 0 && (
                  <div className="space-y-2 text-left">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'AZ' ? 'Yüklənəcək Tədris Planı Siyahısı' : 'Curriculum Items to Import'} ({bulkCurriculumItems.length})
                    </h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-[220px]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400">
                            <th className="py-2 px-3">{language === 'AZ' ? 'Proqram Kodu' : 'Prog Code'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Proqram Adı' : 'Prog Name'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Fənn Kodu' : 'Course Code'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Fənn Adı' : 'Course Name'}</th>
                            <th className="py-2 px-3">{language === 'AZ' ? 'Kredit' : 'Credits'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {bulkCurriculumItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/40">
                              <td className="py-2 px-3 font-mono text-slate-700">{item.programCode}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.programName}</td>
                              <td className="py-2 px-3 font-mono text-emerald-800">{item.syllabusCode || '-'}</td>
                              <td className="py-2 px-3 text-slate-600 font-medium">{item.syllabusName || '-'}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{item.credits}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowCurriculumBulkModal(false);
                    setBulkCurriculumItems([]);
                    setBulkCurriculumErrors([]);
                    setBulkCurriculumPasteText('');
                    setBulkCurriculumFile(null);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={bulkCurriculumSubmitting || bulkCurriculumItems.length === 0}
                  onClick={handleCurriculumBulkSubmit}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {bulkCurriculumSubmitting 
                    ? (language === 'AZ' ? 'İdxal olunur...' : 'Importing...') 
                    : (language === 'AZ' ? 'Tədris Planını İdxal Et' : 'Import Curriculum')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
