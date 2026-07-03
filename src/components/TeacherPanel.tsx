import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Program, Syllabus, SuggestionCase, User, AIAnalysisResponse, ReferenceDocument } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import DocumentReader from './DocumentReader';
import { 
  Plus, BookOpen, Layers, Sparkles, AlertCircle, CheckCircle2, 
  XCircle, Clock, Wand2, History, Edit, FileText, Check, ChevronRight,
  Search, ChevronDown, UserCheck, Trash2, Database, FileUp
} from 'lucide-react';

interface TeacherPanelProps {
  currentUser: User;
  programs: Program[];
  syllabi: Syllabus[];
  suggestions: SuggestionCase[];
  users: User[];
  referenceDocs?: ReferenceDocument[];
  onAddSyllabus: (programId: string, code: string, name: string, content: string, credits?: number, teacherEmail?: string, teacherEmails?: string[]) => Promise<any>;
  onUpdateSyllabus: (id: string, data: any) => Promise<void>;
  onDeleteSyllabus?: (id: string) => Promise<void>;
  onEvaluateSuggestion: (id: string, data: any) => Promise<void>;
  onRunAIAnalysis: (programId: string, syllabusId: string | undefined, suggestionIds: string[]) => Promise<AIAnalysisResponse>;
  onTeacherSubmit: (id: string, notes: string, proposedChanges: string) => Promise<void>;
  onAddReferenceDoc?: (name: string, content: string, type: 'program' | 'syllabus' | 'general', associatedId?: string, fileSize?: string, htmlContent?: string) => Promise<void>;
  onDeleteReferenceDoc?: (id: string) => Promise<void>;
}

