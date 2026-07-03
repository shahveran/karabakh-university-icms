import React, { useState, useEffect } from 'react';
import { 
  DatabaseState, User, Program, Syllabus, SuggestionCase, Notification, AIAnalysisResponse 
} from './types';
import StudentPanel from './components/StudentPanel';
import EnterprisePanel from './components/EnterprisePanel';
import ProgramHeadPanel from './components/ProgramHeadPanel';
import TeacherPanel from './components/TeacherPanel';
import AdminPanel from './components/AdminPanel';
import Logo from './components/Logo';
import { useLanguage } from './LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, LogOut, User as UserIcon, GraduationCap, Building2, 
  MapPin, Sparkles, BookOpen, Layers, CheckCircle2, X, Trash2, Landmark, ChevronRight,
  Shield
} from 'lucide-react';

// Global fetch interceptor to append authorization token and handle 401 Unauthorized
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  try {
    const stored = localStorage.getItem('qarabag_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user && user.token) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          init.headers.set('Authorization', `Bearer ${user.token}`);
        } else if (Array.isArray(init.headers)) {
          init.headers.push(['Authorization', `Bearer ${user.token}`]);
        } else {
          init.headers = {
            ...init.headers,
            'Authorization': `Bearer ${user.token}`
          };
        }
      }
    }
  } catch (e) {
    console.error('Error in fetch interceptor:', e);
  }
  const response = await originalFetch(input, init);
  if (response.status === 401) {
    localStorage.removeItem('qarabag_user');
    window.dispatchEvent(new Event('qarabag_unauthorized'));
  }
  return response;
};