export default function TeacherPanel({
  currentUser,
  programs,
  syllabi,
  suggestions,
  users,
  referenceDocs = [],
  onAddSyllabus,
  onUpdateSyllabus,
  onDeleteSyllabus,
  onEvaluateSuggestion,
  onRunAIAnalysis,
  onTeacherSubmit,
  onAddReferenceDoc,
  onDeleteReferenceDoc
}: TeacherPanelProps) {
  const { language, t } = useLanguage();

  // Core teacher filter logic
  // Teacher owns syllabi where teacherEmail equals currentUser.email or currentUser.email is in teacherEmails (case-insensitive check)
  const mySyllabi = syllabi.filter(s => {
    if (!currentUser?.email) return false;
    const curEmail = currentUser.email.toLowerCase().trim();
    const isPrimaryTeacher = s.teacherEmail ? s.teacherEmail.toLowerCase().trim() === curEmail : false;
    const isCoTeacher = s.teacherEmails ? s.teacherEmails.some(email => email.toLowerCase().trim() === curEmail) : false;
    return isPrimaryTeacher || isCoTeacher;
  });
  const mySyllabiIds = mySyllabi.map(s => s.id);
  const myProgramIdsArray = Array.from(new Set(mySyllabi.map(s => s.programId)));
  const myProgramIds = new Set(mySyllabi.map(s => s.programId));
  const myPrograms = programs.filter(p => myProgramIds.has(p.id));

  // Tabs: 'programs' | 'suggestions' | 'ai' | 'references'
  const [activeTab, setActiveTab] = useState<'programs' | 'suggestions' | 'ai' | 'references'>('programs');
  const [suggestionsFilter, setSuggestionsFilter] = useState<'incoming' | 'executed'>('incoming');

  // Reference Documents States
  const [showAddReferenceDoc, setShowAddReferenceDoc] = useState(false);
  const [refDocInputMode, setRefDocInputMode] = useState<'manual' | 'word'>('manual');
  const [refDocName, setRefDocName] = useState('');
  const [refDocContent, setRefDocContent] = useState('');
  const [refDocHtmlContent, setRefDocHtmlContent] = useState('');
  const [refDocType, setRefDocType] = useState<'program' | 'syllabus' | 'general'>('general');
  const [refDocAssociatedId, setRefDocAssociatedId] = useState('');
  const [refDocUploading, setRefDocUploading] = useState(false);
  const [selectedRefDoc, setSelectedRefDoc] = useState<ReferenceDocument | null>(null);

  // Syllabus Form States
  const [showAddSyllabus, setShowAddSyllabus] = useState(false);
  const [syllabusInputMode, setSyllabusInputMode] = useState<'choice' | 'manual' | 'word'>('choice');
  const [syllProgramId, setSyllProgramId] = useState(programs[0]?.id || '');
  const [syllCode, setSyllCode] = useState('');
  const [syllName, setSyllName] = useState('');
  const [syllContent, setSyllContent] = useState('');
  const [syllCredits, setSyllCredits] = useState<number>(6);

  const [parsedRawText, setParsedRawText] = useState('');
  const [parsedHtml, setParsedHtml] = useState('');

  // Syllabus Editing States
  const [selectedSyll, setSelectedSyll] = useState<Syllabus | null>(null);
  const [isEditingSyll, setIsEditingSyll] = useState(false);

  // Custom Inline Confirmation Dialog States
  const [deleteConfirm, setDeleteConfirm] = useState<{
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [editSyllName, setEditSyllName] = useState('');
  const [editSyllCode, setEditSyllCode] = useState('');
  const [editSyllContent, setEditSyllContent] = useState('');
  const [editSyllComment, setEditSyllComment] = useState('');
  const [editSyllCredits, setEditSyllCredits] = useState<number>(6);

  // Manual Evaluation States
  const [evaluatingCaseId, setEvaluatingCaseId] = useState<string | null>(null);
  const [evalStatus, setEvalStatus] = useState<'Baxılır' | 'Qəbul edildi' | 'Rədd edildi' | 'Tətbiq olundu'>('Baxılır');
  const [evalComment, setEvalComment] = useState('');
  const [evalAction, setEvalAction] = useState('');

  // AI Workspace States
  const [aiSelectedProgramId, setAiSelectedProgramId] = useState(myPrograms[0]?.id || '');
  const [aiSelectedSyllabusId, setAiSelectedSyllabusId] = useState('');
  const [aiSelectedSuggestionIds, setAiSelectedSuggestionIds] = useState<string[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiLoadingMessageIdx, setAiLoadingMessageIdx] = useState(0);

  // Success / Error alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Search & Expand/Collapse states for Programs
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProgramIds, setExpandedProgramIds] = useState<Record<string, boolean>>({});

  // Word (.docx) Quick Upload States
  const [parsingDocx, setParsingDocx] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    name: string;
    summary: string;
    targets: string[];
    keywords: string[];
    documentType: 'program' | 'syllabus';
    suggestedCode?: string;
  } | null>(null);
  const [parsedDocName, setParsedDocName] = useState('');
  const [targetProgramIdForSyllabus, setTargetProgramIdForSyllabus] = useState(myPrograms[0]?.id || '');

  // Filter reference documents so teacher only sees ones associated with their own programs/syllabi or general ones
  const teacherRefDocs = (referenceDocs || []).filter(doc => {
    if (doc.type === 'general') return true;
    if (doc.associatedId) {
      return myProgramIdsArray.includes(doc.associatedId) || mySyllabiIds.includes(doc.associatedId);
    }
    return true;
  });

  // Save reference doc handler
  const handleSaveReferenceDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refDocName.trim() || !refDocContent.trim()) {
      setActionError(language === 'AZ' ? 'Sənəd adı və məzmunu boş ola bilməz.' : 'Document name and content cannot be empty.');
      return;
    }

    try {
      if (onAddReferenceDoc) {
        await onAddReferenceDoc(
          refDocName.trim(),
          refDocContent.trim(),
          refDocType,
          refDocAssociatedId || undefined,
          `${(refDocContent.length / 1024).toFixed(1)} KB`,
          refDocHtmlContent.trim() || undefined
        );
        setActionSuccess(language === 'AZ' ? 'Referans sənəd uğurla yadda saxlanıldı!' : 'Reference document saved successfully!');
        setShowAddReferenceDoc(false);
        setRefDocName('');
        setRefDocContent('');
        setRefDocHtmlContent('');
        setRefDocType('general');
        setRefDocAssociatedId('');
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Error saving reference document.');
    }
  };

  // Word docx parse for Reference Document
  const handleRefDocWordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setActionError(language === 'AZ' ? 'Yalnız Word (.docx) sənədləri dəstəklənir.' : 'Only Word (.docx) documents are supported.');
      return;
    }

    setRefDocUploading(true);
    setActionError('');
    setRefDocName(file.name.replace('.docx', ''));

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1];
          const res = await fetch('/api/parse-docx-raw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: base64, fileName: file.name })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Parsing error');
          }

          const data = await res.json();
          setRefDocContent(data.text);
          setRefDocHtmlContent(data.html || '');
          setActionSuccess(language === 'AZ' ? 'Word faylı uğurla oxundu və məzmunu çıxarıldı!' : 'Word file parsed and content extracted successfully!');
          setTimeout(() => setActionSuccess(''), 4000);
        } catch (err: any) {
          setActionError(language === 'AZ' ? 'Fayl oxunarkən xəta baş verdi: ' + err.message : 'Error reading file: ' + err.message);
        } finally {
          setRefDocUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setActionError(language === 'AZ' ? 'Fayl oxunarkən xəta baş verdi.' : 'Error uploading file.');
      setRefDocUploading(false);
    }
  };

  const [submittingTeacherCaseId, setSubmittingTeacherCaseId] = useState<string | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [teacherProposedText, setTeacherProposedText] = useState('');

  // Filter suggestions to show only those belonging to teacher's syllabi OR explicitly assigned to them
  const teacherSuggestions = suggestions.filter(s => 
    (s.syllabusId && mySyllabiIds.includes(s.syllabusId)) ||
    (s.assignedTeacherEmail && s.assignedTeacherEmail.toLowerCase() === currentUser.email.toLowerCase())
  );

  // Program metrics based on teacher's syllabi
  const incomingSuggestions = teacherSuggestions.filter(s => s.status === 'Baxılır' || s.status === 'Qəbul edildi');
  const executedSuggestions = teacherSuggestions.filter(s => s.status === 'Tətbiq olundu' || s.status === 'Rədd edildi');

  const visibleSuggestions = suggestionsFilter === 'incoming' ? incomingSuggestions : executedSuggestions;

  // AI loading messages list
  const loadingMessages = language === 'AZ' ? [
    "Sillabusun mövcud məzmunu təhlil edilir...",
    "Təkliflərin sənaye və dövlət standartlarına uyğunluğu yoxlanılır...",
    "Gemini AI vasitəsilə təkmilləşdirmə ssenariləri hazırlanır...",
    "Sillabusa tətbiq ediləcək yeni mövzular formalaşdırılır...",
    "Sintaktik və məna uyğunlaşdırılması tamamlanır..."
  ] : [
    "Analyzing the current content of the syllabus...",
    "Checking suggestions for industry and state standard alignment...",
    "Generating improvement scenarios using Gemini AI...",
    "Formulating new topics to be applied to the syllabus...",
    "Completing syntactic and semantic alignment..."
  ];

  const handleDocxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      setActionError(language === 'AZ' ? 'Yalnız Word (.docx) sənədləri dəstəklənir.' : 'Only Word (.docx) documents are supported.');
      return;
    }

    setParsingDocx(true);
    setParsedDocName(file.name);
    setActionError('');
    setActionSuccess('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = (event.target?.result as string).split(',')[1];
        const res = await fetch('/api/parse-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, fileName: file.name })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || (language === 'AZ' ? 'Word faylının analizi alınmadı.' : 'Word file analysis failed.'));
        }
        setParsedResult(data.extracted);
        setParsedRawText(data.rawText || '');
        setParsedHtml(data.html || '');
        setActionSuccess(language === 'AZ' ? 'Word sənədi uğurla təhlil edildi və məlumatlar strukturlaşdırıldı!' : 'Word document was analyzed successfully and data was structured!');
      } catch (err: any) {
        setActionError(err.message || (language === 'AZ' ? 'Word oxunarkən xəta yarandı.' : 'An error occurred while reading the Word document.'));
        setParsedResult(null);
        setParsedRawText('');
        setParsedHtml('');
      } finally {
        setParsingDocx(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveParsedResult = async () => {
    if (!parsedResult) return;
    try {
      setActionError('');
      setActionSuccess('');
      const pId = targetProgramIdForSyllabus || programs[0]?.id;
      if (!pId) {
        throw new Error(language === 'AZ' ? 'Zəhmət olmasa bir tədris proqramı seçin.' : 'Please select a curriculum program.');
      }
      const code = parsedResult.suggestedCode || `INF-${Math.floor(100 + Math.random() * 899)}`;
      
      // Auto-assign to current teacher email
      const newSyll = await onAddSyllabus(pId, code, parsedResult.name, parsedResult.summary, 6, currentUser.email);
      
      // Auto-upload to reference docs
      if (newSyll && newSyll.id && onAddReferenceDoc) {
        try {
          await onAddReferenceDoc(
            parsedDocName || parsedResult.name,
            parsedRawText || parsedResult.summary,
            'syllabus',
            newSyll.id,
            '45 KB',
            parsedHtml || undefined
          );
        } catch (docErr) {
          console.error("Auto-uploading reference document failed:", docErr);
        }
      }

      setActionSuccess(language === 'AZ' ? 'Sillabus Word-dən uğurla yaradıldı, sizə təyin olundu və avtomatik referans sənədlərə yükləndi!' : 'Syllabus was successfully created from Word, assigned to you, and automatically uploaded to reference documents!');
      setShowAddSyllabus(false);
      setParsedResult(null);
      setParsedDocName('');
      setParsedRawText('');
      setParsedHtml('');
    } catch (err: any) {
      setActionError(err.message || 'Error creating syllabus');
    }
  };

  const handleAddSyllabusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllProgramId || !syllCode || !syllName || !syllContent) {
      setActionError(language === 'AZ' ? 'Zəhmət olmasa bütün sahələri doldurun.' : 'Please fill all fields.');
      return;
    }

    try {
      setActionError('');
      setActionSuccess('');
      // Auto-assign to current teacher email
      const newSyll = await onAddSyllabus(syllProgramId, syllCode, syllName, syllContent, syllCredits, currentUser.email);
      
      // Auto-upload manual syllabus to reference docs
      if (newSyll && newSyll.id && onAddReferenceDoc) {
        try {
          await onAddReferenceDoc(
            syllName,
            syllContent,
            'syllabus',
            newSyll.id,
            `${(syllContent.length / 1024).toFixed(1)} KB`
          );
        } catch (docErr) {
          console.error("Auto-uploading manual reference document failed:", docErr);
        }
      }

      setActionSuccess(language === 'AZ' ? 'Sillabus uğurla yaradıldı, sizə təyin olundu və avtomatik referans sənədlərə əlavə edildi!' : 'Syllabus was successfully created, assigned to you, and automatically added to reference documents!');
      setShowAddSyllabus(false);
      setSyllCode('');
      setSyllName('');
      setSyllContent('');
      setSyllCredits(6);
    } catch (err: any) {
      setActionError(err.message || 'Error adding syllabus');
    }
  };

  const handleOpenEditSyllabus = (syll: Syllabus) => {
    setSelectedSyll(syll);
    setEditSyllName(syll.name);
    setEditSyllCode(syll.code);
    setEditSyllContent(syll.content);
    setEditSyllCredits(syll.credits || 6);
    setEditSyllComment('');
    setIsEditingSyll(true);
  };

  const handleUpdateSyllabusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyll) return;

    try {
      setActionError('');
      setActionSuccess('');
      await onUpdateSyllabus(selectedSyll.id, {
        name: editSyllName,
        code: editSyllCode,
        content: editSyllContent,
        credits: editSyllCredits,
        updateComment: editSyllComment || (language === 'AZ' ? 'Müəllim tərəfindən yeniləndi.' : 'Updated by teacher.')
      });

      setActionSuccess(language === 'AZ' ? 'Sillabus uğurla yeniləndi!' : 'Syllabus updated successfully!');
      setIsEditingSyll(false);
      setSelectedSyll(null);
    } catch (err: any) {
      setActionError(err.message || 'Error updating syllabus');
    }
  };

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingCaseId) return;

    try {
      setActionError('');
      setActionSuccess('');
      await onEvaluateSuggestion(evaluatingCaseId, {
        status: evalStatus,
        evaluation: evalComment,
        actionTaken: evalAction
      });

      setActionSuccess(language === 'AZ' ? 'Rəy uğurla qiymətləndirildi!' : 'Feedback evaluated successfully!');
      setEvaluatingCaseId(null);
      setEvalComment('');
      setEvalAction('');
    } catch (err: any) {
      setActionError(err.message || 'Error evaluating feedback');
    }
  };

  const handleTeacherResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTeacherCaseId) return;

    try {
      setActionError('');
      setActionSuccess('');
      await onTeacherSubmit(submittingTeacherCaseId, teacherNotes, teacherProposedText);
      setActionSuccess(language === 'AZ' ? 'Dəyişiklik təklifiniz proqram rəhbərinə təqdim olundu!' : 'Your proposed changes have been submitted to the program head!');
      setSubmittingTeacherCaseId(null);
      setTeacherNotes('');
      setTeacherProposedText('');
    } catch (err: any) {
      setActionError(err.message || 'Təqdimat uğursuz oldu.');
    }
  };

  const handleRunAI = async () => {
    if (!aiSelectedProgramId || !aiSelectedSyllabusId) {
      setAiError(language === 'AZ' ? 'Zəhmət olmasa bir fənn sillabusu seçin.' : 'Please select a subject syllabus.');
      return;
    }
    if (aiSelectedSuggestionIds.length === 0) {
      setAiError(language === 'AZ' ? 'Zəhmət olmasa analiz üçün ən azı bir rəy seçin.' : 'Please select at least one suggestion for analysis.');
      return;
    }

    setAiAnalyzing(true);
    setAiError('');
    setAiResult(null);

    // Staggered loading text rotation
    setAiLoadingMessageIdx(0);
    const interval = setInterval(() => {
      setAiLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
    }, 3500);

    try {
      const result = await onRunAIAnalysis(aiSelectedProgramId, aiSelectedSyllabusId, aiSelectedSuggestionIds);
      setAiResult(result);
    } catch (err: any) {
      setAiError(err.message || 'AI analysis failed');
    } finally {
      clearInterval(interval);
      setAiAnalyzing(false);
    }
  };

  const toggleProgramExpand = (progId: string) => {
    setExpandedProgramIds(prev => ({
      ...prev,
      [progId]: !prev[progId]
    }));
  };

  const filteredPrograms = myPrograms.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Teacher Dashboard Subheader */}
      <div className="bg-gradient-to-br from-teal-950 to-slate-900 rounded-2xl p-4 text-white relative overflow-hidden shadow-md border border-teal-900/40">
        {/* Teacher metrics bar */}
        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-teal-900/50">
          <div>
            <p className="text-teal-300/60 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">{language === 'AZ' ? 'MƏNİM SİLLABUSLARIM' : 'MY SYLLABI'}</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-white">{mySyllabi.length}</p>
          </div>
          <div className="pl-2">
            <p className="text-teal-300/60 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">{language === 'AZ' ? 'GƏLƏN RƏYLƏR' : 'INCOMING'}</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-white">{incomingSuggestions.length}</p>
          </div>
          <div className="pl-2">
            <p className="text-teal-300/60 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">{language === 'AZ' ? 'İCRA OLUNMUŞLAR' : 'EXECUTED'}</p>
            <p className="text-xl sm:text-2xl font-black mt-1 text-teal-300">{executedSuggestions.length}</p>
          </div>
        </div>
      </div>

      {/* Global Toast Success / Error Alert */}
      {(actionSuccess || actionError) && (
        <div className="space-y-2">
          {actionSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-2xl text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-950 rounded-2xl text-xs flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-700 shrink-0" />
              <span className="font-semibold">{actionError}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex border-b border-slate-100 gap-6">
        <button
          onClick={() => { setActiveTab('programs'); setActionError(''); setActionSuccess(''); }}
          className={`pb-4 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${
            activeTab === 'programs' ? 'text-teal-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {language === 'AZ' ? 'Sillabuslar & Tərcümeyi-hal' : 'Syllabi & Curriculum'}
          {activeTab === 'programs' && <motion.div layoutId="teacherTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-800" />}
        </button>

        <button
          onClick={() => { setActiveTab('suggestions'); setActionError(''); setActionSuccess(''); }}
          className={`pb-4 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'suggestions' ? 'text-teal-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {language === 'AZ' ? 'Sillabus Təklifləri' : 'Syllabus Suggestions'}
          {incomingSuggestions.length > 0 && (
            <span className="w-5 h-5 flex items-center justify-center bg-teal-600 text-white rounded-full text-[10px] font-black">
              {incomingSuggestions.length}
            </span>
          )}
          {activeTab === 'suggestions' && <motion.div layoutId="teacherTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-800" />}
        </button>

        <button
          onClick={() => { setActiveTab('ai'); setActionError(''); setActionSuccess(''); }}
          className={`pb-4 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ai' ? 'text-teal-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          {language === 'AZ' ? 'Gemini AI İş Sahəsi' : 'Gemini AI Workspace'}
          {activeTab === 'ai' && <motion.div layoutId="teacherTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-800" />}
        </button>

        <button
          onClick={() => { setActiveTab('references'); setActionError(''); setActionSuccess(''); }}
          className={`pb-4 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'references' ? 'text-teal-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          {language === 'AZ' ? 'Referans Sənədlər' : 'Reference Documents'}
          {activeTab === 'references' && <motion.div layoutId="teacherTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-800" />}
        </button>
      </div>

      {/* --- TAB 1: PROGRAMS & SYLLABI --- */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'AZ' ? 'Tədris proqramlarında axtarış...' : 'Search curriculum programs...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            
            <button
              onClick={() => {
                setShowAddSyllabus(!showAddSyllabus);
                setSyllabusInputMode('choice');
                setParsedResult(null);
                setParsedDocName('');
              }}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-teal-950/10"
            >
              <Plus className="w-4 h-4" />
              {t('addSyllabusBtn')}
            </button>
          </div>

          {/* Add Syllabus Form */}
          {showAddSyllabus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-teal-700" />
                  {language === 'AZ' ? 'Müəllim Olaraq Yeni Sillabus Əlavə Et' : 'Add New Syllabus as Teacher'}
                </h3>
                {syllabusInputMode !== 'choice' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSyllabusInputMode('choice');
                      setParsedResult(null);
                      setParsedDocName('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors"
                  >
                    {language === 'AZ' ? '← Geri qayıt' : '← Go back'}
                  </button>
                )}
              </div>

              {/* Step 1: Choice of Input Method */}
              {syllabusInputMode === 'choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                  {/* Option A: Import via Word (.docx) */}
                  <button
                    type="button"
                    onClick={() => setSyllabusInputMode('word')}
                    className="group border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                        <Sparkles className="w-5 h-5 text-teal-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-teal-950">
                        {language === 'AZ' ? 'Süni İntellekt ilə Word (.docx) İdxal Et' : 'Import Word (.docx) with AI'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ' 
                          ? 'Müəllim sillabusunu Word (.docx) sənədi olaraq yükləyin. Gemini AI onun xülasəsini, mövzularını, fənn kodunu çıxaracaq və avtomatik sistemə sizin adınızdan daxil edəcək.' 
                          : 'Upload the course syllabus as a Word (.docx) document. Gemini AI will automatically extract summary and course code to submit on your behalf.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>{language === 'AZ' ? 'Word yükləməyə keç' : 'Proceed to Word upload'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Option B: Manual input */}
                  <button
                    type="button"
                    onClick={() => {
                      setSyllabusInputMode('manual');
                      setSyllProgramId(programs[0]?.id || '');
                    }}
                    className="group border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-teal-950">
                        {language === 'AZ' ? 'Sillabusu Manual Əllə Doldur' : 'Fill Syllabus Manually'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ' 
                          ? 'Fənnin adını, ECTS kreditini, fənn kodunu və mövzu məzmununu özünüz daxil edin. Bu dərhal sizə təyin olunacaq.' 
                          : 'Enter course name, ECTS credits, code, and curriculum content manually. It will immediately be assigned to you.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>{language === 'AZ' ? 'Manual formaya keç' : 'Proceed to manual form'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2a: Word Upload and Summary review */}
              {syllabusInputMode === 'word' && (
                <div className="space-y-4">
                  {!parsedResult ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-white space-y-4 hover:border-teal-400 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
                        {parsingDocx ? (
                          <div className="w-6 h-6 rounded-full border-2 border-teal-100 border-t-teal-700 animate-spin"></div>
                        ) : (
                          <Sparkles className="w-6 h-6 text-teal-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {parsingDocx 
                            ? (language === 'AZ' ? 'Süni İntellekt Word sənədini təhlil edir...' : 'AI is analyzing Word document...')
                            : (language === 'AZ' ? 'Faylı bura sürükləyin və ya klikləyin' : 'Drag & drop file here or click to browse')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {language === 'AZ' ? 'Yalnız Word (.docx) formatı qəbul olunur • Pulsuz nümunə kimi istənilən ingilis/azərbaycan dilli fənn layihəsini yükləyə bilərsiniz' : 'Word (.docx) format only'}
                        </p>
                      </div>
                      
                      {!parsingDocx && (
                        <div className="relative inline-block">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={handleDocxUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <span className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors inline-block">
                            {language === 'AZ' ? 'Word Faylı Seçin' : 'Select Word File'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Display structured results */
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10px] font-extrabold uppercase tracking-wide">
                            {language === 'AZ' ? 'Təhlil Olunmuş Fənn Sillabusu' : 'Parsed Subject Syllabus'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{parsedResult.name}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">{language === 'AZ' ? 'Fayl:' : 'File:'} {parsedDocName}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Summary */}
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">{language === 'AZ' ? 'Ümumi Məcmuə (Xülasə)' : 'General Summary'}</h5>
                          <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-[140px] overflow-y-auto whitespace-pre-wrap">
                            {parsedResult.summary}
                          </p>
                        </div>

                        {/* Targets & Keywords */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <h5 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">{language === 'AZ' ? 'Çıxarılan Hədəflər' : 'Extracted Targets'}</h5>
                            <ul className="space-y-1 max-h-[80px] overflow-y-auto">
                              {parsedResult.targets.map((t, idx) => (
                                <li key={idx} className="text-slate-600 leading-normal flex items-start gap-1 font-sans">
                                  <span className="text-teal-700 font-bold shrink-0">•</span>
                                  <span>{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">{language === 'AZ' ? 'Əsas Mövzular' : 'Core Topics'}</h5>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedResult.keywords.map((k, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Select which Program to attach it to */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/20 p-3 rounded-xl border border-teal-100/30">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-bold text-teal-950 uppercase tracking-wider">{language === 'AZ' ? 'AİD OLDUĞU İXTİSAS PROQRAMINI SEÇİN *' : 'SELECT THE CORRESPONDING SPECIALTY PROGRAM *'}</label>
                          <span className="text-[10px] text-slate-400">{language === 'AZ' ? 'Sillabusun daxil ediləcəyi tədris planı' : 'The curriculum plan into which the subject will be entered'}</span>
                        </div>
                        <select
                          value={targetProgramIdForSyllabus}
                          onChange={e => setTargetProgramIdForSyllabus(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-xs focus:outline-none font-semibold"
                        >
                          {myPrograms.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => { setParsedResult(null); setParsedDocName(''); }}
                          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all"
                        >
                          {language === 'AZ' ? 'Faylı dəyiş / Təmizlə' : 'Change / Clear File'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveParsedResult}
                          className="px-4 py-1.5 bg-teal-800 hover:bg-teal-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-teal-800/10"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {language === 'AZ' ? 'Sistemə Daxil Et və Yarat' : 'Submit and Create'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2b: Manual Form */}
              {syllabusInputMode === 'manual' && (
                <form onSubmit={handleAddSyllabusSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'AİD OLDUĞU PROQRAM' : 'CORRESPONDING PROGRAM'}</label>
                      <select
                        value={syllProgramId}
                        onChange={e => setSyllProgramId(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        {myPrograms.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNN KODU' : 'COURSE CODE'}</label>
                      <input
                        type="text"
                        value={syllCode}
                        onChange={e => setSyllCode(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. INF-401' : 'E.g. INF-401'}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNNİN ADI' : 'SUBJECT NAME'}</label>
                      <input
                        type="text"
                        value={syllName}
                        onChange={e => setSyllName(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. Rəqəmsal Pedaqogika' : 'E.g. Digital Pedagogy'}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'KREDİT (ECTS)' : 'CREDITS (ECTS)'}</label>
                      <input
                        type="number"
                        value={syllCredits}
                        onChange={e => setSyllCredits(parseInt(e.target.value) || 6)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        min="1"
                        max="30"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'TƏDRİS MATERİALI VƏ SILLABUS MƏZMUNU' : 'CURRICULUM CONTENT & TOPICS'}</label>
                    <textarea
                      value={syllContent}
                      onChange={e => setSyllContent(e.target.value)}
                      placeholder={language === 'AZ' ? 'Məs. Yaşıl Təhsil prinsipləri, Süni İntellekt metodları və 3-cü modulda praktiki layihələr...' : 'E.g. Green Education principles, AI methodologies and practical projects in module 3...'}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 h-32 resize-y"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSyllabus(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-colors"
                    >
                      {t('cancelBtn')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-xl text-xs transition-colors shadow-sm"
                    >
                      {language === 'AZ' ? 'Sillabusu Yarat' : 'Create Syllabus'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* Stacking Programs and Syllabi - Alt-alta layout as requested */}
          <div className="grid grid-cols-1 gap-6">
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl text-slate-400 text-xs">
                {language === 'AZ' ? 'Axtarışa uyğun proqram tapılmadı.' : 'No programs found matching search.'}
              </div>
            ) : (
              filteredPrograms.map(prog => {
                const progSyllabi = syllabi.filter(s => s.programId === prog.id);
                // Highlight my syllabi in this program
                const mySyllabiInThisProg = progSyllabi.filter(s => {
                  if (!currentUser?.email) return false;
                  const curEmail = currentUser.email.toLowerCase().trim();
                  const isPrimaryTeacher = s.teacherEmail ? s.teacherEmail.toLowerCase().trim() === curEmail : false;
                  const isCoTeacher = s.teacherEmails ? s.teacherEmails.some(email => email.toLowerCase().trim() === curEmail) : false;
                  return isPrimaryTeacher || isCoTeacher;
                });
                const isExpanded = expandedProgramIds[prog.id] ?? true; // expanded by default

                return (
                  <div 
                    key={prog.id}
                    className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-900/5 transition-all relative overflow-hidden"
                  >
                    {/* Upper decorative border for programs with teacher syllabi */}
                    {mySyllabiInThisProg.length > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-teal-600" />
                    )}

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-lg text-[10px] font-extrabold border border-teal-200">
                            {prog.version || 'v1.0'}
                          </span>
                          <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-200">
                            {prog.status || 'Güncəl'}
                          </span>
                          {mySyllabiInThisProg.length > 0 && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              {language === 'AZ' ? 'Kafedramızın Fənni Var' : 'Has My Subject'}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{prog.name}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-normal">{prog.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{language === 'AZ' ? 'CƏM KREDİT' : 'TOTAL CREDITS'}</p>
                          <p className="text-lg font-black text-slate-800">{prog.totalCredits || 240} <span className="text-xs text-slate-400 font-bold">ECTS</span></p>
                        </div>
                        <button
                          onClick={() => toggleProgramExpand(prog.id)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Syllabi List Inside Program */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-4"
                        >
                          <div className="space-y-3">
                            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              {language === 'AZ' ? `FƏNLƏR VƏ SİLLABUSLAR (${progSyllabi.length})` : `SUBJECTS & SYLLABI (${progSyllabi.length})`}
                            </span>

                            {progSyllabi.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">{language === 'AZ' ? 'Hələ ki fənn əlavə edilməyib.' : 'No courses added yet.'}</p>
                            ) : (
                              <div className="space-y-2.5">
                                {progSyllabi.map(syll => {
                                  const curEmail = currentUser?.email?.toLowerCase().trim();
                                  const isPrimary = syll.teacherEmail ? syll.teacherEmail.toLowerCase().trim() === curEmail : false;
                                  const isCo = syll.teacherEmails ? syll.teacherEmails.some(email => email.toLowerCase().trim() === curEmail) : false;
                                  const isMine = isPrimary || isCo;

                                  return (
                                    <div 
                                      key={syll.id}
                                      className={`p-4 border rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                        isMine 
                                          ? 'border-teal-200 bg-teal-50/5 hover:border-teal-400' 
                                          : 'border-slate-100 hover:border-slate-300 bg-white'
                                      }`}
                                    >
                                      <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[9px] font-bold rounded-md font-mono">
                                            {syll.code}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-semibold">
                                            {syll.credits || 6} ECTS
                                          </span>
                                          {(() => {
                                            const emails = syll.teacherEmails || (syll.teacherEmail ? [syll.teacherEmail] : []);
                                            if (emails.length === 0) return null;
                                            const isUserAssigned = emails.includes(currentUser.email);
                                            return (
                                              <div className="flex flex-wrap gap-1.5 items-center">
                                                {isUserAssigned && (
                                                  <span className="px-2 py-0.5 bg-teal-100/60 text-teal-900 text-[9px] font-extrabold rounded-md flex items-center gap-1 border border-teal-200">
                                                    <UserCheck className="w-2.5 h-2.5" />
                                                    {language === 'AZ' ? 'Sizin fənniniz' : 'Your course'}
                                                  </span>
                                                )}
                                                <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-medium rounded-md">
                                                  {language === 'AZ' ? 'Müəllimlər:' : 'Teachers:'} {emails.map(email => {
                                                    const found = users.find(u => u.email === email);
                                                    return found ? found.name : email;
                                                  }).join(', ')}
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        <h4 className="text-xs font-extrabold text-slate-800">{syll.name}</h4>
                                        <p className="text-[11px] text-slate-500 leading-normal max-w-3xl line-clamp-2">{syll.content}</p>
                                      </div>

                                      {/* Actions for syllabus */}
                                      <div className="flex items-center gap-2 shrink-0">
                                        {isMine && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteConfirm({
                                                name: syll.name,
                                                onConfirm: async () => {
                                                  if (onDeleteSyllabus) {
                                                    await onDeleteSyllabus(syll.id);
                                                  }
                                                }
                                              });
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 cursor-pointer transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {language === 'AZ' ? 'Sil' : 'Delete'}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleOpenEditSyllabus(syll)}
                                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isMine 
                                              ? 'bg-teal-850 hover:bg-teal-950 text-white' 
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                                          }`}
                                        >
                                          {isMine ? <Edit className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                          {isMine 
                                            ? (language === 'AZ' ? 'Redaktə Et' : 'Edit')
                                            : (language === 'AZ' ? 'Sillabusa Bax' : 'View Syllabus')
                                          }
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: SUGGESTIONS --- */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filtering control */}
          <div className="flex items-center justify-between p-1 bg-slate-100/60 border border-slate-100 rounded-2xl max-w-xs">
            <button
              onClick={() => setSuggestionsFilter('incoming')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                suggestionsFilter === 'incoming' ? 'bg-white text-teal-950 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {language === 'AZ' ? 'Gələn Təkliflər' : 'Incoming'} ({incomingSuggestions.length})
            </button>
            <button
              onClick={() => setSuggestionsFilter('executed')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                suggestionsFilter === 'executed' ? 'bg-white text-teal-950 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {language === 'AZ' ? 'İcra Olunmuşlar' : 'Executed'} ({executedSuggestions.length})
            </button>
          </div>

          {/* Suggestions List */}
          <div className="space-y-4">
            {visibleSuggestions.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  {language === 'AZ' ? 'Heç bir təklif yoxdur.' : 'No suggestions found.'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  {language === 'AZ' 
                    ? 'Sizin fənlərinizə aid hər hansı bir rəy və ya təkmilləşdirmə müraciəti daxil olduqda burada göstəriləcək.' 
                    : 'Any opinions or improvement proposals submitted for your courses will be listed here.'}
                </p>
              </div>
            ) : (
              visibleSuggestions.map(item => {
                const associatedSyll = syllabi.find(s => s.id === item.syllabusId);
                const associatedProg = programs.find(p => p.id === item.programId);

                return (
                  <div 
                    key={item.id} 
                    className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-900/5 transition-all flex flex-col md:flex-row md:items-start justify-between gap-5 relative overflow-hidden"
                  >
                    <div className="space-y-3 flex-1">
                      {/* Meta header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                          item.authorType === 'student' 
                            ? 'bg-sky-50 text-sky-800 border-sky-100' 
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {item.authorType === 'student' ? (language === 'AZ' ? 'Tələbə' : 'Student') : (language === 'AZ' ? 'Müəssisə' : 'Industry')}
                        </span>

                        <span className="text-[10px] text-slate-400 font-semibold">•</span>

                        <span className="text-[11px] text-slate-700 font-bold">
                          {item.authorName}
                        </span>

                        {associatedSyll && (
                          <>
                            <span className="text-slate-300">/</span>
                            <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 border border-teal-100/50 px-2 py-0.5 rounded">
                              {associatedSyll.code}: {associatedSyll.name}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.description}</p>
                      </div>

                      {/* Display reviewer status & details if exists */}
                      {item.evaluation && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{language === 'AZ' ? 'Müəllim / Proqram Rəhbəri Qeydi:' : 'Reviewer Decision Note:'}</span>
                            <span className="ml-auto px-2 py-0.5 bg-white border border-slate-200 text-slate-800 rounded text-[10px] font-extrabold font-mono uppercase">
                              {item.status}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-normal bg-white p-2.5 rounded-lg border border-slate-100/50">{item.evaluation}</p>
                          {item.actionTaken && (
                            <p className="text-[11px] text-slate-500 font-sans">
                              <span className="font-bold text-teal-800">{language === 'AZ' ? 'Görülmüş Tədbir: ' : 'Action Taken: '}</span>
                              {item.actionTaken}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Display teacher response if exists */}
                      {(item.teacherEvaluationNotes || item.teacherProposedChanges) && (
                        <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{language === 'AZ' ? 'Sizin Təhliliniz və Təklif etdiyiniz Düzəlişlər:' : 'Your Analysis & Proposed Changes:'}</span>
                          </div>
                          {item.teacherEvaluationNotes && (
                            <div className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100/50">
                              <strong className="text-slate-800 block text-[10px] uppercase font-black tracking-wider mb-1">{language === 'AZ' ? 'Metodik Təhlil/Qeyd:' : 'Methodological Analysis/Notes:'}</strong>
                              {item.teacherEvaluationNotes}
                            </div>
                          )}
                          {item.teacherProposedChanges && (
                            <div className="text-indigo-900 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/40 font-semibold leading-relaxed">
                              <strong className="text-indigo-950 block text-[10px] uppercase font-black tracking-wider mb-1">{language === 'AZ' ? 'Təklif Olunan Konkret Düzəlişlər:' : 'Proposed Specific Changes:'}</strong>
                              {item.teacherProposedChanges}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions and Status controls */}
                    <div className="flex flex-col items-stretch sm:items-end justify-between self-stretch gap-3 shrink-0">
                      <div className="flex flex-col items-start sm:items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">{language === 'AZ' ? 'STATUS:' : 'STATUS:'}</span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            item.status === 'Baxılır' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            item.status === 'Qəbul edildi' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                            item.status === 'Tətbiq olundu' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Forwarded label */}
                        {item.assignedTeacherEmail && item.assignedTeacherEmail.toLowerCase() === currentUser.email.toLowerCase() && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-extrabold uppercase">
                            {language === 'AZ' ? 'Rəhbər tərəfindən yönləndirilib' : 'Forwarded by Head'}
                          </span>
                        )}

                        {item.teacherFeedbackStatus && item.teacherFeedbackStatus !== 'none' && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            item.teacherFeedbackStatus === 'pending_review'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {item.teacherFeedbackStatus === 'pending_review'
                              ? (language === 'AZ' ? 'Rəhbər təsdiqi gözlənilir' : 'Awaiting Head Approval')
                              : (language === 'AZ' ? 'Dəyişiklik Təsdiqlənib!' : 'Changes Approved!')}
                          </span>
                        )}
                      </div>

                      {/* Interactive Evaluation Button depending on assignment */}
                      {item.status !== 'Tətbiq olundu' && item.status !== 'Rədd edildi' && (
                        <>
                          {item.assignedTeacherEmail && item.assignedTeacherEmail.toLowerCase() === currentUser.email.toLowerCase() ? (
                            item.teacherFeedbackStatus !== 'approved' && (
                              <button
                                onClick={() => {
                                  setSubmittingTeacherCaseId(item.id);
                                  setTeacherNotes(item.teacherEvaluationNotes || '');
                                  setTeacherProposedText(item.teacherProposedChanges || '');
                                }}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-white animate-pulse" />
                                {language === 'AZ' ? 'Analiz et və Düzəliş yaz' : 'Analyze & Propose Changes'}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setEvaluatingCaseId(item.id);
                                setEvalStatus(item.status as any || 'Baxılır');
                                setEvalComment(item.evaluation || '');
                                setEvalAction(item.actionTaken || '');
                              }}
                              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Wand2 className="w-3.5 h-3.5 text-teal-400" />
                              {language === 'AZ' ? 'Qiymətləndir' : 'Evaluate'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: AI WORKSPACE --- */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-fade-in bg-white border border-slate-100 rounded-3xl p-6 shadow-sm shadow-slate-900/5">
          <div className="space-y-1 pb-4 border-b border-slate-100">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              {language === 'AZ' ? 'Müəllimlər üçün Gemini AI Co-Pilot' : 'Gemini AI Co-Pilot for Teachers'}
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              {language === 'AZ' 
                ? 'İstədiyiniz fənnin daxilində olan müxtəlif tələbə və müəssisə təkliflərini seçin. Gemini Süni İntellekti onları mövcud sillabus məzmunu ilə müqayisə edərək, sizin üçün tam təkmilləşdirilmiş yeni fənn planı və mövzular generat-edəcək.' 
                : 'Select suggestions on your subject. Gemini AI will cross-examine them with your current syllabus content and generate fully reformed subjects and lesson schedules.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* AI Control Console */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{aiError}</span>
                  </div>
                )}

                {/* Step 1: Select program & syllabus */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{language === 'AZ' ? '1. İXTİSAS PROQRAMINI SEÇİN' : '1. CHOOSE PROGRAM'}</label>
                    <select
                      value={aiSelectedProgramId}
                      onChange={e => {
                        setAiSelectedProgramId(e.target.value);
                        setAiSelectedSyllabusId('');
                        setAiSelectedSuggestionIds([]);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                    >
                      {myPrograms.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{language === 'AZ' ? '2. FƏNNİNİZİ (SİLLABUSUNUZU) SEÇİN' : '2. CHOOSE YOUR COURSE (SYLLABUS)'}</label>
                    <select
                      value={aiSelectedSyllabusId}
                      onChange={e => {
                        setAiSelectedSyllabusId(e.target.value);
                        setAiSelectedSuggestionIds([]);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                    >
                      <option value="">{language === 'AZ' ? '-- Fənn seçin --' : '-- Choose course --'}</option>
                      {/* Filter to only teacher's syllabi in the selected program */}
                      {syllabi
                        .filter(s => {
                          if (s.programId !== aiSelectedProgramId) return false;
                          if (!currentUser?.email) return false;
                          const curEmail = currentUser.email.toLowerCase().trim();
                          const isPrimary = s.teacherEmail ? s.teacherEmail.toLowerCase().trim() === curEmail : false;
                          const isCo = s.teacherEmails ? s.teacherEmails.some(email => email.toLowerCase().trim() === curEmail) : false;
                          return isPrimary || isCo;
                        })
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.code} • {s.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Step 2: Select suggestions */}
                {aiSelectedSyllabusId && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {language === 'AZ' ? '3. REFORMDA İSTİFADƏ OLUNACAQ TƏKLİFLƏRİ SEÇİN' : '3. CHOOSE SUGGESTIONS TO INCLUDE'}
                    </label>

                    {suggestions.filter(s => s.syllabusId === aiSelectedSyllabusId).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        {language === 'AZ' ? 'Bu fənnə hələ heç bir rəy/təklif bildirilməyib.' : 'No suggestions submitted for this course yet.'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                        {suggestions
                          .filter(s => s.syllabusId === aiSelectedSyllabusId)
                          .map(s => {
                            const isChecked = aiSelectedSuggestionIds.includes(s.id);
                            return (
                              <label 
                                key={s.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                                  isChecked 
                                    ? 'bg-teal-50/30 border-teal-200 text-slate-800' 
                                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setAiSelectedSuggestionIds(prev => 
                                      prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                    );
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-teal-800 focus:ring-teal-500"
                                />
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-[10px] uppercase text-teal-900 block">{s.authorName} ({s.authorType === 'student' ? (language === 'AZ' ? 'Tələbə' : 'Student') : (language === 'AZ' ? 'Sənaye' : 'Industry')})</span>
                                  <span className="font-bold block">{s.title}</span>
                                  <span className="text-[11px] font-normal leading-normal line-clamp-2">{s.description}</span>
                                </div>
                              </label>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Run AI Button */}
              {aiSelectedSyllabusId && (
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleRunAI}
                    disabled={aiAnalyzing}
                    className="w-full py-3 bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-950 hover:to-emerald-950 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-900/10 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    {aiAnalyzing 
                      ? (language === 'AZ' ? 'Gemini AI təhlil edir...' : 'Gemini AI is generating reform...') 
                      : (language === 'AZ' ? 'Sillabusu AI Co-Pilot ilə Yenilə və Təkmilləşdir' : 'Reform Syllabus with AI Co-Pilot')
                    }
                  </button>
                </div>
              )}
            </div>

            {/* AI Results Display */}
            <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between min-h-[300px]">
              {aiAnalyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-teal-100 border-t-teal-700 animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-xs text-teal-950 uppercase tracking-wide">
                      {language === 'AZ' ? 'Böyük Dil Modeli İşləyir' : 'Large Language Model working'}
                    </h4>
                    <motion.p
                      key={aiLoadingMessageIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-slate-500 italic max-w-xs font-medium"
                    >
                      "{loadingMessages[aiLoadingMessageIdx]}"
                    </motion.p>
                  </div>
                </div>
              ) : aiResult ? (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-[10px] font-bold text-teal-950 uppercase tracking-wider">{language === 'AZ' ? 'REFORM TƏSDİQİ SƏNƏDİ' : 'AI REFORM RECOMMENDATIONS'}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[9px] font-extrabold border border-emerald-200">Gemini Pro</span>
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{language === 'AZ' ? 'TƏKMİLLƏŞDİRİLMİŞ FƏNN ADI' : 'IMPROVED SUBJECT NAME'}</h4>
                      <p className="text-xs font-extrabold text-slate-800">{aiResult.title}</p>
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{language === 'AZ' ? 'REFORM QISA XÜLASƏSİ' : 'REFORM EXECUTIVE SUMMARY'}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium whitespace-pre-wrap">{aiResult.summary}</p>
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{language === 'AZ' ? 'TƏKLİF OLUNAN STRATEJİ HƏDƏFLƏR' : 'PROPOSED STRATEGIC TARGETS'}</h4>
                      <ul className="space-y-1.5">
                        {aiResult.strategicGoals.map((g, idx) => (
                          <li key={idx} className="text-xs text-slate-600 flex items-start gap-1 font-sans">
                            <span className="text-teal-700 font-bold shrink-0">•</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{language === 'AZ' ? 'YENİLƏNƏCƏK SİLLABUS MƏZMUNU' : 'NEW CURRICULUM SUBJECT CONTENT'}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px]">{aiResult.newContent}</p>
                    </div>
                  </div>

                  {/* Immediate update button */}
                  <div className="pt-3 border-t border-slate-200">
                    <button
                      onClick={async () => {
                        try {
                          setActionError('');
                          setActionSuccess('');
                          await onUpdateSyllabus(aiSelectedSyllabusId, {
                            name: aiResult.title,
                            content: aiResult.newContent,
                            updateComment: language === 'AZ' 
                              ? `Gemini AI vasitəsilə ${aiSelectedSuggestionIds.length} rəy əsasında tamamilə yeniləndi.` 
                              : `Fully reformed by Gemini AI based on ${aiSelectedSuggestionIds.length} suggestions.`
                          });
                          
                          // Mark evaluated suggestions as applied
                          for (const id of aiSelectedSuggestionIds) {
                            await onEvaluateSuggestion(id, {
                              status: 'Tətbiq olundu',
                              evaluation: language === 'AZ' 
                                ? 'Bu təklif Gemini AI təhlilinə əsasən yeni sillabusa daxil edildi.' 
                                : 'This suggestion was incorporated into the new syllabus content via Gemini AI.'
                            });
                          }

                          setActionSuccess(language === 'AZ' ? 'Sillabus daxili mövzuları Gemini AI təkliflərinə uyğun yeniləndi və rəylər Tətbiq olundu statusuna keçirildi!' : 'Syllabus content was reformed using Gemini AI suggestions and feedbacks were marked as applied!');
                          setAiResult(null);
                        } catch (err: any) {
                          setActionError(err.message || 'Error applying reform');
                        }
                      }}
                      className="w-full py-2.5 bg-teal-850 hover:bg-teal-950 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      {language === 'AZ' ? 'Məlumatları Sillabusa Köçür və Tətbiq Et' : 'Apply and Save Reform to Syllabus'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <Wand2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-600">
                    {language === 'AZ' ? 'AI Hesabatı Hazır deyil' : 'AI Report Not Ready'}
                  </h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-normal font-medium">
                    {language === 'AZ' 
                      ? 'Sol tərəfdəki paneldən fənni və rəyləri seçib "Yenilə və Təkmilləşdir" düyməsini kliklədiyinizdə AI təhlili burada göstəriləcək.' 
                      : 'When you select the course and suggestions on the left and click Reform Syllabus, the analysis will appear here.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: REFERENCE DOCUMENTS --- */}
      {activeTab === 'references' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="font-extrabold text-slate-800 text-lg md:text-xl">
                {language === 'AZ' ? 'Dövlət Standartları və Referans Sənədlər' : 'State Standards & Baseline References'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {language === 'AZ' 
                  ? 'Süni İntellekt analizinin dövlət standartlarına tam uyğun aparılması üçün təlim proqramı standartlarınızı və sillabus təlimatlarınızı əlavə edin.' 
                  : 'Maintain guidelines, standards, and syllabus formats used by Gemini AI to review and align your course plans.'}
              </p>
            </div>

            <button
              onClick={() => {
                setActionError('');
                setActionSuccess('');
                setShowAddReferenceDoc(true);
              }}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer ml-auto md:ml-0 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {language === 'AZ' ? 'Yeni Referans Əlavə Et' : 'Add New Reference'}
            </button>
          </div>

          {/* Reference Docs Grid */}
          {teacherRefDocs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 stroke-[1.25]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">{language === 'AZ' ? 'Siyahı Boşdur' : 'No Reference Documents'}</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  {language === 'AZ' 
                    ? 'Hələ heç bir rəsmi sənəd yüklənməyib. Süni İntellekt analizinin dövlət standartlarına tam uyğun aparılması üçün proqram və ya sillabus təlimatlarınızı əlavə edin.' 
                    : 'No baseline reference documents found for your programs.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherRefDocs.map((doc) => {
                const programName = doc.associatedId ? programs.find(p => p.id === doc.associatedId)?.name : null;
                const syllabusName = doc.associatedId ? syllabi.find(s => s.id === doc.associatedId)?.name : null;
                const associatedName = programName || syllabusName;
                return (
                  <div 
                    key={doc.id} 
                    onClick={() => setSelectedRefDoc(doc)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer hover:border-emerald-200 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-100 group-hover:bg-emerald-100/70 transition-colors">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs md:text-sm line-clamp-1 group-hover:text-emerald-900 transition-colors">{doc.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{doc.fileSize || '0 KB'} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Stop opening view modal
                            setDeleteConfirm({
                              name: doc.name,
                              onConfirm: async () => {
                                if (onDeleteReferenceDoc) {
                                  await onDeleteReferenceDoc(doc.id);
                                  setActionSuccess(language === 'AZ' ? 'Uğurla silindi!' : 'Successfully deleted!');
                                  setTimeout(() => setActionSuccess(''), 3000);
                                }
                              }
                            });
                          }}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${doc.type === 'program' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : doc.type === 'syllabus' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {doc.type === 'program' ? (language === 'AZ' ? 'İxtisas Proqramı Standartı' : 'Specialty Curriculum Standard') : doc.type === 'syllabus' ? (language === 'AZ' ? 'Sillabus Təlimatı' : 'Syllabus Guide') : (language === 'AZ' ? 'Ümumi Qaydalar' : 'General Rules')}
                        </span>
                        {associatedName && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-medium max-w-[200px] truncate">
                            {associatedName}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 line-clamp-3 leading-relaxed font-mono whitespace-pre-wrap">
                        {doc.content}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRefDoc(doc);
                        }}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        {language === 'AZ' ? 'Tam mətnə bax' : 'View full text'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Reference Document Drawer / Slide-over Modal */}
          <AnimatePresence>
            {showAddReferenceDoc && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-3xl p-6 border border-slate-100 max-w-xl w-full shadow-2xl space-y-4"
                >
                  <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                        {language === 'AZ' ? 'Yeni Referans Sənəd Əlavə Et' : 'Add New Baseline Reference'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                        {language === 'AZ' ? 'Böyük Dil Modelinin istifadə edəcəyi tənzimləyici sənəd, qanunvericilik və ya dövlət standartını yükləyin' : 'Upload state standard criteria, guidelines, or format guidelines used by Gemini AI'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddReferenceDoc(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Input modes toggle */}
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-150 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefDocInputMode('manual')}
                      className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold transition-all cursor-pointer ${refDocInputMode === 'manual' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {language === 'AZ' ? 'Əllə Daxil Et' : 'Manual Content Entry'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefDocInputMode('word')}
                      className={`flex-1 py-1.5 rounded-lg text-center text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${refDocInputMode === 'word' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-600" />
                      {language === 'AZ' ? 'Word (.docx) Yüklə' : 'Upload Word (.docx)'}
                    </button>
                  </div>

                  <form onSubmit={handleSaveReferenceDoc} className="space-y-4 text-xs">
                    {refDocInputMode === 'word' && (
                      <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 space-y-2 relative">
                        <input
                          type="file"
                          accept=".docx"
                          onChange={handleRefDocWordUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-850 rounded-full flex items-center justify-center mx-auto">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-700 text-xs">
                            {refDocUploading ? (language === 'AZ' ? 'Oxunur və Analiz edilir...' : 'Uploading & Parsing...') : (language === 'AZ' ? 'Word (.docx) faylı seçin və ya buraya sürükləyin' : 'Drag & drop Word (.docx) file here or click to browse')}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {language === 'AZ' ? 'Tədris proqramı standartı və ya fənn qaydaları olan .docx sənədi' : 'Document containing baseline clauses & guidelines'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'SƏNƏDİN NÖVÜ' : 'DOCUMENT CLASSIFICATION'}</label>
                        <select
                          value={refDocType}
                          onChange={e => {
                            setRefDocType(e.target.value as any);
                            setRefDocAssociatedId('');
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="general">{language === 'AZ' ? 'Ümumi / Metodik Qaydalar' : 'General Guidelines'}</option>
                          <option value="program">{language === 'AZ' ? 'İxtisas Proqramı Standartı' : 'Program Standard'}</option>
                          <option value="syllabus">{language === 'AZ' ? 'Fənn Sillabus Təlimatı' : 'Subject Syllabus Guide'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          {refDocType === 'program' ? (language === 'AZ' ? 'ƏLAQƏLİ İXTİSAS PROQRAMI' : 'ASSOCIATED SPECIALTY PROGRAM') : refDocType === 'syllabus' ? (language === 'AZ' ? 'ƏLAQƏLİ FƏNN' : 'ASSOCIATED COURSE') : (language === 'AZ' ? 'ƏLAQƏLİ SUBYEKTLƏR (KÖNÜLLÜ)' : 'ASSOCIATED SUBJECT (OPTIONAL)')}
                        </label>
                        <select
                          value={refDocAssociatedId}
                          onChange={e => setRefDocAssociatedId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500/20"
                          disabled={refDocType === 'general'}
                        >
                          <option value="">{language === 'AZ' ? '-- Əlaqələndirmə --' : '-- Associated Entity --'}</option>
                          {refDocType === 'program' && myPrograms.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                          {refDocType === 'syllabus' && mySyllabi.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'REFERANS SƏNƏDİN ADI' : 'BASELINE TITLE'}</label>
                      <input
                        type="text"
                        value={refDocName}
                        onChange={e => setRefDocName(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. İnformasiya Texnologiyaları Dövlət Təhsil Standartı 2026' : 'E.g., Computer Science State Standard 2026'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'SƏNƏD MƏTNİ VƏ MƏZMUNU' : 'DOCUMENT CLAUSES & STANDARD CONTENT'}</label>
                      <textarea
                        value={refDocContent}
                        onChange={e => setRefDocContent(e.target.value)}
                        placeholder={language === 'AZ' ? 'Dövlət standartının əsas bəndlərini və ya tələblərini bura daxil edin...' : 'Paste the clauses, criteria, or template guidelines here...'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-44 font-mono text-[11px] leading-relaxed"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAddReferenceDoc(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all"
                      >
                        {t('cancelBtn')}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-800 hover:bg-emerald-950 text-white font-black rounded-xl text-xs transition-all shadow-md"
                      >
                        {language === 'AZ' ? 'Yadda Saxla' : 'Save Standard'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Reference Document Details Overlay Modal */}
          <AnimatePresence>
            {selectedRefDoc && (
              <DocumentReader
                document={selectedRefDoc}
                onClose={() => setSelectedRefDoc(null)}
                language={language}
                associatedName={
                  selectedRefDoc.associatedId
                    ? programs.find(p => p.id === selectedRefDoc.associatedId)?.name ||
                      syllabi.find(s => s.id === selectedRefDoc.associatedId)?.name ||
                      selectedRefDoc.associatedId
                    : undefined
                }
                onDelete={
                  onDeleteReferenceDoc
                    ? () => {
                        setDeleteConfirm({
                          name: selectedRefDoc.name,
                          onConfirm: async () => {
                            if (onDeleteReferenceDoc) {
                              await onDeleteReferenceDoc(selectedRefDoc.id);
                              setSelectedRefDoc(null);
                            }
                          }
                        });
                      }
                    : undefined
                }
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
      <AnimatePresence>
        {isEditingSyll && selectedSyll && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-slate-150 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">{language === 'AZ' ? 'Sillabusu Redaktə Et' : 'Edit Syllabus'}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{selectedSyll.code} • {language === 'AZ' ? 'Müəllim tərəfindən idarə edilir' : 'Managed by teacher'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSyll(false)}
                  className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSyllabusSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'FƏNNİN ADI' : 'SUBJECT NAME'}</label>
                    <input
                      type="text"
                      value={editSyllName}
                      onChange={e => setEditSyllName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-slate-850"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'KREDİT (ECTS)' : 'CREDITS (ECTS)'}</label>
                    <input
                      type="number"
                      value={editSyllCredits}
                      onChange={e => setEditSyllCredits(parseInt(e.target.value) || 6)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-slate-850"
                      min="1"
                      max="30"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'FƏNN KODU' : 'COURSE CODE'}</label>
                  <input
                    type="text"
                    value={editSyllCode}
                    onChange={e => setEditSyllCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-slate-850"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'TƏDRİS MATERİALI VƏ SILLABUS MƏZMUNU' : 'CURRICULUM CONTENT & TOPICS'}</label>
                  <textarea
                    value={editSyllContent}
                    onChange={e => setEditSyllContent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono text-[11px] h-36 resize-y leading-relaxed text-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'DƏYİŞİKLİK QEYDİ (LOG) *' : 'LOG DRAFT/COMMENT *'}</label>
                  <input
                    type="text"
                    value={editSyllComment}
                    onChange={e => setEditSyllComment(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Riyaziyyat standartına əsasən bəzi fəsillər birləşdirildi.' : 'E.g. Topics restructured according to state guidelines.'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold"
                    required
                  />
                </div>

                {/* Display logs history list */}
                {selectedSyll.updatesLog && selectedSyll.updatesLog.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('updatesHistory')}</span>
                    <div className="max-h-[80px] overflow-y-auto space-y-1 text-[10px] text-slate-500 font-medium">
                      {selectedSyll.updatesLog.map((log, lidx) => (
                        <div key={lidx} className="flex items-start gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100/50">
                          <History className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  {(() => {
                    const curEmail = currentUser?.email?.toLowerCase().trim();
                    const isPrimarySel = selectedSyll.teacherEmail ? selectedSyll.teacherEmail.toLowerCase().trim() === curEmail : false;
                    const isCoSel = selectedSyll.teacherEmails ? selectedSyll.teacherEmails.some(email => email.toLowerCase().trim() === curEmail) : false;
                    const isMineSelected = isPrimarySel || isCoSel;
                    return isMineSelected ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm({
                            name: selectedSyll.name,
                            onConfirm: async () => {
                              if (onDeleteSyllabus) {
                                await onDeleteSyllabus(selectedSyll.id);
                                setIsEditingSyll(false);
                              }
                            }
                          });
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {language === 'AZ' ? 'Sil' : 'Delete'}
                      </button>
                    ) : <div />;
                  })()}
                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditingSyll(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {t('cancelBtn')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-teal-850 hover:bg-teal-950 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                    >
                      {t('saveBtn')}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: MANUAL EVALUATION MODAL --- */}
      <AnimatePresence>
        {evaluatingCaseId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-slate-150 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">{language === 'AZ' ? 'Rəyin Qiymətləndirilməsi' : 'Feedback Evaluation'}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{language === 'AZ' ? 'Sillabusu inkişaf etdirmək üçün rəyin qeydiyyatı' : 'Record response for syllabus enhancement'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEvaluatingCaseId(null)}
                  className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEvaluateSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'SİLLEBUS STATUSU' : 'SYLLABUS STATUS'}</label>
                  <select
                    value={evalStatus}
                    onChange={e => setEvalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Baxılır">{language === 'AZ' ? 'Baxılır (Under Review)' : 'Baxılır (Under Review)'}</option>
                    <option value="Qəbul edildi">{language === 'AZ' ? 'Qəbul edildi (Accepted)' : 'Qəbul edildi (Accepted)'}</option>
                    <option value="Rədd edildi">{language === 'AZ' ? 'Rədd edildi (Rejected)' : 'Rədd edildi (Rejected)'}</option>
                    <option value="Tətbiq olundu">{language === 'AZ' ? 'Tətbiq olundu (Applied)' : 'Tətbiq olundu (Applied)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'RƏYÇİNİN (MÜƏLLİMİN) ŞƏRHİ' : 'REVIEWER (TEACHER) DECISION COMMENT'}</label>
                  <textarea
                    value={evalComment}
                    onChange={e => setEvalComment(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Bu təklif olduqca aktualdır, növbəti dövrdə fənn planına daxil ediləcək.' : 'E.g. Great observation, we will incorporate this into module 2.'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-24 resize-y leading-relaxed font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'GÖRÜLƏCƏK TƏDBİR' : 'ACTION COMPLETED OR PLANNED'}</label>
                  <input
                    type="text"
                    value={evalAction}
                    onChange={e => setEvalAction(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Sillabusun 4-cü fəslinə AI qiymətləndirmə mövusu artırıldı.' : 'E.g. Chapter 4 expanded to include AI evaluation techniques.'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEvaluatingCaseId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors"
                  >
                    {t('cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-850 hover:bg-teal-950 text-white font-black rounded-xl text-xs transition-colors shadow-md"
                  >
                    {language === 'AZ' ? 'Təsdiqlə və Saxla' : 'Confirm and Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: TEACHER PROPOSAL SUBMISSION MODAL --- */}
      <AnimatePresence>
        {submittingTeacherCaseId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 border border-slate-150 max-w-lg w-full shadow-2xl space-y-4 text-xs"
            >
              <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">{language === 'AZ' ? 'Analiz və Düzəliş Təklifi' : 'Analysis & Proposed Changes'}</h3>
                  <span className="text-[10px] text-indigo-500 font-semibold">{language === 'AZ' ? 'Bu təklif üçün metodik təhlil və düzəlişlərinizi daxil edin' : 'Provide your analysis and proposed text adjustments'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittingTeacherCaseId(null)}
                  className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTeacherResponseSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{language === 'AZ' ? 'METODİK TƏHLİL VƏ RƏYİNİZ' : 'YOUR METHODOLOGICAL ANALYSIS & NOTES'}</label>
                  <textarea
                    value={teacherNotes}
                    onChange={e => setTeacherNotes(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Tədris planında müvafiq mövzunun əhatə dairəsini genişləndirmək zəruridir...' : 'E.g. It is highly appropriate to expand module 3 topics...'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-24 resize-y leading-relaxed font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{language === 'AZ' ? 'TƏKLİF EDİLƏN KONKRET DÜZƏLİŞ (MƏTNƏ DAXİL OLUNACAQ)' : 'PROPOSED SPECIFIC TEXT CHANGE (TO BE INSERTED)'}</label>
                  <textarea
                    value={teacherProposedText}
                    onChange={e => setTeacherProposedText(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Sillabusun "İstifadə olunan texnologiyalar" bölməsinə "Böyük Verilənlər (Big Data) və NoSQL" əlavə edilsin.' : 'E.g. Add "Big Data & NoSQL" to tools and frameworks section in syllabus.'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-24 resize-y leading-relaxed font-semibold text-indigo-900 bg-indigo-50/10 border-indigo-200/50"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSubmittingTeacherCaseId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors"
                  >
                    {t('cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs transition-colors shadow-md"
                  >
                    {language === 'AZ' ? 'Təqdim et (Rəhbərə Göndər)' : 'Submit (Send to Head)'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 animate-scale-up">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-2 bg-red-50 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {language === 'AZ' ? 'SİLİNMƏNİ TƏSDİQLƏ' : 'CONFIRM DELETION'}
                </h3>
              </div>
              
              <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                {language === 'AZ' 
                  ? `"${deleteConfirm.name}" adlı resursu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.` 
                  : `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
              </p>
              
              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  {language === 'AZ' ? 'Ləğv et' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteConfirm.onConfirm();
                    } catch (err: any) {
                      alert(err.message);
                    } finally {
                      setDeleteConfirm(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  {language === 'AZ' ? 'Bəli, Sil' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