// Filter reference documents based on owner/assignment visibility rules
function docsToFilter(docs: ReferenceDocument[], user: User | null, programs: Program[], syllabi: Syllabus[]): ReferenceDocument[] {
  if (!user) return [];
  if (user.role === 'admin') return docs; // Admins can see everything

  const userEmail = user.email.toLowerCase().trim();

  return docs.filter(doc => {
    // 1. The user who uploaded the document can always see it
    if (doc.uploadedBy && doc.uploadedBy.toLowerCase().trim() === userEmail) {
      return true;
    }

    // 2. If it's a program-associated document, check if the user is authorized for the Program
    if (doc.associatedId) {
      const associatedProgram = programs.find(p => p.id === doc.associatedId);
      if (associatedProgram) {
        const isCreator = associatedProgram.createdBy && associatedProgram.createdBy.toLowerCase().trim() === userEmail;
        const isAllowedHead = associatedProgram.allowedHeads && associatedProgram.allowedHeads.some(email => email.toLowerCase().trim() === userEmail);
        if (isCreator || isAllowedHead) return true;
      }

      // 3. If it's a syllabus-associated document, check if the user is the teacher or head of parent Program
      const associatedSyllabus = syllabi.find(s => s.id === doc.associatedId);
      if (associatedSyllabus) {
        const isTeacher = (associatedSyllabus.teacherEmail && associatedSyllabus.teacherEmail.toLowerCase().trim() === userEmail) ||
                          (associatedSyllabus.teacherEmails && associatedSyllabus.teacherEmails.some(email => email.toLowerCase().trim() === userEmail));
        if (isTeacher) return true;

        // Head of the program associated with this syllabus
        const parentProgram = programs.find(p => p.id === associatedSyllabus.programId);
        if (parentProgram) {
          const isCreator = parentProgram.createdBy && parentProgram.createdBy.toLowerCase().trim() === userEmail;
          const isAllowedHead = parentProgram.allowedHeads && parentProgram.allowedHeads.some(email => email.toLowerCase().trim() === userEmail);
          if (isCreator || isAllowedHead) return true;
        }
      }
    }

    return false;
  });
}

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('qarabag_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state for notifications menu
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [adminActiveRole, setAdminActiveRole] = useState<'admin' | 'head' | 'student' | 'enterprise' | 'teacher'>('admin');

  // Manual custom login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'student' | 'enterprise'>('student');
  const [loginDetails, setLoginDetails] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Fetch full state from backend
  const fetchState = async () => {
    if (!localStorage.getItem('qarabag_user')) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/state');
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error(language === 'AZ' ? 'Dövlət məlumatları yüklənərkən xəta yarandı.' : 'Error loading app state data.');
      const data: DatabaseState = await res.json();
      setDbState(data);
    } catch (err: any) {
      setError(err.message || (language === 'AZ' ? 'Server ilə əlaqə qurulmadı.' : 'Could not connect to the server.'));
    } finally {
      setLoading(false);
    }
  };

  // Listen for global unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setDbState(null);
    };
    window.addEventListener('qarabag_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('qarabag_unauthorized', handleUnauthorized);
  }, []);

  // Poll server state every 15 seconds to sync notifications and other updates in real-time
  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetchState();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Watch dbState to automatically sync active user's approval status or role changes
  useEffect(() => {
    if (dbState && currentUser) {
      const freshUser = dbState.users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
      if (freshUser) {
        if (freshUser.approved === false) {
          setCurrentUser(null);
          localStorage.removeItem('qarabag_user');
        } else if (JSON.stringify(freshUser) !== JSON.stringify({ ...currentUser, token: undefined })) {
          const updatedUser = { ...freshUser, token: currentUser.token };
          setCurrentUser(updatedUser);
          localStorage.setItem('qarabag_user', JSON.stringify(updatedUser));
        }
      }
    }
  }, [dbState, currentUser]);



  // Manual form login / registration with password
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;

    setLoginSubmitting(true);
    setError('');
    try {
      if (isRegisterMode) {
        // Self-Registration
        if (!loginPassword) {
          throw new Error(language === 'AZ' ? 'Zəhmət olmasa şifrə təyin edin.' : 'Please set a password.');
        }
        if (!loginName.trim()) {
          throw new Error(language === 'AZ' ? 'Zəhmət olmasa ad və soyadınızı daxil edin.' : 'Please enter your full name.');
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            name: loginName.trim(),
            role: loginRole,
            details: loginDetails.trim() || undefined,
            password: loginPassword
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || (language === 'AZ' ? 'Qeydiyyat xətası.' : 'Registration error.'));
        }
        
        setIsRegisterMode(false);
        setLoginPassword('');
        setLoginName('');
        setLoginDetails('');
        // Tell user it's pending approval
        alert(language === 'AZ' ? 'Müraciətiniz qeydə alındı! Giriş edə bilmək üçün administrator tərəfindən təsdiqlənməsini gözləyin.' : 'Your application has been received! Please wait for administrator approval to log in.');
      } else {
        // Regular Login
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail.trim(),
            password: loginPassword
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || (language === 'AZ' ? 'Giriş xətası.' : 'Login error.'));
        }
        const user = await res.json();
        setCurrentUser(user);
        localStorage.setItem('qarabag_user', JSON.stringify(user));
        setLoginEmail('');
        setLoginName('');
        setLoginDetails('');
        setLoginPassword('');
        await fetchState();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setDbState(null);
    localStorage.removeItem('qarabag_user');
    setShowNotifDropdown(false);
  };

  // Submit suggestion from Student / Enterprise
  const handleSubmitSuggestion = async (suggestionData: any) => {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestionData)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Məlumat göndərilə bilmədi.' : 'Data could not be submitted.'));
    }
    await fetchState();
  };

  // Evaluate / Update suggestion status from Program Head
  const handleEvaluateSuggestion = async (id: string, evaluationData: any) => {
    const res = await fetch(`/api/suggestions/${id}/evaluate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evaluationData)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Qiymətləndirmə tətbiq olunmadı.' : 'Evaluation could not be applied.'));
    }
    await fetchState();
  };

  // Assign Suggestion to a Teacher (Head)
  const handleAssignTeacher = async (id: string, assignedTeacherEmail: string) => {
    const res = await fetch(`/api/suggestions/${id}/assign-teacher`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTeacherEmail })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Müəllimə yönləndirmək mümkün olmadı.' : 'Could not assign to teacher.'));
    }
    await fetchState();
  };

  // Teacher submits their analysis and proposed changes
  const handleTeacherSubmit = async (id: string, teacherEvaluationNotes: string, teacherProposedChanges: string) => {
    const res = await fetch(`/api/suggestions/${id}/teacher-submit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherEvaluationNotes, teacherProposedChanges })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Təklif təqdim edilə bilmədi.' : 'Could not submit proposal.'));
    }
    await fetchState();
  };

  // Head approves / modifies and approves teacher's contribution
  const handleHeadApproveTeacher = async (id: string, data: any) => {
    const res = await fetch(`/api/suggestions/${id}/head-approve-teacher`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Təsdiqləmə uğursuz oldu.' : 'Approval failed.'));
    }
    await fetchState();
  };

  // Add Program (Head)
  const handleAddProgram = async (name: string, description: string, totalCredits?: number, createdBy?: string, allowedHeads?: string[]) => {
    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, totalCredits, createdBy, allowedHeads })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Proqram yaradıla bilmədi.' : 'Program could not be created.'));
    }
    const data = await res.json();
    await fetchState();
    return data;
  };

  // Add Syllabus (Head / Teacher)
  const handleAddSyllabus = async (programId: string, code: string, name: string, content: string, credits?: number, teacherEmail?: string, teacherEmails?: string[]) => {
    const res = await fetch('/api/syllabi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId, code, name, content, credits, teacherEmail, teacherEmails })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Sillabus yaradıla bilmədi.' : 'Syllabus could not be created.'));
    }
    const data = await res.json();
    await fetchState();
    return data;
  };

  // Update Program (Head)
  const handleUpdateProgram = async (id: string, data: any) => {
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Proqram yenilənmədi.' : 'Program could not be updated.'));
    }
    await fetchState();
  };

  // Update Syllabus (Head)
  const handleUpdateSyllabus = async (id: string, data: any) => {
    const res = await fetch(`/api/syllabi/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Sillabus yenilənmədi.' : 'Syllabus could not be updated.'));
    }
    await fetchState();
  };

  // Delete Program (Head)
  const handleDeleteProgram = async (id: string) => {
    const res = await fetch(`/api/programs/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Proqram silinə bilmədi.' : 'Program could not be deleted.'));
    }
    await fetchState();
  };

  // Delete Syllabus (Head / Teacher)
  const handleDeleteSyllabus = async (id: string) => {
    const res = await fetch(`/api/syllabi/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Sillabus silinə bilmədi.' : 'Syllabus could not be deleted.'));
    }
    await fetchState();
  };

  // Run AI analysis through Gemini
  const handleRunAIAnalysis = async (
    programId: string,
    syllabusId: string | undefined,
    suggestionIds: string[]
  ): Promise<AIAnalysisResponse> => {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId, syllabusId, suggestionIds })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'AI analizi alınmadı.' : 'AI analysis could not be retrieved.'));
    }
    return res.json();
  };

  // Add Reference Document (Head / Admin)
  const handleAddReferenceDoc = async (name: string, content: string, type: 'program' | 'syllabus' | 'general', associatedId?: string, fileSize?: string, htmlContent?: string) => {
    const res = await fetch('/api/reference-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, type, associatedId, fileSize, htmlContent })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Referans sənəd əlavə edilə bilmədi.' : 'Reference document could not be added.'));
    }
    await fetchState();
  };

  // Delete Reference Document (Head / Admin)
  const handleDeleteReferenceDoc = async (id: string) => {
    const res = await fetch(`/api/reference-docs/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || (language === 'AZ' ? 'Referans sənəd silinə bilmədi.' : 'Reference document could not be deleted.'));
    }
    await fetchState();
  };

  // Clear or read notifications
  const handleMarkNotifsRead = async () => {
    if (!currentUser) return;
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email })
    });
    await fetchState();
  };

  const handleClearNotifs = async () => {
    if (!currentUser) return;
    await fetch('/api/notifications/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email })
    });
    await fetchState();
    setShowNotifDropdown(false);
  };

  // Filter current user's notifications
  const userNotifications = dbState?.notifications.filter(
    n => n.userEmail.toLowerCase() === currentUser?.email.toLowerCase()
  ) || [];

  const unreadCount = userNotifications.filter(n => !n.read).length;

  // Determine dynamic simulated user role and model for Administrator simulation
  const activeRoleToRender = currentUser ? (currentUser.role === 'admin' ? adminActiveRole : currentUser.role) : null;
  
  // Custom user mapping for simulated views
  const currentUserToPass: User | null = currentUser ? (
    currentUser.role === 'admin' && adminActiveRole !== 'admin' ? {
      ...currentUser,
      role: adminActiveRole,
      name: language === 'AZ' 
        ? `Sistem Administratoru (${adminActiveRole === 'head' ? 'Proqram Rəhbəri' : adminActiveRole === 'teacher' ? 'Müəllim' : adminActiveRole === 'student' ? 'Tələbə' : 'Müəssisə'} Görünüşü)`
        : `System Admin (${adminActiveRole === 'head' ? 'Program Head' : adminActiveRole === 'teacher' ? 'Teacher' : adminActiveRole === 'student' ? 'Student' : 'Enterprise'} View)`
    } : currentUser
  ) : null;

  if (loading && !dbState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#e6f9f6] text-emerald-950 p-6">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin mb-4"></div>
        <p className="text-sm font-medium">{t('appName')} {t('pleaseWait')}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between bg-[#e6f9f6] ${!currentUser ? 'relative' : ''}`} id="app-container">
      {/* Floating Language Switcher for Guest/Login page */}
      {!currentUser && (
        <div className="absolute top-4 right-4 z-40">
          <div className="flex items-center bg-slate-100/80 backdrop-blur-md rounded-xl p-1 border border-slate-200 text-[10px] md:text-[11px] font-bold shrink-0 shadow-sm">
            <button
              type="button"
              onClick={() => setLanguage('AZ')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'AZ' ? 'bg-[#16423C] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AZ
            </button>
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                language === 'EN' ? 'bg-[#16423C] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      )}

      {/* --- TOP-BAR HEADER (Only visible after login) --- */}
      {currentUser && (
        <header className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-md z-30 sticky top-0" id="app-header">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-white flex items-center justify-center">
                <Logo className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm md:text-base leading-tight tracking-wide text-white flex items-center gap-1.5">
                  {language === 'AZ' ? 'Qarabağ Universiteti' : 'Qarabağ University'}
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-semibold px-1.5 py-0.5 rounded border border-amber-400/30">ICMS</span>
                </h1>
                <p className="text-[11px] text-emerald-200/90 font-medium">{t('appSubtitle')}</p>
              </div>
            </div>

            {/* User Session Info / Top controls */}
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="flex items-center bg-emerald-950/40 rounded-xl p-1 border border-emerald-800/60 text-[10px] md:text-[11px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage('AZ')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'AZ' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  AZ
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('EN')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    language === 'EN' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              <>
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-emerald-300/90 italic">
                    {currentUser.role === 'admin' && t('roleAdmin')}
                    {currentUser.role === 'head' && t('roleHead')}
                    {currentUser.role === 'student' && t('roleStudent')}
                    {currentUser.role === 'enterprise' && t('roleEnterprise')}
                    {currentUser.details ? ` (${currentUser.details})` : ''}
                  </span>
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifDropdown(!showNotifDropdown);
                      if (!showNotifDropdown && unreadCount > 0) {
                        handleMarkNotifsRead();
                      }
                    }}
                    className="p-2 bg-emerald-800/40 hover:bg-emerald-800/80 rounded-xl transition-all relative border border-emerald-700/50 cursor-pointer"
                    title={t('notifications')}
                  >
                    <Bell className="w-4.5 h-4.5 text-emerald-100" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-emerald-900"></span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  <AnimatePresence>
                    {showNotifDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 text-slate-800 z-50"
                      >
                        <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">{t('notifications')}</h4>
                          {userNotifications.length > 0 && (
                            <button
                              onClick={handleClearNotifs}
                              className="text-[10px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {language === 'AZ' ? 'Təmizlə' : 'Clear'}
                            </button>
                          )}
                        </div>

                        <div className="max-h-64 overflow-y-auto pr-1">
                          {userNotifications.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8 px-4 italic">{t('noNotifications')}.</p>
                          ) : (
                            userNotifications.map(n => (
                              <div
                                key={n.id}
                                className={`px-4 py-3 border-b border-slate-50/80 last:border-0 text-xs transition-colors ${
                                  !n.read ? 'bg-emerald-50/20' : ''
                                }`}
                              >
                                <p className="leading-relaxed text-slate-700">{n.message}</p>
                                <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString(language === 'AZ' ? 'az-AZ' : 'en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-red-300 rounded-xl text-xs font-semibold transition-all border border-slate-700/60 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </button>
              </>
            </div>
          </div>
        </header>
      )}

      {/* --- MAIN WORKSPACE --- */}
      <main className="w-full px-4 md:px-6 flex-grow max-w-7xl mx-auto py-8" id="app-main-content">
        {currentUser ? (
          <div className="space-y-6">
            {/* Administrator Role Control Hub */}
            {currentUser.role === 'admin' && (
              <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white rounded-2xl p-3.5 shadow-xl border border-red-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 shadow-inner">
                    <Shield className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                      {language === 'AZ' ? 'Sistem Administratoru' : 'System Administrator'}
                    </h3>
                    <p className="text-[10px] text-slate-300 mt-0.5 whitespace-nowrap">
                      {language === 'AZ' ? 'Simulyasiya Paneli:' : 'Simulation Panel:'}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-nowrap overflow-x-auto gap-2 w-full md:w-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setAdminActiveRole('admin')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      adminActiveRole === 'admin'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border border-red-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </button>
                  
                  <button
                    onClick={() => setAdminActiveRole('head')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      adminActiveRole === 'head'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Proqram Rəhbəri' : 'Program Head'}
                  </button>

                  <button
                    onClick={() => setAdminActiveRole('teacher')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      adminActiveRole === 'teacher'
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 border border-teal-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Müəllim' : 'Teacher'}
                  </button>
                  
                  <button
                    onClick={() => setAdminActiveRole('student')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      adminActiveRole === 'student'
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Tələbə' : 'Student'}
                  </button>
                  
                  <button
                    onClick={() => setAdminActiveRole('enterprise')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      adminActiveRole === 'enterprise'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 border border-amber-500'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Müəssisə' : 'Enterprise'}
                  </button>
                </div>
              </div>
            )}

            {/* Dashboard Routing depending on role */}
            {(() => {
              // Filter reference documents based on owner/assignment visibility rules
              const visibleReferenceDocs = docsToFilter(
                dbState?.referenceDocs || [], 
                currentUserToPass,
                dbState?.programs || [],
                dbState?.syllabi || []
              );

              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeRoleToRender}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    {activeRoleToRender === 'admin' && (
                      <AdminPanel
                        currentUser={currentUserToPass!}
                        onRefreshApp={fetchState}
                      />
                    )}

                    {activeRoleToRender === 'student' && (
                      <StudentPanel
                        currentUser={currentUserToPass!}
                        programs={dbState?.programs || []}
                        syllabi={dbState?.syllabi || []}
                        suggestions={dbState?.suggestions || []}
                        onSubmitSuggestion={handleSubmitSuggestion}
                      />
                    )}

                    {activeRoleToRender === 'enterprise' && (
                      <EnterprisePanel
                        currentUser={currentUserToPass!}
                        programs={dbState?.programs || []}
                        syllabi={dbState?.syllabi || []}
                        suggestions={dbState?.suggestions || []}
                        onSubmitSuggestion={handleSubmitSuggestion}
                      />
                    )}

                    {activeRoleToRender === 'head' && (
                      <ProgramHeadPanel
                        currentUser={currentUserToPass!}
                        programs={dbState?.programs || []}
                        syllabi={dbState?.syllabi || []}
                        suggestions={dbState?.suggestions || []}
                        users={dbState?.users || []}
                        referenceDocs={visibleReferenceDocs}
                        onAddProgram={handleAddProgram}
                        onAddSyllabus={handleAddSyllabus}
                        onUpdateProgram={handleUpdateProgram}
                        onUpdateSyllabus={handleUpdateSyllabus}
                        onDeleteProgram={handleDeleteProgram}
                        onDeleteSyllabus={handleDeleteSyllabus}
                        onEvaluateSuggestion={handleEvaluateSuggestion}
                        onRunAIAnalysis={handleRunAIAnalysis}
                        onAddReferenceDoc={handleAddReferenceDoc}
                        onDeleteReferenceDoc={handleDeleteReferenceDoc}
                        onAssignTeacher={handleAssignTeacher}
                        onHeadApproveTeacher={handleHeadApproveTeacher}
                      />
                    )}

                    {activeRoleToRender === 'teacher' && (
                      <TeacherPanel
                        currentUser={currentUserToPass!}
                        programs={dbState?.programs || []}
                        syllabi={dbState?.syllabi || []}
                        suggestions={dbState?.suggestions || []}
                        users={dbState?.users || []}
                        referenceDocs={visibleReferenceDocs}
                        onAddSyllabus={handleAddSyllabus}
                        onUpdateSyllabus={handleUpdateSyllabus}
                        onDeleteSyllabus={handleDeleteSyllabus}
                        onEvaluateSuggestion={handleEvaluateSuggestion}
                        onRunAIAnalysis={handleRunAIAnalysis}
                        onTeacherSubmit={handleTeacherSubmit}
                        onAddReferenceDoc={handleAddReferenceDoc}
                        onDeleteReferenceDoc={handleDeleteReferenceDoc}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </div>
        ) : (
          /* --- LOGIN CARD / GORGEOUS WELCOME --- */
          <div className="max-w-md mx-auto my-8 bg-white border border-emerald-100 rounded-3xl p-8 shadow-xl shadow-emerald-950/5">
            <div className="text-center space-y-3 mb-6">
              <div className="flex justify-center mx-auto">
                <Logo className="w-28 h-28 text-[#16423C]" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-extrabold text-[#16423C] leading-snug">
                  {language === 'AZ' 
                    ? 'Tədris Proqramlarının və Sillabusların Birgə Qiymətləndirilməsi Platforması' 
                    : 'Platform for Collaborative Evaluation of Curricula and Syllabi'}
                </h2>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}



            {/* Giriş vs Qeydiyyat tab selector */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className={`py-2 rounded-lg transition-all cursor-pointer ${!isRegisterMode ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className={`py-2 rounded-lg transition-all cursor-pointer ${isRegisterMode ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('registerTab')}
              </button>
            </div>

            {/* Custom register/login form */}
            <form onSubmit={handleManualLogin} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('emailLabel')} *</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="name.surname@qu.edu.az"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('passwordLabel')} *</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 font-medium"
                  required
                />
              </div>

              {isRegisterMode && (
                <>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('fullNameLabel')} *</label>
                      <input
                        type="text"
                        value={loginName}
                        onChange={e => setLoginName(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. Əli Məmmədov' : 'E.g. Ali Mammadov'}
                        required={isRegisterMode}
                        className="w-full px-4 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('roleLabel')}</label>
                        <select
                          value={loginRole}
                          onChange={e => setLoginRole(e.target.value as any)}
                          className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none text-slate-700 font-semibold"
                        >
                          <option value="student">{t('roleStudent')}</option>
                          <option value="enterprise">{t('roleEnterprise')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t('detailsLabel')}</label>
                        <input
                          type="text"
                          value={loginDetails}
                          onChange={e => setLoginDetails(e.target.value)}
                          placeholder={language === 'AZ' ? 'Məs. 3-cü kurs' : 'E.g. 3rd year'}
                          className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  </motion.div>
                </>
              )}

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full mt-4 py-3 bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loginSubmitting 
                  ? t('pleaseWait') 
                  : isRegisterMode 
                    ? t('registerBtn') 
                    : t('loginBtn')}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* --- PREMIUM THEMATIC FOOTER --- */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-900" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5 text-white justify-start">
              <Logo className="w-6.5 h-6.5 text-amber-400" />
              <span className="font-extrabold text-sm tracking-wide">
                {language === 'AZ' ? 'Qarabağ Universiteti Pedaqoji Fakültəsi' : 'Qarabağ University Faculty of Pedagogy'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              {language === 'AZ' 
                ? 'Qarabağ bölgəsinin sürətli yenidənqurulmasında təhsilin müstəsna rolunu dərk edərək, müəllimlik ixtisaslarımızın tədris planlarını bazar ehtiyacları və tələbə təcrübələrinə əsasən daimi təkmilləşdiririk.'
                : 'Recognizing the exceptional role of education in the rapid reconstruction of the Qarabağ region, we continuously improve our pedagogical curricula based on market needs and student experiences.'}
            </p>
          </div>

          <div className="hidden md:block md:col-span-3 text-xs space-y-1 text-left">
            <h5 className="font-bold text-slate-400">
              {language === 'AZ' ? 'Coğrafi Hədəflər' : 'Geographical Focus'}
            </h5>
            <ul className="space-y-1 text-slate-500">
              <li>{language === 'AZ' ? '• Şuşa şəhər məktəbləri' : '• Shusha city schools'}</li>
              <li>{language === 'AZ' ? '• Ağdam rəqəmsal laboratoriyaları' : '• Aghdam digital laboratories'}</li>
              <li>{language === 'AZ' ? '• Xankəndi Pedaqoji İnnovasiya Mərkəzi' : '• Khankendi Pedagogical Innovation Center'}</li>
            </ul>
          </div>

          <div className="md:col-span-4 text-center md:text-right space-y-2">
            <p className="text-xs font-mono text-slate-500">
              {language === 'AZ' ? '© 2026 Qarabağ Universiteti. Bütün hüquqlar qorunur.' : '© 2026 Qarabağ University. All rights reserved.'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/50 text-emerald-400 border border-emerald-900/60 rounded-full text-[10px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {language === 'AZ' ? 'Təhsillə yüksələn Qarabağ' : 'Qarabağ rising with education'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
