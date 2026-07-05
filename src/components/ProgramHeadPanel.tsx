import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Program, Syllabus, SuggestionCase, User, AIAnalysisResponse, ReferenceDocument, ReferenceDocMatch } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import DocumentReader from './DocumentReader';
import { 
  Plus, BookOpen, Layers, Sparkles, AlertCircle, CheckCircle2, 
  XCircle, Clock, Wand2, History, Edit, FileText, Check, ChevronRight,
  Search, ChevronDown, Trash2, FileUp, Database, Download, FileSpreadsheet
} from 'lucide-react';

interface ProgramHeadPanelProps {
  currentUser: User;
  programs: Program[];
  syllabi: Syllabus[];
  suggestions: SuggestionCase[];
  users: User[];
  referenceDocs: ReferenceDocument[];
  onAddProgram: (name: string, description: string, totalCredits?: number, createdBy?: string, allowedHeads?: string[]) => Promise<any>;
  onAddSyllabus: (programId: string, code: string, name: string, content: string, credits?: number, teacherEmail?: string, teacherEmails?: string[]) => Promise<any>;
  onUpdateProgram: (id: string, data: any) => Promise<void>;
  onUpdateSyllabus: (id: string, data: any) => Promise<void>;
  onDeleteProgram?: (id: string) => Promise<void>;
  onDeleteSyllabus?: (id: string) => Promise<void>;
  onEvaluateSuggestion: (id: string, data: any) => Promise<void>;
  onRunAIAnalysis: (programId: string, syllabusId: string | undefined, suggestionIds: string[]) => Promise<AIAnalysisResponse>;
  onAddReferenceDoc: (name: string, content: string, type: 'program' | 'syllabus' | 'general', associatedId?: string, fileSize?: string, htmlContent?: string) => Promise<void>;
  onDeleteReferenceDoc: (id: string) => Promise<void>;
  onAssignTeacher: (id: string, assignedTeacherEmail: string) => Promise<void>;
  onHeadApproveTeacher: (id: string, data: any) => Promise<void>;
}

export default function ProgramHeadPanel({
  currentUser,
  programs,
  syllabi,
  suggestions,
  users,
  referenceDocs,
  onAddProgram,
  onAddSyllabus,
  onUpdateProgram,
  onUpdateSyllabus,
  onDeleteProgram,
  onDeleteSyllabus,
  onEvaluateSuggestion,
  onRunAIAnalysis,
  onAddReferenceDoc,
  onDeleteReferenceDoc,
  onAssignTeacher,
  onHeadApproveTeacher
}: ProgramHeadPanelProps) {
  const { language, t } = useLanguage();

  const myAllowedPrograms = (programs || []).filter(p => {
    if (!p.createdBy) return true; // pre-existing programs are open
    const curEmail = currentUser?.email?.toLowerCase().trim();
    if (!curEmail) return false;
    const isCreator = p.createdBy.toLowerCase().trim() === curEmail;
    const isAllowed = p.allowedHeads ? p.allowedHeads.some(email => email.toLowerCase().trim() === curEmail) : false;
    return isCreator || isAllowed;
  });

  // Tabs: 'programs' | 'suggestions' | 'ai' | 'references'
  const [activeTab, setActiveTab] = useState<'programs' | 'suggestions' | 'ai' | 'references'>('programs');
  const [suggestionsFilter, setSuggestionsFilter] = useState<'incoming' | 'executed'>('incoming');

  // Program Form States
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [programInputMode, setProgramInputMode] = useState<'choice' | 'manual' | 'word'>('choice');
  const [progName, setProgName] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [parsedRawText, setParsedRawText] = useState('');
  const [parsedHtml, setParsedHtml] = useState('');

  // Syllabus Form States
  const [showAddSyllabus, setShowAddSyllabus] = useState(false);
  const [syllabusInputMode, setSyllabusInputMode] = useState<'choice' | 'manual' | 'word'>('choice');
  const [syllProgramId, setSyllProgramId] = useState(myAllowedPrograms[0]?.id || programs[0]?.id || '');
  const [syllCode, setSyllCode] = useState('');
  const [syllName, setSyllName] = useState('');
  const [syllContent, setSyllContent] = useState('');
  const [syllDescription, setSyllDescription] = useState('');
  const [syllTopics, setSyllTopics] = useState('');
  const [syllFiles, setSyllFiles] = useState('');
  const [selectedSyllabusIdForAdd, setSelectedSyllabusIdForAdd] = useState('');

  // Syllabus Editing States
  const [editingSyllabusId, setEditingSyllabusId] = useState<string | null>(null);
  const [editSyllName, setEditSyllName] = useState('');
  const [editSyllCode, setEditSyllCode] = useState('');
  const [editSyllContent, setEditSyllContent] = useState('');
  const [editSyllComment, setEditSyllComment] = useState('');
  const [editSyllCredits, setEditSyllCredits] = useState<number>(6);
  const [editSyllTeacherEmail, setEditSyllTeacherEmail] = useState('');
  const [editSyllTeacherEmails, setEditSyllTeacherEmails] = useState<string[]>([]);
  const [editSyllDescription, setEditSyllDescription] = useState('');
  const [editSyllTopics, setEditSyllTopics] = useState('');
  const [editSyllFiles, setEditSyllFiles] = useState('');

  // Manual Syllabus creation credits state
  const [syllCredits, setSyllCredits] = useState<number>(6);
  const [syllTeacherEmail, setSyllTeacherEmail] = useState('');
  const [syllTeacherEmails, setSyllTeacherEmails] = useState<string[]>([]);

  // Teacher Selection Search and Alphabetical states
  const [addSyllTeacherSearch, setAddSyllTeacherSearch] = useState('');
  const [addSyllTeacherLetter, setAddSyllTeacherLetter] = useState<string | null>(null);
  const [editSyllTeacherSearch, setEditSyllTeacherSearch] = useState('');
  const [editSyllTeacherLetter, setEditSyllTeacherLetter] = useState<string | null>(null);
  const [refDocSearchQuery, setRefDocSearchQuery] = useState('');

  // Manual Program creation credits state
  const [progCredits, setProgCredits] = useState<number>(240);

  // Program & Syllabus Details & Editing Modal State
  const [selectedProg, setSelectedProg] = useState<Program | null>(null);
  const [selectedSyll, setSelectedSyll] = useState<Syllabus | null>(null);
  const [isEditingProg, setIsEditingProg] = useState(false);
  const [isEditingSyll, setIsEditingSyll] = useState(false);

  // Custom Inline Confirmation Dialog States
  const [deleteConfirm, setDeleteConfirm] = useState<{
    name: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Edit fields for program
  const [editProgName, setEditProgName] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');
  const [editProgCredits, setEditProgCredits] = useState<number>(240);
  const [editProgComment, setEditProgComment] = useState('');
  const [editProgAllowedHeads, setEditProgAllowedHeads] = useState<string[]>([]);
  const [progAllowedHeads, setProgAllowedHeads] = useState<string[]>([]);

  // Manual Evaluation States
  const [evaluatingCaseId, setEvaluatingCaseId] = useState<string | null>(null);
  const [evalStatus, setEvalStatus] = useState<'Baxılır' | 'Qəbul edildi' | 'Rədd edildi' | 'Tətbiq olundu'>('Baxılır');
  const [evalComment, setEvalComment] = useState('');
  const [evalAction, setEvalAction] = useState('');

  // States for Assigning Teachers and Reviewing Teacher Proposals
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, string>>({});
  const [approvingCaseId, setApprovingCaseId] = useState<string | null>(null);
  const [headApproveNotes, setHeadApproveNotes] = useState('');
  const [headApproveProposedChanges, setHeadApproveProposedChanges] = useState('');

  // AI Workspace States
  const [aiSelectedProgramId, setAiSelectedProgramId] = useState(myAllowedPrograms[0]?.id || programs[0]?.id || '');
  const [aiSelectedSyllabusId, setAiSelectedSyllabusId] = useState('');
  const [aiSelectedSuggestionIds, setAiSelectedSuggestionIds] = useState<string[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiLoadingMessageIdx, setAiLoadingMessageIdx] = useState(0);

  // Success / Error alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Reference Documents Form States
  const [showAddReferenceDoc, setShowAddReferenceDoc] = useState(false);
  const [refDocInputMode, setRefDocInputMode] = useState<'manual' | 'word'>('manual');
  const [refDocName, setRefDocName] = useState('');
  const [refDocContent, setRefDocContent] = useState('');
  const [refDocHtmlContent, setRefDocHtmlContent] = useState('');
  const [refDocType, setRefDocType] = useState<'program' | 'syllabus' | 'general'>('general');
  const [refDocAssociatedId, setRefDocAssociatedId] = useState('');
  const [refDocUploading, setRefDocUploading] = useState(false);
  const [selectedRefDoc, setSelectedRefDoc] = useState<ReferenceDocument | null>(null);

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
  const [targetProgramIdForSyllabus, setTargetProgramIdForSyllabus] = useState(myAllowedPrograms[0]?.id || programs[0]?.id || '');

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
        setActionSuccess(language === 'AZ' ? 'Word sənədi uğurla təhlil edildi və məlumatlar strukturlaşdırıldı! Zəhmət olmasa, aşağıdakı xülasəni nəzərdən keçirin.' : 'Word document was analyzed successfully and data was structured! Please review the summary below.');
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
      if (parsedResult.documentType === 'program') {
        const fullDesc = `${parsedResult.summary}\n\nHədəflər:\n${parsedResult.targets.map(t => `- ${t}`).join('\n')}\n\nAçar mövzular:\n${parsedResult.keywords.join(', ')}`;
        const finalHeads = progAllowedHeads.includes(currentUser.email) ? progAllowedHeads : [currentUser.email, ...progAllowedHeads];
        const newProg = await onAddProgram(parsedResult.name, fullDesc, 240, currentUser.email, finalHeads);
        
        // Auto-upload program file to reference documents
        if (newProg && newProg.id) {
          try {
            await onAddReferenceDoc(
              parsedDocName || parsedResult.name,
              parsedRawText || fullDesc,
              'program',
              newProg.id,
              '45 KB',
              parsedHtml || undefined
            );
          } catch (docErr) {
            console.error("Auto-uploading program reference document failed:", docErr);
          }
        }

        setActionSuccess(language === 'AZ' ? 'Word-dən təhlil edilmiş yeni İxtisas Proqramı uğurla daxil edildi və avtomatik referans sənədlərə yükləndi!' : 'New Specialty Program parsed from Word successfully added and automatically uploaded to reference documents!');
      } else {
        const syllabusProgramId = targetProgramIdForSyllabus || myAllowedPrograms[0]?.id || programs[0]?.id;
        if (!syllabusProgramId) {
          setActionError(language === 'AZ' ? 'Sillabusu əlavə etmək üçün əvvəlcə ixtisas proqramı seçilməlidir.' : 'Respective specialty program must be selected to add a syllabus.');
          return;
        }
        const fullContent = `Məcmuə:\n${parsedResult.summary}\n\nHədəflər:\n${parsedResult.targets.map(t => `- ${t}`).join('\n')}\n\nAçar fəsillər / mövzular (Key-lər):\n${parsedResult.keywords.map(k => `- ${k}`).join('\n')}`;
        const newSyll = await onAddSyllabus(
          syllabusProgramId,
          parsedResult.suggestedCode || 'PED-101',
          parsedResult.name,
          fullContent,
          6,
          syllTeacherEmails[0] || undefined,
          syllTeacherEmails
        );

        // Auto-upload syllabus file to reference documents
        if (newSyll && newSyll.id) {
          try {
            await onAddReferenceDoc(
              parsedDocName || parsedResult.name,
              parsedRawText || fullContent,
              'syllabus',
              newSyll.id,
              '45 KB',
              parsedHtml || undefined
            );
          } catch (docErr) {
            console.error("Auto-uploading syllabus reference document failed:", docErr);
          }
        }

        setActionSuccess(language === 'AZ' ? 'Word-dən təhlil edilmiş yeni fənn sillabusu ixtisasa uğurla integurasiya edildi və avtomatik referans sənədlərə yükləndi!' : 'New subject syllabus parsed from Word successfully integrated into curriculum and automatically uploaded to reference documents!');
      }
      setParsedResult(null);
      setParsedDocName('');
      setSyllTeacherEmails([]);
      setProgAllowedHeads([]);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Sistemə daxil edilərkən xəta yarandı.' : 'An error occurred while entering into the system.'));
    }
  };

  // Loading animation quotes (tailored to pedagogy & Karabakh rebuild)
  const loadingMessages = language === 'AZ' ? [
    "Süni intellekt təhsil proqramı və sillabus strukturunu oxuyur...",
    "Tələbə dərsləri və müəssisə tövsiyələri arasındakı boşluqlar analiz edilir...",
    "Qarabağın yenidənqurulmasında təhsilin rolu və strateji planlar nəzərə alınır...",
    "Müasir ibtidai sinif və STEM pedaqogika metodologiyaları yoxlanılır...",
    "Süni İntellekt dəyişiklik təklifləri və ssenari töhfələrini hazırlayır..."
  ] : [
    "Artificial intelligence is parsing curriculum and syllabus structures...",
    "Gaps between student feedback and industry recommendations are being analyzed...",
    "Educational role and strategic plans in Qarabağ rebuild are factored in...",
    "Modern primary education and STEM pedagogy methodologies are being evaluated...",
    "AI is preparing suggested modifications and scenario solutions..."
  ];

  const handleAddProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim() || !progDesc.trim()) return;
    try {
      const finalHeads = progAllowedHeads.includes(currentUser.email) ? progAllowedHeads : [currentUser.email, ...progAllowedHeads];
      const newProg = await onAddProgram(progName, progDesc, progCredits, currentUser.email, finalHeads);
      
      // Auto-upload manual program to reference documents
      if (newProg && newProg.id) {
        try {
          await onAddReferenceDoc(
            progName.trim(),
            progDesc.trim(),
            'program',
            newProg.id,
            `${(progDesc.length / 1024).toFixed(1)} KB`
          );
        } catch (docErr) {
          console.error("Auto-uploading manual program reference document failed:", docErr);
        }
      }

      setActionSuccess(language === 'AZ' ? 'Yeni ixtisas proqramı uğurla əlavə edildi və avtomatik referans sənədlərə yükləndi!' : 'New specialty program successfully added and automatically uploaded to reference documents!');
      setProgName('');
      setProgDesc('');
      setProgCredits(240);
      setProgAllowedHeads([]);
      setShowAddProgram(false);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Xəta baş verdi.' : 'An error occurred.'));
    }
  };

  const handleAddSyllabusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllProgramId || !selectedSyllabusIdForAdd || !syllContent.trim()) return;
    try {
      const parsedTopics = syllTopics
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const parsedFiles = syllFiles
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await onUpdateSyllabus(selectedSyllabusIdForAdd, {
        name: syllName,
        code: syllCode,
        content: syllContent,
        credits: syllCredits,
        teacherEmail: syllTeacherEmails[0] || null,
        teacherEmails: syllTeacherEmails,
        description: syllDescription,
        topics: parsedTopics,
        syllabusFiles: parsedFiles,
        updateComment: language === 'AZ' ? 'Yeni sillabus məzmunu daxil edildi' : 'New syllabus content submitted'
      });
      
      // Auto-upload manual syllabus to reference documents
      try {
        await onAddReferenceDoc(
          syllName.trim(),
          syllContent.trim(),
          'syllabus',
          selectedSyllabusIdForAdd,
          `${(syllContent.length / 1024).toFixed(1)} KB`
        );
      } catch (docErr) {
        console.error("Auto-uploading manual reference document failed:", docErr);
      }

      setActionSuccess(language === 'AZ' ? 'Yeni fənn sillabusu uğurla əlavə edildi və avtomatik referans sənədlərə yükləndi!' : 'New subject syllabus successfully added and automatically uploaded to reference documents!');
      setSyllCode('');
      setSyllName('');
      setSyllContent('');
      setSyllDescription('');
      setSyllTopics('');
      setSyllFiles('');
      setSelectedSyllabusIdForAdd('');
      setSyllCredits(6);
      setSyllTeacherEmail('');
      setSyllTeacherEmails([]);
      setShowAddSyllabus(false);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Xəta baş verdi.' : 'An error occurred.'));
    }
  };

  const handleEditSyllabusClick = (syllabus: Syllabus) => {
    setEditingSyllabusId(syllabus.id);
    setEditSyllName(syllabus.name);
    setEditSyllCode(syllabus.code);
    setEditSyllContent(syllabus.content);
    setEditSyllCredits(syllabus.credits || 6);
    setEditSyllComment('');
    setEditSyllDescription(syllabus.description || '');
    setEditSyllTopics(syllabus.topics ? syllabus.topics.join('\n') : '');
    setEditSyllFiles(syllabus.syllabusFiles ? syllabus.syllabusFiles.join(', ') : '');
  };

  const handleUpdateSyllabusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSyllabusId) return;
    try {
      const parsedTopics = editSyllTopics
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const parsedFiles = editSyllFiles
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await onUpdateSyllabus(editingSyllabusId, {
        name: editSyllName,
        code: editSyllCode,
        content: editSyllContent,
        credits: editSyllCredits,
        description: editSyllDescription,
        topics: parsedTopics,
        syllabusFiles: parsedFiles,
        updateComment: editSyllComment || (language === 'AZ' ? 'Tədris proqramı çərçivəsində mövzu və idarəetmə yeniləməsi' : 'Topic and management update within the curriculum')
      });
      setActionSuccess(language === 'AZ' ? 'Sillabus uğurla yeniləndi! Əlaqəli ixtisas proqramı da avtomatik "Yenilənib" statusu aldı.' : 'Syllabus updated successfully! Associated specialty program also automatically received "Updated" status.');
      setEditingSyllabusId(null);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Sillabus yenilənərkən xəta yarandı.' : 'An error occurred while updating the syllabus.'));
    }
  };

  const handleProgramClick = (program: Program) => {
    setSelectedProg(program);
    setEditProgName(program.name);
    setEditProgDesc(program.description);
    setEditProgCredits(program.totalCredits || 240);
    setEditProgComment('');
    setEditProgAllowedHeads(program.allowedHeads || (program.createdBy ? [program.createdBy] : []));
    setIsEditingProg(false);
    setSelectedSyll(null); // Close syllabus modal if open
  };

  const handleSyllabusClick = (syllabus: Syllabus) => {
    setSelectedSyll(syllabus);
    setEditSyllName(syllabus.name);
    setEditSyllCode(syllabus.code);
    setEditSyllContent(syllabus.content);
    setEditSyllCredits(syllabus.credits || 6);
    setEditSyllTeacherEmail(syllabus.teacherEmail || '');
    setEditSyllTeacherEmails(syllabus.teacherEmails || (syllabus.teacherEmail ? [syllabus.teacherEmail] : []));
    setEditSyllComment('');
    setEditSyllDescription(syllabus.description || '');
    setEditSyllTopics(syllabus.topics ? syllabus.topics.join('\n') : '');
    setEditSyllFiles(syllabus.syllabusFiles ? syllabus.syllabusFiles.join(', ') : '');
    setIsEditingSyll(false);
    setSelectedProg(null); // Close program modal if open
  };

  const handleUpdateProgramSubmitInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProg) return;
    try {
      await onUpdateProgram(selectedProg.id, {
        name: editProgName,
        description: editProgDesc,
        totalCredits: editProgCredits,
        allowedHeads: editProgAllowedHeads,
        updateComment: editProgComment || (language === 'AZ' ? 'Tədris proqramı məlumatlarında və AKTS həcmində düzəliş' : 'Correction in curriculum program details and ECTS volume')
      });
      setActionSuccess(language === 'AZ' ? 'Tədris proqramı uğurla yeniləndi!' : 'Curriculum program updated successfully!');
      setSelectedProg(null);
      setIsEditingProg(false);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Tədris proqramı yenilənərkən xəta yarandı.' : 'An error occurred while updating the curriculum program.'));
    }
  };

  const handleUpdateSyllabusSubmitInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSyll) return;
    try {
      const parsedTopics = editSyllTopics
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const parsedFiles = editSyllFiles
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await onUpdateSyllabus(selectedSyll.id, {
        name: editSyllName,
        code: editSyllCode,
        content: editSyllContent,
        credits: editSyllCredits,
        teacherEmail: editSyllTeacherEmails[0] || null,
        teacherEmails: editSyllTeacherEmails,
        description: editSyllDescription,
        topics: parsedTopics,
        syllabusFiles: parsedFiles,
        updateComment: editSyllComment || (language === 'AZ' ? 'Tədris fənninin məzmununda və kredit həcmində düzəliş' : 'Correction in subject syllabus content and credit volume')
      });
      setActionSuccess(language === 'AZ' ? 'Sillabus uğurla yeniləndi!' : 'Syllabus updated successfully!');
      setSelectedSyll(null);
      setIsEditingSyll(false);
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Sillabus yenilənərkən xəta yarandı.' : 'An error occurred while updating the syllabus.'));
    }
  };

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingCaseId) return;

    try {
      const selectedCase = suggestions.find(c => c.id === evaluatingCaseId);
      if (!selectedCase) return;

      // Handle direct update if status is 'Tətbiq olundu'
      let updatedSyllContent = undefined;
      if (evalStatus === 'Tətbiq olundu' && selectedCase.syllabusId) {
        const syl = syllabi.find(s => s.id === selectedCase.syllabusId);
        if (syl) {
          updatedSyllContent = `${syl.content}\n\n[MÜƏSSİSƏ/TƏLƏBƏ KEYSİ ƏSASINDA ƏLAVƏ]: ${evalAction}`;
        }
      }

      await onEvaluateSuggestion(evaluatingCaseId, {
        status: evalStatus,
        evaluation: evalComment,
        actionTaken: evalAction || undefined,
        updatedSyllabusContent: updatedSyllContent
      });

      setActionSuccess(language === 'AZ' ? 'Daxil olmuş keys uğurla qiymətləndirildi və müəllifə avtomatik sistem bildirişi göndərildi!' : 'Incoming case evaluated successfully and automatic system notification was sent to the author!');
      setEvaluatingCaseId(null);
      setEvalComment('');
      setEvalAction('');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'Xəta baş verdi.' : 'An error occurred.'));
    }
  };

  const handleAssignTeacherClick = async (caseId: string, email: string) => {
    if (!email) {
      setActionError(language === 'AZ' ? 'Zəhmət olmasa bir müəllim seçin.' : 'Please select a teacher.');
      return;
    }
    try {
      setActionError('');
      setActionSuccess('');
      await onAssignTeacher(caseId, email);
      setActionSuccess(language === 'AZ' ? 'Təklif müvəffəqiyyətlə müəllimə yönləndirildi!' : 'Suggestion successfully forwarded to the teacher!');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Error assigning teacher');
    }
  };

  const handleHeadApproveTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingCaseId) return;
    try {
      setActionError('');
      setActionSuccess('');
      const selectedCase = suggestions.find(c => c.id === approvingCaseId);
      if (!selectedCase) return;

      // Handle direct update to syllabus if we approve and apply
      let updatedSyllContent = undefined;
      if (selectedCase.syllabusId) {
        const syl = syllabi.find(s => s.id === selectedCase.syllabusId);
        if (syl) {
          updatedSyllContent = `${syl.content}\n\n[MÜƏLLİM DÜZƏLİŞİ - TƏSDİQLƏNDİ]: ${headApproveProposedChanges}`;
        }
      }

      await onHeadApproveTeacher(approvingCaseId, {
        notes: headApproveNotes,
        proposedChanges: headApproveProposedChanges,
        updatedSyllabusContent: updatedSyllContent
      });

      setActionSuccess(language === 'AZ' ? 'Müəllim təklifi rəhbər tərəfindən təsdiqləndi və sillabus avtomatik yeniləndi!' : 'Teacher proposal approved by head and syllabus was automatically updated!');
      setApprovingCaseId(null);
      setHeadApproveNotes('');
      setHeadApproveProposedChanges('');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Error approving teacher proposal');
    }
  };

  // Run AI analysis using Gemini-3.5-flash
  const handleAIAnalyze = async () => {
    if (!aiSelectedProgramId || aiSelectedSuggestionIds.length === 0) {
      setActionError(language === 'AZ' ? 'Analiz etmək üçün proqramı və ən azı bir daxil olmuş rəyi (keysi) seçin.' : 'Select a program and at least one incoming case (review) to analyze.');
      return;
    }

    setAiAnalyzing(true);
    setAiError('');
    setAiResult(null);
    setAiLoadingMessageIdx(0);

    // Rotate loading messages
    const messageInterval = setInterval(() => {
      setAiLoadingMessageIdx(prev => (prev + 1) % loadingMessages.length);
    }, 4000);

    try {
      const response = await onRunAIAnalysis(
        aiSelectedProgramId,
        aiSelectedSyllabusId || undefined,
        aiSelectedSuggestionIds
      );
      setAiResult(response);
    } catch (err: any) {
      setAiError(err.message || (language === 'AZ' ? 'AI analizi alınmadı. Zəhmət olmasa, sistem açarını (Secrets) və şəbəkəni yoxlayın.' : 'AI analysis failed. Please verify system secrets and network.'));
    } finally {
      clearInterval(messageInterval);
      setAiAnalyzing(false);
    }
  };

  // Apply AI Suggestion directly into syllabus/curriculum
  const handleApplyAISuggestion = async () => {
    if (!aiResult || aiSelectedSuggestionIds.length === 0) return;

    try {
      const firstSugId = aiSelectedSuggestionIds[0];
      const associatedCase = suggestions.find(c => c.id === firstSugId);
      if (!associatedCase) return;

      const aiActionText = aiResult.suggestedChanges[0] || (language === 'AZ' ? 'Tədris proqramına və dərslərə süni intellektin təhlil etdiyi bazar və rəqəmsallaşma tələbləri inteqrasiya olundu.' : 'Market and digitization requirements analyzed by AI were integrated into curriculum and subjects.');

      let updatedSyllContent = undefined;
      if (associatedCase.syllabusId) {
        const syl = syllabi.find(s => s.id === associatedCase.syllabusId);
        if (syl) {
          updatedSyllContent = `${syl.content}\n\n[${language === 'AZ' ? 'SÜNİ İNTELLEKT ANALİZİ ƏSASINDA ƏLAVƏ' : 'ADDITION BASED ON AI ANALYSIS'}]: ${aiActionText}`;
        }
      }

      // Evaluate and close all selected suggestion cases with status 'Tətbiq olundu'
      for (const id of aiSelectedSuggestionIds) {
        await onEvaluateSuggestion(id, {
          status: 'Tətbiq olundu',
          evaluation: language === 'AZ' ? `Süni İntellekt (Gemini) tərəfindən aparılan metodiki analiz əsasında qəbul edildi. Təhlil: ${aiResult.evaluation}` : `Accepted based on methodological analysis conducted by AI (Gemini). Analysis: ${aiResult.evaluation}`,
          actionTaken: aiActionText,
          updatedSyllabusContent: updatedSyllContent
        });
      }

      setActionSuccess(language === 'AZ' ? 'Süni İntellekt təklifi uğurla tədris proqramına tətbiq olundu və bütün seçilmiş keyslər həll olundu!' : 'AI suggestion successfully applied to curriculum and all selected cases resolved!');
      setAiResult(null);
      setAiSelectedSuggestionIds([]);
      setActiveTab('programs');
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err: any) {
      setActionError(err.message || (language === 'AZ' ? 'AI təklifi tətbiq edilərkən xəta yarandı.' : 'An error occurred while applying AI suggestion.'));
    }
  };

  // Word (.docx) raw file extraction for Reference Documents
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

  // Save/Submit reference document
  const handleSaveReferenceDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refDocName.trim() || !refDocContent.trim()) {
      setActionError(language === 'AZ' ? 'Sənəd adı və məzmunu boş ola bilməz.' : 'Document name and content cannot be empty.');
      return;
    }

    try {
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
    } catch (err: any) {
      setActionError(err.message || 'Error saving reference document.');
    }
  };

  // Helper status badge for suggestions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Tətbiq olundu':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">{language === 'AZ' ? 'Tətbiq olundu' : 'Applied'}</span>;
      case 'Qəbul edildi':
        return <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-semibold border border-green-100">{language === 'AZ' ? 'Qəbul edildi' : 'Accepted'}</span>;
      case 'Baxılır':
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">{language === 'AZ' ? 'Baxılır' : 'Under Review'}</span>;
      case 'Rədd edildi':
        return <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-semibold border border-red-100">{language === 'AZ' ? 'Rədd edildi' : 'Rejected'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold">{language === 'AZ' ? 'Gözləmədə' : 'Pending'}</span>;
    }
  };

  return (
    <div className="space-y-6" id="program-head-root">
      {/* Alert Banner */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 rounded-r-xl text-sm flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{language === 'AZ' ? 'Müvəffəqiyyətli Əməliyyat' : 'Success Operation'}</p>
            <p className="mt-0.5 text-xs text-emerald-800">{actionSuccess}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-900 rounded-r-xl text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{language === 'AZ' ? 'Sistem Xətası' : 'System Error'}</p>
            <p className="mt-0.5 text-xs text-red-800">{actionError}</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('programs'); setAiResult(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'programs'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {language === 'AZ' ? 'Proqramlar və Sillabuslar' : 'Programs & Syllabi'}
        </button>

        <button
          onClick={() => { setActiveTab('suggestions'); setAiResult(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'suggestions'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          {language === 'AZ' ? 'Gələn Təkliflər (Keyslər)' : 'Incoming Suggestions (Cases)'}
          {suggestions.filter(s => s.status === 'Gözləmədə').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-mono text-[10px] flex items-center justify-center animate-pulse">
              {suggestions.filter(s => s.status === 'Gözləmədə').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'ai'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wand2 className="w-4 h-4 text-emerald-600" />
          {language === 'AZ' ? 'Süni İntellekt (AI) Analiz Laboratoriyası' : 'Artificial Intelligence (AI) Lab'}
        </button>

        <button
          onClick={() => { setActiveTab('references'); setAiResult(null); }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'references'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-600" />
          {language === 'AZ' ? 'Referans Sənədlər' : 'Reference Documents'}
          {referenceDocs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
              {referenceDocs.length}
            </span>
          )}
        </button>
      </div>

      {/* --- TAB 1: PROGRAMS AND SYLLABI MANAGEMENT --- */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'AZ' ? 'Müəllimlik İxtisaslarının Tədris Planları' : 'Pedagogical Specialty Curriculum Plans'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'AZ' ? 'Müvafiq ixtisas proqramlarını və onlara aid olan fənn sillabuslarını buradan idarə edin' : 'Manage respective curriculum specialty programs and corresponding syllabi here'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddProgram(!showAddProgram);
                  setShowAddSyllabus(false);
                  setProgramInputMode('choice');
                  setParsedResult(null);
                  setParsedDocName('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-all ${
                  showAddProgram 
                    ? 'bg-slate-100 border-slate-300 text-slate-800' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                {language === 'AZ' ? 'İxtisas Proqramı Əlavə Et' : 'Add Specialty Program'}
              </button>
              <button
                onClick={() => {
                  setShowAddSyllabus(!showAddSyllabus);
                  setShowAddProgram(false);
                  setSyllabusInputMode('choice');
                  setParsedResult(null);
                  setParsedDocName('');
                  if (myAllowedPrograms.length > 0) setSyllProgramId(myAllowedPrograms[0].id);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  showAddSyllabus 
                    ? 'bg-emerald-900' 
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                {language === 'AZ' ? 'Fənn Sillabusu Əlavə Et' : 'Add Subject Syllabus'}
              </button>
            </div>
          </div>

          {/* Add Program Form */}
          {showAddProgram && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  {language === 'AZ' ? 'Yeni İxtisas Proqramı Əlavə Et' : 'Add New Specialty Program'}
                </h3>
                {programInputMode !== 'choice' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProgramInputMode('choice');
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
              {programInputMode === 'choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                  {/* Option A: Import via Word (.docx) */}
                  <button
                    type="button"
                    onClick={() => setProgramInputMode('word')}
                    className="group border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-950">
                        {language === 'AZ' ? 'Süni İntellekt ilə Word (.docx) İdxal Et' : 'Import Word (.docx) with AI'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ' 
                          ? 'İxtisas proqramı haqqında Word (.docx) faylınızı yükləyin. Gemini AI sənədin bütün strukturunu (Adı, Məcmuə, Hədəflər və Key-lər) avtomatik təhlil edib yaradacaq.' 
                          : 'Upload your Word (.docx) file about the specialty program. Gemini AI will automatically parse and create the entire structure (Name, Summary, Targets, and Keys).'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {language === 'AZ' ? 'Sənədi yüklə' : 'Upload document'} <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Option B: Manual input */}
                  <button
                    type="button"
                    onClick={() => setProgramInputMode('manual')}
                    className="group border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Edit className="w-5 h-5 text-slate-600 group-hover:text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-950">
                        {language === 'AZ' ? 'Mexaniki Əl ilə Yarat' : 'Create Manually'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ'
                          ? 'İxtisas proqramının adını və strateji hədəflərini klaviaturadan istifadə edərək klassik form vasitəsilə əl ilə yazıb daxil edin.'
                          : 'Enter the name and strategic goals of the specialty program manually using the keyboard via a classic form.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {language === 'AZ' ? 'Əl ilə yaz' : 'Write manually'} <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2a: Word Import Uploader */}
              {programInputMode === 'word' && (
                <div className="space-y-4">
                  {!parsedResult && (
                    <div className="border border-dashed border-slate-300 bg-white rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {language === 'AZ' ? 'Müəllimlik İxtisas Proqramı Word sənədini seçin' : 'Select Pedagogical Specialty Program Word document'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'AZ' ? 'Yalnız .docx formatında fayllar qəbul edilir' : 'Only .docx format files are accepted'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".docx"
                        onChange={handleDocxUpload}
                        disabled={parsingDocx}
                        id="program-docx-uploader"
                        className="hidden"
                      />
                      <label
                        htmlFor="program-docx-uploader"
                        className={`px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${parsingDocx ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {parsingDocx 
                          ? (language === 'AZ' ? 'Rəqəmsallaşdırılır...' : 'Digitizing...') 
                          : (language === 'AZ' ? 'Kompüterdən Fayl Seçin' : 'Select File from Computer')}
                      </label>
                      {parsingDocx && (
                        <p className="text-[10px] text-emerald-800 font-medium animate-pulse flex items-center gap-1.5 mt-2">
                          <span className="w-2.5 h-2.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></span>
                          {language === 'AZ' 
                            ? 'Gemini AI xam mətni təhlil edir, ixtisas adı və fəsilləri müəyyənləşdirir...' 
                            : 'Gemini AI is parsing raw text, identifying specialty name and chapters...'}
                        </p>
                      )}
                    </div>
                  )}

                  {parsedResult && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-100">
                            {language === 'AZ' ? 'Təhlil Olunmuş İxtisas Proqramı' : 'Parsed Specialty Program'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          {language === 'AZ' ? 'Fayl:' : 'File:'} {parsedDocName}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                        {/* Edit fields */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'İXTİSAS PROQRAMININ ADI' : 'SPECIALTY PROGRAM NAME'}</label>
                            <input
                              type="text"
                              value={parsedResult.name}
                              onChange={e => setParsedResult(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'PROQRAM TƏSVİRİ / XÜLASƏSİ' : 'PROGRAM DESCRIPTION / SUMMARY'}</label>
                          <textarea
                            value={parsedResult.summary}
                            onChange={e => setParsedResult(prev => prev ? { ...prev, summary: e.target.value } : null)}
                            rows={5}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                            required
                          />
                        </div>
                      </div>

                      {parsedResult.documentType === 'program' && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {language === 'AZ' ? 'ƏLAVƏ PROQRAM RƏHBƏRLƏRİ (BU PROQRAMI PAYLAŞ)' : 'ADDITIONAL PROGRAM HEADS (SHARE THIS PROGRAM)'}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                            {users.filter(u => u.role === 'head').map(u => {
                              const isSelected = progAllowedHeads.includes(u.email);
                              const isCurrentUser = u.email === currentUser.email;
                              return (
                                <label key={u.email} className={`flex items-center gap-2 p-1.5 bg-white rounded-lg cursor-pointer transition-colors border border-slate-100 hover:border-emerald-250 shadow-sm ${isCurrentUser ? 'opacity-80' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected || isCurrentUser}
                                    disabled={isCurrentUser}
                                    onChange={() => {
                                      if (isCurrentUser) return;
                                      if (isSelected) {
                                        setProgAllowedHeads(progAllowedHeads.filter(email => email !== u.email));
                                      } else {
                                        setProgAllowedHeads([...progAllowedHeads, u.email]);
                                      }
                                    }}
                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                  />
                                  <div className="text-[10px] font-sans">
                                    <span className="font-bold text-slate-700 block truncate max-w-[120px]">{u.name}</span>
                                    <span className="text-slate-400 font-mono text-[8px] block truncate max-w-[120px]">{u.email}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

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
                          className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-800/10"
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
              {programInputMode === 'manual' && (
                <form onSubmit={handleAddProgramSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'PROQRAMIN ADI' : 'PROGRAM NAME'}</label>
                    <input
                      type="text"
                      value={progName}
                      onChange={e => setProgName(e.target.value)}
                      placeholder={language === 'AZ' ? 'Məs. İbtidai Sinif Müəllimliyi' : 'E.g. Primary School Education'}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'STRATEJİ MISSİYASI VƏ TƏSVİRİ' : 'STRATEGIC MISSION & DESCRIPTION'}</label>
                    <input
                      type="text"
                      value={progDesc}
                      onChange={e => setProgDesc(e.target.value)}
                      placeholder={language === 'AZ' ? 'Qarabağ məktəbləri üçün müasir pedaqoqların hazırlanması strategiyası...' : 'Strategy for preparing modern educators for Qarabağ schools...'}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'KREDİT (ECTS)' : 'CREDITS (ECTS)'}</label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      value={progCredits}
                      onChange={e => setProgCredits(parseInt(e.target.value) || 240)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-slate-600 mb-2">
                      {language === 'AZ' ? 'ƏLAVƏ PROQRAM RƏHBƏRLƏRİ (BU PROQRAMI PAYLAŞ)' : 'ADDITIONAL PROGRAM HEADS (SHARE THIS PROGRAM)'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto p-3.5 bg-white border border-slate-200 rounded-xl">
                      {users.filter(u => u.role === 'head').map(u => {
                        const isSelected = progAllowedHeads.includes(u.email);
                        const isCurrentUser = u.email === currentUser.email;
                        return (
                          <label key={u.email} className={`flex items-center gap-2.5 p-2 bg-slate-50 rounded-lg cursor-pointer transition-colors border border-slate-100 hover:border-emerald-200 shadow-sm ${isCurrentUser ? 'opacity-80' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected || isCurrentUser}
                              disabled={isCurrentUser}
                              onChange={() => {
                                if (isCurrentUser) return;
                                if (isSelected) {
                                  setProgAllowedHeads(progAllowedHeads.filter(email => email !== u.email));
                                } else {
                                  setProgAllowedHeads([...progAllowedHeads, u.email]);
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="text-[11px] font-sans">
                              <span className="font-bold text-slate-700 block">{u.name}</span>
                              <span className="text-slate-400 font-mono text-[9px]">{u.email} {isCurrentUser && `(${language === 'AZ' ? 'Siz' : 'You'})`}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="md:col-span-12 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
                    >
                      {language === 'AZ' ? 'Yarat' : 'Create'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* Add Syllabus Form */}
          {showAddSyllabus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  {language === 'AZ' ? 'Yeni Fənn Sillabusu Əlavə Et' : 'Add New Subject Syllabus'}
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
                    className="group border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-950">
                        {language === 'AZ' ? 'Süni İntellekt ilə Word (.docx) İdxal Et' : 'Import Word (.docx) with AI'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ' 
                          ? 'Fənn sillabusu haqqında Word (.docx) sənədini yükləyin. Gemini AI onun xülasəsini, mövzularını, fənn kodunu və hədəflərini çıxararaq avtomatik sistemə daxil edəcək.' 
                          : 'Upload the Word (.docx) document about the subject syllabus. Gemini AI will automatically parse and submit its summary, topics, course code, and targets into the system.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {language === 'AZ' ? 'Sillabusu yüklə' : 'Upload syllabus'} <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Option B: Manual input */}
                  <button
                    type="button"
                    onClick={() => setSyllabusInputMode('manual')}
                    className="group border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/10 p-5 rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Edit className="w-5 h-5 text-slate-600 group-hover:text-emerald-600" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 group-hover:text-emerald-950">
                        {language === 'AZ' ? 'Mexaniki Əl ilə Yarat' : 'Create Manually'}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                        {language === 'AZ'
                          ? 'Fənn kodunu, ixtisas seçimini, adını və dərslərin mövzu ardıcıllığını klaviaturadan əl ilə yazıb daxil edin.'
                          : 'Manually enter the course code, specialty selection, course name, and sequence of lesson topics from the keyboard.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {language === 'AZ' ? 'Əl ilə yaz' : 'Write manually'} <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2a: Word Import Uploader */}
              {syllabusInputMode === 'word' && (
                <div className="space-y-4">
                  {!parsedResult && (
                    <div className="border border-dashed border-slate-300 bg-white rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">
                          {language === 'AZ' ? 'Fənn Sillabusu Word sənədini seçin' : 'Select Subject Syllabus Word document'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'AZ' ? 'Yalnız .docx formatında fayllar qəbul edilir' : 'Only .docx format files are accepted'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".docx"
                        onChange={handleDocxUpload}
                        disabled={parsingDocx}
                        id="syllabus-docx-uploader"
                        className="hidden"
                      />
                      <label
                        htmlFor="syllabus-docx-uploader"
                        className={`px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${parsingDocx ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {parsingDocx ? (language === 'AZ' ? 'Oxunur və Təhlil Edilir...' : 'Reading and Analyzing...') : (language === 'AZ' ? 'Kompüterdən Fayl Seçin' : 'Select File from Computer')}
                      </label>
                      {parsingDocx && (
                        <p className="text-[10px] text-emerald-800 font-medium animate-pulse flex items-center gap-1.5 mt-2">
                          <span className="w-2.5 h-2.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></span>
                          {language === 'AZ' ? 'Gemini AI xam sillabus mətnini analiz edir, hədəf və mövzuları çıxarır...' : 'Gemini AI is analyzing raw syllabus text, extracting targets and topics...'}
                        </p>
                      )}
                    </div>
                  )}

                  {parsedResult && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-100">
                            {language === 'AZ' ? 'Təhlil Olunmuş Fənn Sillabusu' : 'Parsed Subject Syllabus'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">{language === 'AZ' ? 'Fayl:' : 'File:'} {parsedDocName}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
                        {/* Edit fields */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'FƏNN KODU' : 'COURSE CODE'}</label>
                            <input
                              type="text"
                              value={parsedResult.suggestedCode || ''}
                              onChange={e => setParsedResult(prev => prev ? { ...prev, suggestedCode: e.target.value } : null)}
                              placeholder="PED-101"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'FƏNNİN ADI' : 'SUBJECT NAME'}</label>
                            <input
                              type="text"
                              value={parsedResult.name}
                              onChange={e => setParsedResult(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'FƏNNİN MƏZMUNU / SİLLABUS XÜLASƏSİ' : 'SYLLABUS CONTENT / SUMMARY'}</label>
                          <textarea
                            value={parsedResult.summary}
                            onChange={e => setParsedResult(prev => prev ? { ...prev, summary: e.target.value } : null)}
                            rows={5}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                            required
                          />
                        </div>
                      </div>
 
                      {/* Select Assigned Teachers */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">
                          {language === 'AZ' ? 'TƏYİN OLUNAN MÜƏLLİMLƏR (BİR VƏ YA BİR NEÇƏ)' : 'ASSIGNED TEACHERS (ONE OR MORE)'}
                        </label>
                        
                        {(() => {
                          const availableTeachers = users.filter(u => u.role === 'teacher' || u.role === 'head');
                          const startingLetters = Array.from(
                            new Set(
                              availableTeachers
                                .map(u => (u.name || '').trim().charAt(0).toUpperCase())
                                .filter(Boolean)
                            )
                          ).sort((a, b) => a.localeCompare(b, 'az'));

                          const filteredAddTeachers = availableTeachers.filter(u => {
                            const nameVal = (u.name || '').toLowerCase();
                            const emailVal = (u.email || '').toLowerCase();
                            const searchVal = addSyllTeacherSearch.toLowerCase().trim();
                            
                            const matchesSearch = nameVal.includes(searchVal) || emailVal.includes(searchVal);
                            const firstLetter = (u.name || '').trim().charAt(0).toUpperCase();
                            const matchesLetter = addSyllTeacherLetter ? firstLetter === addSyllTeacherLetter : true;
                            
                            return matchesSearch && matchesLetter;
                          });

                          return (
                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                                <input
                                  type="text"
                                  placeholder={language === 'AZ' ? 'Müəllim axtar...' : 'Search teacher...'}
                                  value={addSyllTeacherSearch}
                                  onChange={e => setAddSyllTeacherSearch(e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                                {startingLetters.length > 0 && (
                                  <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                                    <button
                                      type="button"
                                      onClick={() => setAddSyllTeacherLetter(null)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                        !addSyllTeacherLetter
                                          ? 'bg-emerald-700 text-white shadow-sm'
                                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      {language === 'AZ' ? 'Hamısı' : 'All'}
                                    </button>
                                    {startingLetters.map(letter => (
                                      <button
                                        key={letter}
                                        type="button"
                                        onClick={() => setAddSyllTeacherLetter(letter === addSyllTeacherLetter ? null : letter)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                          letter === addSyllTeacherLetter
                                            ? 'bg-emerald-700 text-white shadow-sm'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                        }`}
                                      >
                                        {letter}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 gap-y-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                {filteredAddTeachers.length === 0 ? (
                                  <div className="col-span-full py-2 text-center text-[10px] text-slate-400 font-semibold">
                                    {language === 'AZ' ? 'Uyğun müəllim tapılmadı' : 'No matching teachers found'}
                                  </div>
                                ) : (
                                  filteredAddTeachers.map(u => {
                                    const isSelected = syllTeacherEmails.includes(u.email);
                                    return (
                                      <label key={u.email} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border shadow-sm ${
                                        isSelected 
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' 
                                          : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-700'
                                      }`}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            if (isSelected) {
                                              setSyllTeacherEmails(syllTeacherEmails.filter(email => email !== u.email));
                                            } else {
                                              setSyllTeacherEmails([...syllTeacherEmails, u.email]);
                                            }
                                          }}
                                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3"
                                        />
                                        <div className="text-left min-w-0 flex-1">
                                          <p className="text-[10px] font-bold leading-tight truncate">{u.name}</p>
                                          <p className="text-[8px] text-slate-400 font-mono leading-none truncate mt-0.5">{u.email}</p>
                                        </div>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Select which Program to attach it to */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/30">
                        <div className="space-y-0.5">
                          <label className="block text-[10px] font-bold text-emerald-950 uppercase tracking-wider">{language === 'AZ' ? 'AİD OLDUĞU İXTİSAS PROQRAMINI SEÇİN *' : 'SELECT THE CORRESPONDING SPECIALTY PROGRAM *'}</label>
                          <span className="text-[10px] text-slate-400">{language === 'AZ' ? 'Word faylındakı fənnin daxil ediləcəyi tədris planı' : 'The curriculum plan into which the subject from the Word file will be entered'}</span>
                        </div>
                        <select
                          value={targetProgramIdForSyllabus}
                          onChange={e => setTargetProgramIdForSyllabus(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs focus:outline-none font-semibold"
                        >
                          {myAllowedPrograms.map(p => (
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
                          className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-800/10"
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
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {myAllowedPrograms.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNN SEÇİN *' : 'SELECT SUBJECT *'}</label>
                      <select
                        value={selectedSyllabusIdForAdd}
                        onChange={e => {
                          const sId = e.target.value;
                          setSelectedSyllabusIdForAdd(sId);
                          const found = (syllabi || []).find(s => s.id === sId);
                          if (found) {
                            setSyllCode(found.code);
                            setSyllName(found.name);
                            setSyllCredits(found.credits || 6);
                          } else {
                            setSyllCode('');
                            setSyllName('');
                          }
                        }}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                        required
                      >
                        <option value="">{language === 'AZ' ? '-- Fənn Seçin --' : '-- Select Subject --'}</option>
                        {(syllabi || [])
                          .filter(s => s.programId === syllProgramId && !s.archived)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNN KODU (OXUNMA)' : 'COURSE CODE (READONLY)'}</label>
                      <input
                        type="text"
                        value={syllCode}
                        readOnly
                        placeholder={language === 'AZ' ? 'Siyahıdan seçin' : 'Select from list'}
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs focus:outline-none cursor-not-allowed font-semibold text-slate-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNNİN ADI (OXUNMA)' : 'SUBJECT NAME (READONLY)'}</label>
                      <input
                        type="text"
                        value={syllName}
                        onChange={e => setSyllName(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. Rəqəmsal Pedaqogika' : 'E.g. Digital Pedagogy'}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'KREDİT SAYI (ECTS)' : 'CREDIT VALUE (ECTS)'}</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={syllCredits}
                        onChange={e => setSyllCredits(parseInt(e.target.value) || 6)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">
                      {language === 'AZ' ? 'TƏYİN OLUNAN MÜƏLLİMLƏR (BİR VƏ YA BİR NEÇƏ)' : 'ASSIGNED TEACHERS (ONE OR MORE)'}
                    </label>
                    
                    {(() => {
                      const availableTeachers = users.filter(u => u.role === 'teacher' || u.role === 'head');
                      const startingLetters = Array.from(
                        new Set(
                          availableTeachers
                            .map(u => (u.name || '').trim().charAt(0).toUpperCase())
                            .filter(Boolean)
                        )
                      ).sort((a, b) => a.localeCompare(b, 'az'));

                      const filteredAddTeachers = availableTeachers.filter(u => {
                        const nameVal = (u.name || '').toLowerCase();
                        const emailVal = (u.email || '').toLowerCase();
                        const searchVal = addSyllTeacherSearch.toLowerCase().trim();
                        
                        const matchesSearch = nameVal.includes(searchVal) || emailVal.includes(searchVal);
                        const firstLetter = (u.name || '').trim().charAt(0).toUpperCase();
                        const matchesLetter = addSyllTeacherLetter ? firstLetter === addSyllTeacherLetter : true;
                        
                        return matchesSearch && matchesLetter;
                      });

                      return (
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <input
                              type="text"
                              placeholder={language === 'AZ' ? 'Müəllim axtar...' : 'Search teacher...'}
                              value={addSyllTeacherSearch}
                              onChange={e => setAddSyllTeacherSearch(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            {startingLetters.length > 0 && (
                              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                                <button
                                  type="button"
                                  onClick={() => setAddSyllTeacherLetter(null)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                    !addSyllTeacherLetter
                                      ? 'bg-emerald-700 text-white shadow-sm'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  {language === 'AZ' ? 'Hamısı' : 'All'}
                                </button>
                                {startingLetters.map(letter => (
                                  <button
                                    key={letter}
                                    type="button"
                                    onClick={() => setAddSyllTeacherLetter(letter === addSyllTeacherLetter ? null : letter)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      letter === addSyllTeacherLetter
                                        ? 'bg-emerald-700 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            {filteredAddTeachers.length === 0 ? (
                              <div className="col-span-full py-4 text-center text-xs text-slate-400 font-semibold">
                                {language === 'AZ' ? 'Uyğun müəllim tapılmadı' : 'No matching teachers found'}
                              </div>
                            ) : (
                              filteredAddTeachers.map(u => {
                                const isSelected = syllTeacherEmails.includes(u.email);
                                return (
                                  <label key={u.email} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border shadow-sm ${
                                    isSelected 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' 
                                      : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-700'
                                  }`}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          setSyllTeacherEmails(syllTeacherEmails.filter(email => email !== u.email));
                                        } else {
                                          setSyllTeacherEmails([...syllTeacherEmails, u.email]);
                                        }
                                      }}
                                      className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div className="text-left min-w-0 flex-1">
                                      <p className="text-xs font-bold leading-tight truncate">{u.name}</p>
                                      <p className="text-[10px] text-slate-450 font-mono leading-tight truncate">{u.email}</p>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'TƏDRİS MATERİALI VƏ MƏZMUN SILLABUSU' : 'CURRICULUM MATERIAL & CONTENT SYLLABUS'}</label>
                    <textarea
                      value={syllContent}
                      onChange={e => setSyllContent(e.target.value)}
                      rows={4}
                      placeholder={language === 'AZ' ? 'Sillabus məzmununu, mövzuları, hədəfləri və qiymətləndirmə meyarlarını yazın...' : 'Enter the syllabus content, topics, objectives, and evaluation criteria...'}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSyllabus(false)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-all"
                    >
                      {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs transition-all shadow-sm"
                    >
                      {language === 'AZ' ? 'Sillabusu Əlavə Et' : 'Add Syllabus'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* Syllabus Editing State */}
          {editingSyllabusId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-800 animate-pulse" />
                  <h3 className="font-bold text-sm text-emerald-950">
                    {language === 'AZ' ? 'Sillabus Redaktəsi:' : 'Edit Syllabus:'} {editSyllCode} — {editSyllName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSyllabusId(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  {language === 'AZ' ? 'Xəritəyə Qayıt (Ləğv Et)' : 'Back to Curriculum Map (Cancel)'}
                </button>
              </div>

              <form onSubmit={handleUpdateSyllabusSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'FƏNN KODU' : 'COURSE CODE'}</label>
                    <input
                      type="text"
                      value={editSyllCode}
                      onChange={e => setEditSyllCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'FƏNNİN ADI' : 'SUBJECT NAME'}</label>
                    <input
                      type="text"
                      value={editSyllName}
                      onChange={e => setEditSyllName(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'TƏDRİS MATERİALI VƏ SILLABUS MƏZMUNU' : 'CURRICULUM CONTENT & TOPICS'}</label>
                  <textarea
                    value={editSyllContent}
                    onChange={e => setEditSyllContent(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'FƏNNİN ƏTRAFLI TƏSVİRİ (DESCRIPTION)' : 'COURSE DESCRIPTION'}</label>
                  <textarea
                    value={editSyllDescription}
                    onChange={e => setEditSyllDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'HƏFTƏLİK MÖVZULAR (HƏR SƏTİRDƏ BİR MÖVZU)' : 'WEEKLY TOPICS (ONE PER LINE)'}</label>
                  <textarea
                    value={editSyllTopics}
                    onChange={e => setEditSyllTopics(e.target.value)}
                    rows={4}
                    placeholder={language === 'AZ' ? "Hefte 1: Giris\nHefte 2: Alqoritmler" : "Week 1: Introduction\nWeek 2: Algorithms"}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'SİLLABUS SƏNƏDLƏRİ (VERGÜLLƏ AYRILMIŞ LİNKLƏR)' : 'SYLLABUS DOCUMENTS (COMMA SEPARATED URLS)'}</label>
                  <input
                    type="text"
                    value={editSyllFiles}
                    onChange={e => setEditSyllFiles(e.target.value)}
                    placeholder="https://example.com/syllabus.pdf"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">{language === 'AZ' ? 'DƏYİŞİKLİK QEYDİ (LOG) *' : 'CHANGE LOG COMMENT *'}</label>
                  <input
                    type="text"
                    value={editSyllComment}
                    onChange={e => setEditSyllComment(e.target.value)}
                    placeholder={language === 'AZ' ? 'Məs. Tələbə rəyinə əsasən e-derslik dərsləri əlavə olundu...' : 'E.g. E-textbook chapters added based on student feedback...'}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSyllabusId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-all"
                  >
                    {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-semibold text-xs transition-all shadow-sm"
                  >
                    {language === 'AZ' ? 'Dəyişiklikləri Yadda Saxla və Tətbiq Et' : 'Save and Apply Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'AZ' ? 'İxtisas proqramlarında və fənn sillabuslarında axtarın (məs: Fizika, PED-101)...' : 'Search in specialty programs and subject syllabi (e.g. Physics, PED-101)...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 transition-all placeholder:text-slate-400 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                {language === 'AZ' ? 'Təmizlə' : 'Clear'}
              </button>
            )}
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 gap-6">
            {(() => {
              const isSearchActive = searchQuery.trim().length > 0;
              const filteredPrograms = myAllowedPrograms.filter(prog => {
                if (!isSearchActive) return true;
                const query = searchQuery.toLowerCase();
                
                const programMatches = prog.name.toLowerCase().includes(query) || 
                                       prog.description.toLowerCase().includes(query);
                if (programMatches) return true;

                const progSyllabi = syllabi.filter(s => s.programId === prog.id);
                return progSyllabi.some(s => 
                  s.code.toLowerCase().includes(query) ||
                  s.name.toLowerCase().includes(query) ||
                  s.content.toLowerCase().includes(query)
                );
              });

              if (filteredPrograms.length === 0) {
                return (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-8">
                    <p className="text-slate-400 italic text-sm">
                      {language === 'AZ' ? 'Axtarışa uyğun heç bir ixtisas proqramı və ya fənn sillabusu tapılmadı.' : 'No matching specialty program or subject syllabus found.'}
                    </p>
                  </div>
                );
              }

              return filteredPrograms.map(prog => {
                const progSyllabi = syllabi.filter(s => s.programId === prog.id);
                
                const filteredSyllabiOfProg = progSyllabi.filter(s => {
                  if (!isSearchActive) return true;
                  const query = searchQuery.toLowerCase();
                  return s.code.toLowerCase().includes(query) ||
                         s.name.toLowerCase().includes(query) ||
                         s.content.toLowerCase().includes(query);
                });

                const shownSyllabi = isSearchActive
                  ? (filteredSyllabiOfProg.length > 0 ? filteredSyllabiOfProg : progSyllabi)
                  : progSyllabi;

                const isExpanded = isSearchActive || !!expandedProgramIds[prog.id];

                return (
                  <div
                    key={prog.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-emerald-100 hover:shadow-md transition-all flex flex-col h-full justify-between"
                  >
                    {/* Header Top content */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2" onClick={() => handleProgramClick(prog)}>
                          <h3 className="font-bold text-slate-800 text-sm md:text-base cursor-pointer hover:text-emerald-800 transition-colors leading-snug">{prog.name}</h3>
                          <div className="shrink-0 flex items-center gap-1">
                            {prog.status === 'Yenilənib' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                {language === 'AZ' ? 'Yenilənib' : 'Updated'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {language === 'AZ' ? 'Normal' : 'Normal'}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Clamped description with exact line clamp and height */}
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 h-8 text-ellipsis overflow-hidden" title={prog.description}>
                          {prog.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 text-[11px] font-mono text-slate-400 mt-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                            {language === 'AZ' ? 'Fənn: ' : 'Subjects: '}{progSyllabi.length}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-100">
                            {prog.totalCredits || 240} ECTS
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>V: <strong className="text-slate-700">{prog.version}</strong></span>
                          <span>{language === 'AZ' ? 'Yenilənmə: ' : 'Updated: '}<strong className="text-slate-700">{prog.lastUpdated}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom controls panel */}
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleProgramClick(prog)}
                          className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {language === 'AZ' ? 'Ətraflı / Redaktə et' : 'Details / Edit'}
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              name: prog.name,
                              onConfirm: async () => {
                                if (onDeleteProgram) {
                                  await onDeleteProgram(prog.id);
                                }
                              }
                            });
                          }}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {language === 'AZ' ? 'Sil' : 'Delete'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProgramIds(prev => ({
                            ...prev,
                            [prog.id]: !prev[prog.id]
                          }));
                        }}
                        className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center cursor-pointer gap-1"
                        title={language === 'AZ' ? 'Fənləri göstər/gizlə' : 'Show/hide subjects'}
                      >
                        <span className="text-[10px] text-slate-400 font-semibold">{language === 'AZ' ? 'Sillabuslar' : 'Syllabi'}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-800" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Body: Syllabi list under this program (Collapsible) */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-white border-t border-slate-100 w-full"
                        >
                          <div className="p-6 space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Tədris Olunan Fənlər (Sillabuslar)' : 'Taught Subjects (Syllabi)'}</h4>
                            
                            {shownSyllabi.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">{language === 'AZ' ? 'Bu proqram üzrə hələ heç bir fənn sillabusu əlavə edilməyib.' : 'No subject syllabus has been added to this program yet.'}</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {shownSyllabi.map(syll => (
                                  <div
                                    key={syll.id}
                                    onClick={() => handleSyllabusClick(syll)}
                                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 cursor-pointer hover:border-emerald-200 transition-all flex flex-col justify-between group"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                            {syll.code}
                                          </span>
                                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {syll.credits || 6} {language === 'AZ' ? 'Kredit' : 'Credits'}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">{language === 'AZ' ? 'Yeniləndi:' : 'Updated:'} {syll.lastUpdated}</span>
                                      </div>
                                      <h5 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800 transition-colors">{syll.name}</h5>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(() => {
                                          const emails = syll.teacherEmails || (syll.teacherEmail ? [syll.teacherEmail] : []);
                                          if (emails.length === 0) return <span className="text-[10px] text-slate-400 italic">{language === 'AZ' ? 'Müəllim təyin edilməyib' : 'No teacher assigned'}</span>;
                                          return emails.map(email => {
                                            const found = users.find(u => u.email === email);
                                            return (
                                              <span key={email} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md font-bold">
                                                {found ? found.name : email}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-line bg-white p-3 rounded-lg border border-slate-100 line-clamp-3">
                                        {syll.content}
                                      </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                      {syll.updatesLog && syll.updatesLog.length > 1 ? (
                                        <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                                          <History className="w-3.5 h-3.5" />
                                          {language === 'AZ' ? 'Yenilənmə mövcuddur' : 'Update available'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">{language === 'AZ' ? 'Dəyişiklik edilməyib' : 'No changes made'}</span>
                                      )}

                                      <div className="flex items-center gap-3">
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
                                          className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          {language === 'AZ' ? 'Sil' : 'Delete'}
                                        </button>

                                        <button
                                          onClick={() => handleSyllabusClick(syll)}
                                          className="text-xs text-emerald-700 hover:text-emerald-950 font-semibold flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                          {language === 'AZ' ? 'Detallar / Düzəliş et' : 'Details / Edit'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Updates log panel for the program */}
                            {prog.updatesLog && prog.updatesLog.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                <details className="text-xs text-slate-500 cursor-pointer">
                                  <summary className="font-bold text-slate-700 select-none hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5" />
                                    {language === 'AZ' ? 'İxtisas proqramının dəyişiklik jurnalı (Logs)' : 'Specialty program change log (Logs)'}
                                  </summary>
                                  <div className="mt-2.5 space-y-1.5 pl-5 border-l-2 border-emerald-100">
                                    {prog.updatesLog.map((log, lIdx) => (
                                      <p key={lIdx} className="text-[11px] text-slate-500 font-mono">
                                        • {log}
                                      </p>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* --- TAB 2: INCOMING CASES EVALUATION --- */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'AZ' ? 'Gələn Təkliflərin və Müşahidələrin Qiymətləndirilməsi' : 'Evaluation of Incoming Suggestions & Observations'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'AZ' 
                  ? 'Tələbələr tərəfindən daxil olan dərslik boşluqları və müəssisələrin bazar ehtiyacları olan keyslər' 
                  : 'Student textbook/curriculum gaps and enterprise market demand cases'}
              </p>
            </div>

            {/* Sub-tab selection with counts */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shrink-0">
              <button
                onClick={() => setSuggestionsFilter('incoming')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  suggestionsFilter === 'incoming'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{language === 'AZ' ? 'Gələn Təkliflər' : 'Incoming Suggestions'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  suggestionsFilter === 'incoming' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-700'
                }`}>
                  {suggestions.filter(s => s.status === 'Gözləmədə' || s.status === 'Baxılır' || s.status === 'Qəbul edildi').length}
                </span>
              </button>
              <button
                onClick={() => setSuggestionsFilter('executed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  suggestionsFilter === 'executed'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{language === 'AZ' ? 'İcra Olunmuş Təkliflər' : 'Executed Suggestions'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  suggestionsFilter === 'executed' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-200 text-slate-700'
                }`}>
                  {suggestions.filter(s => s.status === 'Tətbiq olundu' || s.status === 'Rədd edildi').length}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              const filteredSuggestions = suggestions.filter((item) => {
                if (suggestionsFilter === 'incoming') {
                  return item.status === 'Gözləmədə' || item.status === 'Baxılır' || item.status === 'Qəbul edildi';
                } else {
                  return item.status === 'Tətbiq olundu' || item.status === 'Rədd edildi';
                }
              });

              if (filteredSuggestions.length === 0) {
                return (
                  <p className="text-sm text-slate-400 italic bg-white p-8 rounded-2xl border border-slate-100 text-center">
                    {suggestionsFilter === 'incoming'
                      ? (language === 'AZ' ? 'Hazırda gələn aktiv keys/təklif yoxdur.' : 'There are currently no active incoming cases.')
                      : (language === 'AZ' ? 'Hazırda icra olunmuş keys/təklif yoxdur.' : 'There are currently no executed or closed cases.')
                    }
                  </p>
                );
              }

              return filteredSuggestions.map((item) => {
                const associatedProgram = programs.find(p => p.id === item.programId);
                const associatedSyllabus = syllabi.find(s => s.id === item.syllabusId);

                return (
                  <div
                    key={item.id}
                    className="p-6 bg-white border border-slate-100 rounded-2xl hover:border-emerald-100 hover:shadow-sm transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.authorType === 'student'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {item.authorType === 'student' ? (language === 'AZ' ? 'Tələbə Keysi' : 'Student Case') : (language === 'AZ' ? 'Müəssisə Tələbi' : 'Enterprise Demand')}
                          </span>
                          <span className="text-slate-300 text-xs">|</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {language === 'AZ' ? item.type : (item.type === 'Boşluq' ? 'Gap' : 'New Trend')}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm md:text-base leading-snug">{item.title}</h3>
                      </div>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
                      <span>{language === 'AZ' ? 'Müəllif:' : 'Author:'} <strong className="text-slate-700">{item.authorName}</strong> ({item.authorEmail})</span>
                      <span>{language === 'AZ' ? 'İxtisas:' : 'Specialty:'} <strong className="text-slate-700">{associatedProgram?.name}</strong></span>
                      {associatedSyllabus && (
                        <span>{language === 'AZ' ? 'Fənn:' : 'Subject:'} <strong className="text-slate-700">{associatedSyllabus.code} - {associatedSyllabus.name}</strong></span>
                      )}
                      <span className="ml-auto font-mono text-[10px]">
                        {new Date(item.createdAt).toLocaleDateString(language === 'AZ' ? 'az-AZ' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* --- TEACHER COLLABORATION SECTION --- */}
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {item.teacherFeedbackStatus === 'pending_review'
                            ? (language === 'AZ' ? '⚠️ Müəllim Rəyi Təsdiq Gözləyir' : '⚠️ Teacher Feedback Awaiting Review')
                            : item.teacherFeedbackStatus === 'approved'
                            ? (language === 'AZ' ? '✅ Müəllim Rəyi Təsdiqləndi' : '✅ Teacher Feedback Approved')
                            : (language === 'AZ' ? 'Müəllimə Yönləndir (İxtiyari)' : 'Forward to Teacher (Optional)')}
                        </span>
                        {item.assignedTeacherEmail ? (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-black">
                            {language === 'AZ' ? `TƏYİN OLUNUB: ${item.assignedTeacherEmail}` : `ASSIGNED TO: ${item.assignedTeacherEmail}`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
                            {language === 'AZ' ? 'Hələ təyin olunmayıb' : 'Not assigned yet'}
                          </span>
                        )}
                      </div>

                      {/* Assignment selection if no assignment or pending review */}
                      {item.status !== 'Tətbiq olundu' && item.status !== 'Rədd edildi' && (!item.assignedTeacherEmail || item.teacherFeedbackStatus === 'none') && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <span className="text-slate-500 font-medium whitespace-nowrap">{language === 'AZ' ? 'Keysi yönləndir:' : 'Forward case to:'}</span>
                          <select
                            value={teacherAssignments[item.id] || ''}
                            onChange={e => setTeacherAssignments(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none flex-1 font-semibold"
                          >
                            <option value="">-- {language === 'AZ' ? 'Müəllim seçin' : 'Select Teacher'} --</option>
                            {users.filter(u => u.role === 'teacher' || u.role === 'head').map(u => (
                              <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignTeacherClick(item.id, teacherAssignments[item.id] || '')}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {language === 'AZ' ? 'Müəllimə Yönləndir' : 'Forward to Teacher'}
                          </button>
                        </div>
                      )}

                      {/* Display teacher's proposal and review actions if pending_review */}
                      {item.teacherFeedbackStatus === 'pending_review' && (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 space-y-3 mt-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-950">
                            <FileText className="w-4 h-4 text-amber-600" />
                            <span>{language === 'AZ' ? 'Müəllimin Daxil Etdiyi Təhlil və Düzəliş:' : "Teacher's Analysis & Proposed Correction:"}</span>
                            <span className="ml-auto px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-800 rounded text-[9px] font-black uppercase tracking-wide">
                              {language === 'AZ' ? 'Təsdiq Gözləyir' : 'Awaiting Review'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">{language === 'AZ' ? 'Müəllim Qeydi (Təhlil):' : 'Teacher Notes (Analysis):'}</span>
                              <p className="bg-white border border-slate-100 p-2.5 rounded-lg text-slate-700 font-medium mt-0.5 leading-relaxed">{item.teacherEvaluationNotes}</p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-black text-amber-900 tracking-wider block">{language === 'AZ' ? 'Təklif Olunan Mətn Düzəlişi (Sarı Qeyd ilə Vurğulama):' : 'Proposed Text Change (Yellow Highlight):'}</span>
                              <p className="bg-yellow-50 border-l-4 border-yellow-400 p-2.5 rounded-r-lg text-slate-950 font-bold mt-0.5 leading-relaxed shadow-sm">
                                <mark className="bg-yellow-200/80 px-1 py-0.5 rounded text-slate-950">{item.teacherProposedChanges}</mark>
                              </p>
                            </div>
                          </div>

                          {/* Approve/Edit controls inline */}
                          {approvingCaseId === item.id ? (
                            <form onSubmit={handleHeadApproveTeacherSubmit} className="space-y-3 pt-3 border-t border-amber-100 text-xs">
                              <h5 className="font-extrabold text-[11px] text-teal-900 uppercase tracking-wider">{language === 'AZ' ? 'Müəllim təklifini redaktə et və təsdiqlə' : 'Edit & Approve Teacher Proposal'}</h5>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'MÜƏLLİMİN METODİK RƏYİ' : 'TEACHER METHODICAL NOTES'}</label>
                                <textarea
                                  value={headApproveNotes}
                                  onChange={e => setHeadApproveNotes(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-semibold"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">{language === 'AZ' ? 'SİLLABUSA ƏLAVƏ OLUNACAQ MƏTN' : 'PROPOSED CHANGE TEXT TO ADD'}</label>
                                <textarea
                                  value={headApproveProposedChanges}
                                  onChange={e => setHeadApproveProposedChanges(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-bold text-indigo-900"
                                  rows={2}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setApprovingCaseId(null)}
                                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg font-bold"
                                >
                                  {language === 'AZ' ? 'Ləğv et' : 'Cancel'}
                                </button>
                                <button
                                  type="submit"
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black shadow-sm"
                                >
                                  {language === 'AZ' ? 'Düzəlişi Təsdiqlə və Sillabusa Əlavə Et' : 'Approve & Insert into Syllabus'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovingCaseId(item.id);
                                  setHeadApproveNotes(item.teacherEvaluationNotes || '');
                                  setHeadApproveProposedChanges(item.teacherProposedChanges || '');
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                {language === 'AZ' ? 'Müəllim təklifini redaktə et və Təsdiqlə' : 'Edit & Approve Teacher Proposal'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display approved teacher proposal */}
                      {item.teacherFeedbackStatus === 'approved' && (
                        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-emerald-950">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{language === 'AZ' ? 'Təsdiqlənmiş Müəllim Düzəlişləri' : 'Approved Teacher Corrections'}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            <strong className="text-emerald-900 block">{language === 'AZ' ? 'Düzəliş qeydi:' : 'Decision note:'}</strong>
                            {item.teacherEvaluationNotes}
                          </p>
                          <p className="text-xs text-amber-950 mt-1.5 leading-relaxed bg-yellow-50 border-l-4 border-yellow-400 p-2.5 rounded-r shadow-sm font-semibold">
                            <strong className="text-amber-900 block mb-1">{language === 'AZ' ? 'Əlavə olunmuş mətn (Sarı Qeyd):' : 'Inserted text (Yellow Highlight):'}</strong>
                            <mark className="bg-yellow-200/80 px-1 py-0.5 rounded">"{item.teacherProposedChanges}"</mark>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manual evaluation section toggle */}
                    {evaluatingCaseId === item.id ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-4"
                      >
                        <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
                          {language === 'AZ' ? 'Pedaqoji Qiymətləndirmə Formu' : 'Pedagogical Evaluation Form'}
                        </h4>
                        
                        <form onSubmit={handleEvaluateSubmit} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'AZ' ? 'Yeni Status təyin et *' : 'Set New Status *'}</label>
                              <select
                                value={evalStatus}
                                onChange={e => setEvalStatus(e.target.value as any)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                              >
                                <option value="Baxılır">{language === 'AZ' ? 'Baxılır' : 'Under Review'}</option>
                                <option value="Qəbul edildi">{language === 'AZ' ? 'Qəbul edildi' : 'Accepted'}</option>
                                <option value="Rədd edildi">{language === 'AZ' ? 'Rədd edildi' : 'Rejected'}</option>
                                <option value="Tətbiq olundu">{language === 'AZ' ? 'Tətbiq olundu (Sillabusa əlavə et)' : 'Applied (Add to Syllabus)'}</option>
                              </select>
                            </div>

                            {evalStatus === 'Tətbiq olundu' && (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'AZ' ? 'Edilən konkret dəyişiklik *' : 'Specific change made *'}</label>
                                <input
                                  type="text"
                                  value={evalAction}
                                  onChange={e => setEvalAction(e.target.value)}
                                  placeholder={language === 'AZ' ? 'Məs. STEM fəslinə smart whiteboard dərsi əlavə edildi.' : 'E.g. Added smart whiteboard lesson to STEM chapter.'}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                                  required
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">{language === 'AZ' ? 'Müəllifə gedəcək pedaqoji rəy / izahat *' : 'Pedagogical feedback / explanation for author *'}</label>
                            <textarea
                              value={evalComment}
                              onChange={e => setEvalComment(e.target.value)}
                              rows={3}
                              placeholder={language === 'AZ' ? 'Təklifiniz üçün təşəkkür edirik. Bu təklif fənn proqramının 3-cü fəslinə metodologiya olaraq daxil edilmişdir...' : 'Thank you for your suggestion. This proposal has been integrated into chapter 3 of the course syllabus as a methodology...'}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none resize-none"
                              required
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEvaluatingCaseId(null)}
                              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                            >
                              {language === 'AZ' ? 'Ləğv et' : 'Cancel'}
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                            >
                              {language === 'AZ' ? 'Qiymətləndirməni Göndər' : 'Submit Evaluation'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    ) : (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            setEvaluatingCaseId(item.id);
                            setEvalStatus(item.status === 'Gözləmədə' ? 'Baxılır' : item.status as any);
                            setEvalComment(item.evaluation || '');
                            setEvalAction(item.actionTaken || '');
                          }}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 hover:border-emerald-700/30 rounded-xl text-xs font-bold text-emerald-800 transition-all flex items-center gap-1.5"
                        >
                          {language === 'AZ' ? 'Keysi qiymətləndir / Yenilə' : 'Evaluate / Update Case'}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Pre-existing internal evaluation logs */}
                    {item.evaluation && evaluatingCaseId !== item.id && (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100/50 rounded-xl">
                        <p className="text-xs text-slate-600">
                          <strong className="text-emerald-900 block mb-0.5">{language === 'AZ' ? 'Sizin Əvvəlki Qiymətləndirməniz:' : 'Your Previous Evaluation:'}</strong>
                          "{item.evaluation}"
                        </p>
                        {item.actionTaken && (
                          <p className="text-xs text-emerald-800 font-semibold mt-1">
                            • {language === 'AZ' ? 'Dəyişiklik qeydi:' : 'Action taken:'} {item.actionTaken}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* --- TAB 3: AI GROUNDING ANALYSIS WITH GEMINI --- */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                <h2 className="text-xl font-bold">{language === 'AZ' ? 'Süni İntellekt (Gemini) Analiz Laboratoriyası' : 'Artificial Intelligence (Gemini) Analysis Laboratory'}</h2>
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                {language === 'AZ' 
                  ? 'Tələbələrin təcrübə fəaliyyətlərindən gələn real keysləri və müəssisələrin bazar tələblərini seçərək tədris proqramına sürətli şəkildə inteqrasiya edin. AI həm pedaqoji qiymətləndirmə verəcək, həm də Qarabağın yenidənqurulmasına töhfə imkanını şərh edəcək.' 
                  : 'Quickly integrate real student internship cases and market demands into the curriculum. AI will perform a pedagogical evaluation and suggest contributions toward the reconstruction of Qarabağ.'}
              </p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-700/50 p-3 rounded-xl flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              <span>{language === 'AZ' ? 'Gemini 3.5 Flash təminatı' : 'Powered by Gemini 3.5 Flash'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Selector Workspace */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <BookOpen className="w-4.5 h-4.5 text-emerald-800" />
                  {language === 'AZ' ? '1. Təhlil Hədəfini Seçin' : '1. Select Analysis Target'}
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{language === 'AZ' ? 'İxtisas Proqramı *' : 'Specialty Program *'}</label>
                  <select
                    value={aiSelectedProgramId}
                    onChange={e => {
                      setAiSelectedProgramId(e.target.value);
                      setAiSelectedSyllabusId('');
                      setAiSelectedSuggestionIds([]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  >
                    {myAllowedPrograms.map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{language === 'AZ' ? 'Fənn Sillabusu ' : 'Subject Syllabus '}<span className="text-slate-400 font-normal">{language === 'AZ' ? '(Könüllü)' : '(Optional)'}</span></label>
                  <select
                    value={aiSelectedSyllabusId}
                    onChange={e => {
                      setAiSelectedSyllabusId(e.target.value);
                      setAiSelectedSuggestionIds([]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  >
                    <option value="">{language === 'AZ' ? 'İxtisas üzrə ümumi analiz (Fənn fiksasiyası yoxdur)' : 'General program analysis (No specific subject course)'}</option>
                    {syllabi.filter(s => s.programId === aiSelectedProgramId).map(syll => (
                      <option key={syll.id} value={syll.id}>{syll.code} — {syll.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Case selector checkbox list */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <FileText className="w-4.5 h-4.5 text-emerald-800" />
                  {language === 'AZ' ? '2. Daxil olmuş Keysləri Seçin *' : '2. Select Submitted Cases *'}
                </h3>

                <p className="text-[11px] text-slate-400 leading-normal">
                  {language === 'AZ' 
                    ? 'Süni intellektə göndəriləcək daxil olmuş tələbə və müəssisə keyslərini seçin (çoxlu seçim mümkündür):' 
                    : 'Select submitted student/enterprise cases to send to AI (multiple selections allowed):'}
                </p>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {suggestions.filter(c => c.programId === aiSelectedProgramId && (!aiSelectedSyllabusId || c.syllabusId === aiSelectedSyllabusId) && c.status !== 'Tətbiq olundu' && c.status !== 'Rədd edildi').length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-100 rounded-lg">
                      {language === 'AZ' ? 'Bu filtrə uyğun hər hansı bir daxil olmuş keys (təklif) tapılmadı.' : 'No submitted cases matching this filter were found.'}
                    </p>
                  ) : (
                    suggestions
                      .filter(c => c.programId === aiSelectedProgramId && (!aiSelectedSyllabusId || c.syllabusId === aiSelectedSyllabusId) && c.status !== 'Tətbiq olundu' && c.status !== 'Rədd edildi')
                      .map(item => {
                        const isSelected = aiSelectedSuggestionIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (isSelected) {
                                setAiSelectedSuggestionIds(prev => prev.filter(id => id !== item.id));
                              } else {
                                setAiSelectedSuggestionIds(prev => [...prev, item.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                {item.authorName} ({item.authorType === 'student' ? (language === 'AZ' ? 'Tələbə' : 'Student') : (language === 'AZ' ? 'Müəssisə' : 'Enterprise')})
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs leading-snug">{item.title}</h4>
                              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAIAnalyze}
                  disabled={aiAnalyzing || aiSelectedSuggestionIds.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-800 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-sm shadow-emerald-800/10"
                >
                  {aiAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'AZ' ? 'Analiz olunur...' : 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      {language === 'AZ' ? 'Seçilmişləri Süni İntellektlə Analiz Et' : 'Analyze Selected with AI'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: AI Outputs Display */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 min-h-[450px] shadow-sm flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {aiAnalyzing ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-center space-y-6 my-auto"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin"></div>
                        <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <div className="space-y-2 max-w-md">
                        <h4 className="font-bold text-slate-800 text-sm">{language === 'AZ' ? 'Gemini AI Pedaqoji Təhlil Aparır' : 'Gemini AI Performing Pedagogical Analysis'}</h4>
                        <p className="text-xs text-slate-500 italic font-medium min-h-[40px] px-4">
                          "{loadingMessages[aiLoadingMessageIdx]}"
                        </p>
                      </div>
                    </motion.div>
                  ) : aiResult ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Title */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                          <h3 className="font-bold text-slate-800 text-sm md:text-base">{language === 'AZ' ? 'Gemini Tədris Təhlili Nəticəsi' : 'Gemini Curriculum Analysis Results'}</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
                          {language === 'AZ' ? 'Analiz Tamamlandı' : 'Analysis Complete'}
                        </span>
                      </div>

                      {/* Part 1: Evaluation */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>●</span> {language === 'AZ' ? 'Pedaqoji Analiz və Qiymətləndirmə' : 'Pedagogical Analysis & Evaluation'}
                        </h4>
                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {aiResult.evaluation}
                        </p>
                      </div>

                      {/* Part 2: Suggested Changes */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>●</span> {language === 'AZ' ? 'Sillabusa Təklif Edilən Konkret Əlavələr (Sarı Qeyd)' : 'Specific Additions Proposed for Syllabus (Yellow Highlight)'}
                        </h4>
                        <div className="space-y-2">
                          {aiResult.suggestedChanges.map((change, cIdx) => (
                            <div key={cIdx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 leading-relaxed bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg shadow-sm">
                              <span className="text-amber-700 font-extrabold mt-0.5">✓</span>
                              <p className="font-semibold text-amber-950">
                                <mark className="bg-yellow-200/80 px-1 py-0.5 rounded text-amber-950">{change}</mark>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Part 2.5: Specific Section Modifications (AI highlights) */}
                      {aiResult.specificSectionModifications && aiResult.specificSectionModifications.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>●</span> {language === 'AZ' ? 'Hansı Hissədə/Bölmədə Dəyişiklik Olunacaq? (Sarı Qeyd ilə Vurğulama)' : 'Which Section is Targeted? (Yellow Highlight)'}
                          </h4>
                          <div className="space-y-2.5">
                            {aiResult.specificSectionModifications.map((mod, mIdx) => (
                              <div key={mIdx} className="p-4 bg-yellow-50/50 border-l-4 border-yellow-400 rounded-r-xl space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-yellow-950 text-xs flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900 text-[9px] font-extrabold uppercase border border-yellow-300">
                                      {mod.action}
                                    </span>
                                    {mod.sectionName}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-normal">
                                  <strong className="text-slate-700">{language === 'AZ' ? 'Tövsiyə:' : 'Recommendation:'}</strong> {mod.description}
                                </p>
                                {mod.proposedText && (
                                  <div className="p-3 bg-white border border-yellow-100 rounded-lg text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed shadow-inner">
                                    <span className="block text-[10px] text-yellow-800 font-bold mb-1 uppercase tracking-wider">{language === 'AZ' ? 'Nəzərdə tutulmuş yeni mətn:' : 'Planned new text:'}</span>
                                    <mark className="bg-yellow-200/80 px-1 py-0.5 rounded text-slate-950 font-bold block">{mod.proposedText}</mark>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Part 2.8: Reference Document Matches (Referans Uyğunluğu) */}
                      {aiResult.referenceDocMatches && aiResult.referenceDocMatches.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-indigo-500" />
                            {language === 'AZ' ? 'Rəsmi Standartlar və Referans Sənədlərlə Uyğunluq (İstinadlar)' : 'Compliance with Official Standards & Reference Docs (Citations)'}
                          </h4>
                          <div className="space-y-2.5">
                            {aiResult.referenceDocMatches.map((match, mIdx) => (
                              <div key={mIdx} className="p-4 bg-indigo-50/25 border border-indigo-200/40 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    {match.docName}
                                  </span>
                                </div>
                                {match.matchedSectionText && (
                                  <div className="p-3 bg-white border border-slate-100 rounded-lg text-xs text-slate-700 italic leading-relaxed pl-3 border-l-4 border-indigo-500">
                                    "{match.matchedSectionText}"
                                  </div>
                                )}
                                <p className="text-xs text-slate-600 leading-normal pt-1">
                                  <strong className="text-slate-700">{language === 'AZ' ? 'Təhlil və Uyğunluq:' : 'Analysis & Alignment:'}</strong> {match.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Part 3: Karabakh Context */}
                      <div className="space-y-1.5 bg-gradient-to-r from-emerald-950 to-slate-900 p-5 rounded-xl text-emerald-100 space-y-2">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          {language === 'AZ' ? 'Qarabağ Bölgəsinin Yenidənqurulmasına Töhfəsi' : 'Contribution to the Reconstruction of Qarabağ'}
                        </h4>
                        <p className="text-xs text-emerald-200/90 leading-relaxed">
                          {aiResult.karabakhContext}
                        </p>
                      </div>

                      {/* Quick Apply Button */}
                      <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAiResult(null)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-all"
                        >
                          {language === 'AZ' ? 'Təmizlə' : 'Clear'}
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyAISuggestion}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-700/10 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {language === 'AZ' ? 'AI Təklifini Proqrama Tətbiq Et' : 'Apply AI Suggestions to Program'}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center text-center py-24 text-slate-400 my-auto"
                    >
                      <Wand2 className="w-16 h-16 text-slate-300 stroke-[1.25] mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
                      <h4 className="font-bold text-slate-700 text-sm">{language === 'AZ' ? 'Analiz Nəticəsi' : 'Analysis Output'}</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
                        {language === 'AZ' 
                          ? 'Sol tərəfdən təlim programını və daxil olan tələbə/müəssisə keyslərini seçib "Seçilmişləri Süni İntellektlə Analiz Et" düyməsini klikləyin.' 
                          : 'Select a curriculum program and incoming student/enterprise cases from the left pane, then click "Analyze Selected with AI".'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: REFERENCE DOCUMENTS AND STANDARDS --- */}
      {activeTab === 'references' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {language === 'AZ' ? 'Rəsmi Referans Sənədlər və Dövlət Standartları' : 'Official Reference Documents & State Standards'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'AZ' 
                  ? 'Süni İntellekt analiz aparan zaman bu faylların məzmununu əsas götürərək tam standartlara uyğun təhlil edəcəkdir.' 
                  : 'Gemini AI will base its curriculum and syllabus analysis on the guidelines provided in these files.'}
              </p>
            </div>
            <div>
              <button
                onClick={() => setShowAddReferenceDoc(!showAddReferenceDoc)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer animate-none"
              >
                <Plus className="w-4 h-4" />
                {language === 'AZ' ? 'Yeni Referans Sənəd Əlavə Et' : 'Add Reference Document'}
              </button>
            </div>
          </div>

          {/* Reference Documents Search Bar */}
          <div className="bg-slate-100/60 p-4 rounded-2xl border border-slate-200/50 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={language === 'AZ' ? 'Referans sənədlərdə axtarış (ad və ya daxili mətn)...' : 'Search reference documents (name or text content)...'}
                value={refDocSearchQuery}
                onChange={e => setRefDocSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              />
              {refDocSearchQuery && (
                <button
                  onClick={() => setRefDocSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  {language === 'AZ' ? 'Təmizlə' : 'Clear'}
                </button>
              )}
            </div>
            <div className="text-xs text-slate-500 font-mono whitespace-nowrap bg-white px-3 py-2.5 rounded-xl border border-slate-200/40 shadow-sm w-full md:w-auto text-center md:text-left">
              {language === 'AZ' ? 'Tapılan sənədlər:' : 'Documents found:'}{' '}
              <strong className="text-emerald-750 font-bold font-sans">
                {(referenceDocs || []).filter(doc => {
                  const query = refDocSearchQuery.toLowerCase().trim();
                  if (!query) return true;
                  return (
                    doc.name.toLowerCase().includes(query) ||
                    (doc.content && doc.content.toLowerCase().includes(query))
                  );
                }).length}
              </strong>
            </div>
          </div>

          <AnimatePresence>
            {showAddReferenceDoc && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-sm">
                      {language === 'AZ' ? 'Yeni Referans Sənəd Forması' : 'New Reference Document Form'}
                    </h3>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setRefDocInputMode('manual')}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${refDocInputMode === 'manual' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {language === 'AZ' ? 'Əllə Yaz' : 'Manual Entry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefDocInputMode('word')}
                        className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${refDocInputMode === 'word' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {language === 'AZ' ? 'Word-dan Yüklə' : 'Import Word (.docx)'}
                      </button>
                    </div>
                  </div>

                  {refDocInputMode === 'word' ? (
                    <div className="border-2 border-dashed border-emerald-100 rounded-2xl p-8 bg-emerald-50/5 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
                        {refDocUploading ? (
                          <div className="w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                        ) : (
                          <FileUp className="w-6 h-6" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-xs">
                          {refDocUploading ? (language === 'AZ' ? 'Fayl oxunur...' : 'Parsing file...') : (language === 'AZ' ? 'Rəsmi proqram standartını və ya rəhbər sənədini seçin' : 'Select official standards or reference file')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'AZ' ? 'Yalnız Word (.docx) formatı dəstəklənir • Sənəd daxilindəki mətn avtomatik olaraq çıxarılacaqdır' : 'Only .docx format supported • Text content will be extracted automatically'}
                        </p>
                      </div>
                      <div className="pt-2">
                        <input
                          type="file"
                          accept=".docx"
                          onChange={handleRefDocWordUpload}
                          disabled={refDocUploading}
                          id="ref-doc-file-uploader"
                          className="hidden"
                        />
                        <label
                          htmlFor="ref-doc-file-uploader"
                          className={`inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer ${refDocUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {language === 'AZ' ? 'Kompüterdən Seç' : 'Choose from computer'}
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <form onSubmit={handleSaveReferenceDoc} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'SƏNƏDİN / QAYDANIN ADI' : 'DOCUMENT / RULE NAME'}</label>
                        <input
                          type="text"
                          value={refDocName}
                          onChange={e => setRefDocName(e.target.value)}
                          placeholder={language === 'AZ' ? 'Məs. Azərbaycan Dövlət Pedaqoji Standartı 2026' : 'E.g., Azerbaijan State Pedagogical Standard 2026'}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'SƏNƏDİN TİPİ' : 'DOCUMENT TYPE'}</label>
                        <select
                          value={refDocType}
                          onChange={e => {
                            setRefDocType(e.target.value as any);
                            setRefDocAssociatedId('');
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-700"
                        >
                          <option value="general">{language === 'AZ' ? 'Ümumi Qaydalar və Təlimatlar' : 'General Rules & Manuals'}</option>
                          <option value="program">{language === 'AZ' ? 'İxtisas Proqram Standartı' : 'Specialty Curriculum Standard'}</option>
                          <option value="syllabus">{language === 'AZ' ? 'Sillabus Metodiki Təlimatı' : 'Syllabus Methodical Guide'}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        {refDocType === 'program' 
                          ? (language === 'AZ' ? 'ƏLAQƏLİ İXTİSAS PROQRAMI' : 'ASSOCIATED SPECIALTY PROGRAM') 
                          : refDocType === 'syllabus' 
                            ? (language === 'AZ' ? 'ƏLAQƏLİ FƏNN SİLLABUSU' : 'ASSOCIATED SUBJECT SYLLABUS') 
                            : (language === 'AZ' ? 'ƏLAQƏLİ RESURS (KÖNÜLLÜ)' : 'ASSOCIATED RESOURCE (OPTIONAL)')}
                      </label>
                      <select
                        value={refDocAssociatedId}
                        onChange={e => setRefDocAssociatedId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-700"
                        disabled={refDocType === 'general'}
                      >
                        <option value="">
                          {refDocType === 'program' 
                            ? (language === 'AZ' ? '-- İxtisas proqramı seçin --' : '-- Select specialty program --') 
                            : refDocType === 'syllabus' 
                              ? (language === 'AZ' ? '-- Fənn sillabusu seçin --' : '-- Select subject syllabus --') 
                              : (language === 'AZ' ? '-- Ümumi (Əlaqələndirilməyib) --' : '-- General (Unassociated) --')}
                        </option>
                        {refDocType === 'program' && myAllowedPrograms.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        {refDocType === 'syllabus' && syllabi.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        {language === 'AZ' ? 'SƏNƏDİN TAM MƏTNİ VƏ YA STANDART BƏNDLƏRİ' : 'FULL TEXT OR STANDARD CLAUSES OF THE DOCUMENT'}
                      </label>
                      <textarea
                        value={refDocContent}
                        onChange={e => setRefDocContent(e.target.value)}
                        rows={6}
                        placeholder={language === 'AZ' ? 'Buraya rəsmi qaydaları, mövzuları və ya tədris hədəflərini daxil edin...' : 'Paste or type the official clauses, topics or goals here...'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddReferenceDoc(false);
                          setRefDocName('');
                          setRefDocContent('');
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-600 transition-all cursor-pointer"
                      >
                        {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={refDocUploading}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {language === 'AZ' ? 'Sənədi Yadda Saxla' : 'Save Document'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reference Docs Grid */}
          {referenceDocs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 stroke-[1.25]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">{language === 'AZ' ? 'Siyahı Boşdur' : 'No Reference Documents'}</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  {language === 'AZ' 
                    ? 'Hələ heç bir rəsmi sənəd yüklənməyib. Süni İntellekt analizinin dövlət standartlarına tam uyğun aparılması üçün təlim proqramı standartlarınızı Word formatında və ya əllə daxil edin.' 
                    : 'No documents uploaded yet. Add official program standards or syllabus guidelines so Gemini AI can use them as a reference baseline.'}
                </p>
              </div>
            </div>
          ) : (
            (() => {
              const filteredDocs = (referenceDocs || []).filter(doc => {
                const query = refDocSearchQuery.toLowerCase().trim();
                if (!query) return true;
                return (
                  doc.name.toLowerCase().includes(query) ||
                  (doc.content && doc.content.toLowerCase().includes(query))
                );
              });

              // 1. General Docs: doc.type === 'general' OR doc.associatedId is empty/not found in programs or syllabi
              const generalDocs = filteredDocs.filter(doc => {
                if (doc.type === 'general' || !doc.associatedId) return true;
                const isProgId = programs.some(p => p.id === doc.associatedId);
                const isSyllId = syllabi.some(s => s.id === doc.associatedId);
                return !isProgId && !isSyllId;
              });

              // 2. Program-related
              const programsWithDocs = myAllowedPrograms.map(prog => {
                const progDocs = filteredDocs.filter(doc => doc.type === 'program' && doc.associatedId === prog.id);
                const progSyllabi = syllabi.filter(s => s.programId === prog.id);
                
                const syllabiWithDocs = progSyllabi.map(syll => {
                  const syllDocs = filteredDocs.filter(doc => doc.type === 'syllabus' && doc.associatedId === syll.id);
                  return {
                    syllabus: syll,
                    docs: syllDocs
                  };
                }).filter(item => item.docs.length > 0);
                
                return {
                  program: prog,
                  progDocs,
                  syllabiWithDocs,
                  totalDocsCount: progDocs.length + syllabiWithDocs.reduce((acc, curr) => acc + curr.docs.length, 0)
                };
              }).filter(item => item.totalDocsCount > 0);

              const hasNoMatches = generalDocs.length === 0 && programsWithDocs.length === 0;

              if (hasNoMatches) {
                return (
                  <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 stroke-[1.25]" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {language === 'AZ' ? 'Axtarışa uyğun nəticə tapılmadı' : 'No search results found'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        {language === 'AZ'
                          ? `"${refDocSearchQuery}" açar sözünə uyğun heç bir referans sənədi və ya daxili mətn daxilində uyğunluq tapılmadı.`
                          : `No reference document name or text content matches the search "${refDocSearchQuery}".`}
                      </p>
                    </div>
                  </div>
                );
              }

              const renderDocCard = (doc: typeof referenceDocs[0]) => {
                return (
                  <div 
                    key={doc.id} 
                    onClick={() => setSelectedRefDoc(doc)}
                    className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-3 cursor-pointer hover:border-emerald-200 group text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 group-hover:bg-emerald-100 transition-all flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-extrabold text-slate-800 text-xs md:text-sm line-clamp-1 group-hover:text-emerald-900 transition-colors">
                          {doc.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {doc.fileSize || '0 KB'} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                        {doc.content && (
                          <p className="text-[10px] text-slate-450 line-clamp-2 mt-1.5 leading-normal bg-slate-50 p-2 rounded-lg border border-slate-100/60 font-sans">
                            {doc.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          name: doc.name,
                          onConfirm: async () => {
                            await onDeleteReferenceDoc(doc.id);
                          }
                        });
                      }}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              };

              return (
                <div className="space-y-6">
                  {/* Category 1: General Docs */}
                  {generalDocs.length > 0 && (
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/50 p-5 space-y-3.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                        <Database className="w-4 h-4 text-slate-500" />
                        <h3 className="text-xs md:text-sm font-black text-slate-700 uppercase tracking-wider">
                          {language === 'AZ' ? 'Ümumi Qaydalar və Təlimatlar' : 'General Rules & Handbooks'}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold font-mono">
                          {generalDocs.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generalDocs.map(renderDocCard)}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Programs and nested Syllabi */}
                  {programsWithDocs.length > 0 && (
                    <div className="space-y-6">
                      {programsWithDocs.map(({ program, progDocs, syllabiWithDocs, totalDocsCount }) => (
                        <div 
                          key={program.id}
                          className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4"
                        >
                          {/* Program Header Section */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-700/10 text-emerald-800 rounded-xl">
                                <Layers className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight">
                                  {program.name}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {language === 'AZ' ? 'Kod:' : 'Code:'} <strong className="font-semibold text-slate-600">{program.id}</strong> • {program.totalCredits || 0} ECTS
                                </p>
                              </div>
                            </div>
                            <span className="self-start sm:self-center px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                              {totalDocsCount} {language === 'AZ' ? 'Sənəd' : 'Docs'}
                            </span>
                          </div>

                          {/* Nested Program Standard Documents */}
                          {progDocs.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-[11px] font-black text-indigo-800 uppercase tracking-widest pl-1 text-left">
                                {language === 'AZ' ? '• İXTİSAS PROQRAMI STANDARTLARI' : '• SPECIALTY PROGRAM STANDARDS'}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {progDocs.map(renderDocCard)}
                              </div>
                            </div>
                          )}

                          {/* Nested Syllabus Guidelines */}
                          {syllabiWithDocs.length > 0 && (
                            <div className="space-y-3.5 pt-2">
                              <h5 className="text-[11px] font-black text-cyan-800 uppercase tracking-widest pl-1 text-left">
                                {language === 'AZ' ? '• SİLLABUS METODİKİ TƏLİMATLARI' : '• SYLLABUS GUIDELINES'}
                              </h5>
                              <div className="space-y-3 pl-3 border-l-2 border-emerald-100">
                                {syllabiWithDocs.map(({ syllabus, docs }) => (
                                  <div key={syllabus.id} className="space-y-2 text-left">
                                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600">
                                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{syllabus.name}</span>
                                      <span className="font-mono text-[10px] font-normal bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                        {syllabus.code}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {docs.map(renderDocCard)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Details Modal for Program */}
      <AnimatePresence>
        {selectedProg && (
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
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-lg leading-tight">
                    {isEditingProg 
                      ? (language === 'AZ' ? 'Tədris Proqramını Redaktə Et' : 'Edit Specialty Program') 
                      : (language === 'AZ' ? 'Tədris Proqramı Məlumatları' : 'Specialty Program Details')}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedProg.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedProg(null);
                    setIsEditingProg(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Form or Viewer Scrollable Area */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {isEditingProg ? (
                  <form onSubmit={handleUpdateProgramSubmitInModal} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'PROQRAMIN ADI' : 'PROGRAM NAME'}</label>
                      <input
                        type="text"
                        value={editProgName}
                        onChange={e => setEditProgName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'CƏM KREDİT (ECTS)' : 'TOTAL CREDITS (ECTS)'}</label>
                        <input
                          type="number"
                          min={10}
                          max={500}
                          value={editProgCredits}
                          onChange={e => setEditProgCredits(parseInt(e.target.value) || 240)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'STRATEJİ STATUSU' : 'STRATEGIC STATUS'}</label>
                        <span className="inline-block w-full px-3 py-2 bg-slate-100 rounded-xl text-slate-500 text-xs border border-slate-200 cursor-not-allowed">
                          {selectedProg.status === 'Normal' ? (language === 'AZ' ? 'Normal' : 'Normal') : (language === 'AZ' ? 'Yenilənib' : 'Updated')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'STRATEJİ MISSİYASI VƏ TƏSVİRİ' : 'STRATEGIC MISSION & DESCRIPTION'}</label>
                      <textarea
                        value={editProgDesc}
                        onChange={e => setEditProgDesc(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">
                        {language === 'AZ' ? 'PROQRAM RƏHBƏRLƏRİ (BU PROQRAMI GÖRƏ BİLƏNLƏR)' : 'PROGRAM HEADS (WHO CAN ACCESS THIS PROGRAM)'}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                        {users.filter(u => u.role === 'head').map(u => {
                          const isSelected = editProgAllowedHeads.includes(u.email);
                          const isCurrentUser = u.email === currentUser.email;
                          return (
                            <label key={u.email} className={`flex items-center gap-2.5 p-2 bg-white rounded-lg cursor-pointer transition-colors border border-slate-100 hover:border-emerald-200 shadow-sm ${isCurrentUser ? 'opacity-80' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected || isCurrentUser}
                                disabled={isCurrentUser}
                                onChange={() => {
                                  if (isCurrentUser) return;
                                  if (isSelected) {
                                    setEditProgAllowedHeads(editProgAllowedHeads.filter(email => email !== u.email));
                                  } else {
                                    setEditProgAllowedHeads([...editProgAllowedHeads, u.email]);
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="text-[11px] font-sans">
                                <span className="font-bold text-slate-700 block">{u.name}</span>
                                <span className="text-slate-400 font-mono text-[9px]">{u.email} {isCurrentUser && `(${language === 'AZ' ? 'Siz' : 'You'})`}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'DƏYİŞİKLİK QEYDİ (LOG) *' : 'CHANGE LOG COMMENT *'}</label>
                      <input
                        type="text"
                        value={editProgComment}
                        onChange={e => setEditProgComment(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. Yeni dövlət standartına uyğun olaraq kreditlər və hədəflər uyğunlaşdırıldı...' : 'E.g., Aligned credits and targets with the new state standards...'}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProg(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        {language === 'AZ' ? 'Yadda Saxla və Tətbiq Et' : 'Save and Apply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'İxtisas Adı' : 'Specialty Name'}</h4>
                      <p className="text-slate-800 font-bold text-sm bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 leading-relaxed">
                        {selectedProg.name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Fənn Sayı' : 'Number of Subjects'}</h4>
                        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-slate-800 font-mono font-bold text-xs">
                          {syllabi.filter(s => s.programId === selectedProg.id).length} {language === 'AZ' ? 'fənn' : 'subjects'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Kredit Həcmi' : 'Total Credits'}</h4>
                        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-slate-800 font-mono font-bold text-xs">
                          {selectedProg.totalCredits || 240} ECTS
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Strateji Təsviri' : 'Strategic Mission & Description'}</h4>
                      <div className="bg-slate-50 px-4 py-4 rounded-2xl border border-slate-100 text-slate-700 text-xs leading-relaxed whitespace-pre-line font-medium">
                        {selectedProg.description}
                      </div>
                    </div>

                    {selectedProg.updatesLog && selectedProg.updatesLog.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          {language === 'AZ' ? 'Dəyişiklik Jurnalı (Logs)' : 'Change Log History (Logs)'}
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 max-h-36 overflow-y-auto">
                          {selectedProg.updatesLog.map((log, lIdx) => (
                            <p key={lIdx} className="text-[11px] text-slate-500 font-mono leading-relaxed border-l-2 border-emerald-500 pl-2">
                              • {log}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProg(null);
                          setIsEditingProg(false);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        {language === 'AZ' ? 'Bağla' : 'Close'}
                      </button>
                      {currentUser.role === 'head' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirm({
                                name: selectedProg.name,
                                onConfirm: async () => {
                                  if (onDeleteProgram) {
                                    await onDeleteProgram(selectedProg.id);
                                    setSelectedProg(null);
                                  }
                                }
                              });
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {language === 'AZ' ? 'Sil' : 'Delete'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsEditingProg(true)}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {language === 'AZ' ? 'Düzəliş et' : 'Edit'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal for Syllabus */}
      <AnimatePresence>
        {selectedSyll && (
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
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-800 text-lg leading-tight">
                    {isEditingSyll 
                      ? (language === 'AZ' ? 'Sillabusu Redaktə Et' : 'Edit Syllabus') 
                      : (language === 'AZ' ? 'Fənn Sillabusu Məlumatları' : 'Subject Syllabus Details')}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedSyll.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSyll(null);
                    setIsEditingSyll(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Form or Viewer Scrollable Area */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {isEditingSyll ? (
                  <form onSubmit={handleUpdateSyllabusSubmitInModal} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNN KODU' : 'COURSE CODE'}</label>
                        <input
                          type="text"
                          value={editSyllCode}
                          onChange={e => setEditSyllCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'KREDİT (ECTS)' : 'CREDIT (ECTS)'}</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={editSyllCredits}
                          onChange={e => setEditSyllCredits(parseInt(e.target.value) || 6)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'YENİLƏNMƏ TARİXİ' : 'LAST UPDATED'}</label>
                        <span className="inline-block w-full px-3 py-2 bg-slate-100 rounded-xl text-slate-500 text-xs border border-slate-200 cursor-not-allowed">
                          {selectedSyll.lastUpdated}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNNİN ADI' : 'SUBJECT NAME'}</label>
                      <input
                        type="text"
                        value={editSyllName}
                        onChange={e => setEditSyllName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">
                        {language === 'AZ' ? 'TƏYİN OLUNAN MÜƏLLİMLƏR (BİR VƏ YA BİR NEÇƏ)' : 'ASSIGNED TEACHERS (ONE OR MORE)'}
                      </label>
                      
                      {(() => {
                        const availableTeachers = users.filter(u => u.role === 'teacher' || u.role === 'head');
                        const startingLetters = Array.from(
                          new Set(
                            availableTeachers
                              .map(u => (u.name || '').trim().charAt(0).toUpperCase())
                              .filter(Boolean)
                          )
                        ).sort((a, b) => a.localeCompare(b, 'az'));

                        const filteredEditTeachers = availableTeachers.filter(u => {
                          const nameVal = (u.name || '').toLowerCase();
                          const emailVal = (u.email || '').toLowerCase();
                          const searchVal = editSyllTeacherSearch.toLowerCase().trim();
                          
                          const matchesSearch = nameVal.includes(searchVal) || emailVal.includes(searchVal);
                          const firstLetter = (u.name || '').trim().charAt(0).toUpperCase();
                          const matchesLetter = editSyllTeacherLetter ? firstLetter === editSyllTeacherLetter : true;
                          
                          return matchesSearch && matchesLetter;
                        });

                        return (
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                              <input
                                type="text"
                                placeholder={language === 'AZ' ? 'Müəllim axtar...' : 'Search teacher...'}
                                value={editSyllTeacherSearch}
                                onChange={e => setEditSyllTeacherSearch(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                              {startingLetters.length > 0 && (
                                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                                  <button
                                    type="button"
                                    onClick={() => setEditSyllTeacherLetter(null)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      !editSyllTeacherLetter
                                        ? 'bg-emerald-700 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                  >
                                    {language === 'AZ' ? 'Hamısı' : 'All'}
                                  </button>
                                  {startingLetters.map(letter => (
                                    <button
                                      key={letter}
                                      type="button"
                                      onClick={() => setEditSyllTeacherLetter(letter === editSyllTeacherLetter ? null : letter)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                        letter === editSyllTeacherLetter
                                          ? 'bg-emerald-700 text-white shadow-sm'
                                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      {letter}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                              {filteredEditTeachers.length === 0 ? (
                                <div className="col-span-full py-4 text-center text-xs text-slate-400 font-semibold">
                                  {language === 'AZ' ? 'Uyğun müəllim tapılmadı' : 'No matching teachers found'}
                                </div>
                              ) : (
                                filteredEditTeachers.map(u => {
                                  const isSelected = editSyllTeacherEmails.includes(u.email);
                                  return (
                                    <label key={u.email} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border shadow-sm ${
                                      isSelected 
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' 
                                        : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-700'
                                    }`}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          if (isSelected) {
                                            setEditSyllTeacherEmails(editSyllTeacherEmails.filter(email => email !== u.email));
                                          } else {
                                            setEditSyllTeacherEmails([...editSyllTeacherEmails, u.email]);
                                          }
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                      />
                                      <div className="text-left min-w-0 flex-1">
                                        <p className="text-xs font-bold leading-tight truncate">{u.name}</p>
                                        <p className="text-[10px] text-slate-450 font-mono leading-tight truncate">{u.email}</p>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'TƏDRİS MATERİALI VƏ SILLABUS MƏZMUNU' : 'CURRICULUM MATERIAL & CONTENT SYLLABUS'}</label>
                      <textarea
                        value={editSyllContent}
                        onChange={e => setEditSyllContent(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'FƏNNİN ƏTRAFLI TƏSVİRİ (DESCRIPTION)' : 'COURSE DESCRIPTION'}</label>
                      <textarea
                        value={editSyllDescription}
                        onChange={e => setEditSyllDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'HƏFTƏLİK MÖVZULAR (HƏR SƏTİRDƏ BİR MÖVZU)' : 'WEEKLY TOPICS (ONE PER LINE)'}</label>
                      <textarea
                        value={editSyllTopics}
                        onChange={e => setEditSyllTopics(e.target.value)}
                        rows={4}
                        placeholder={language === 'AZ' ? "Hefte 1: Giris\nHefte 2: Alqoritmler" : "Week 1: Introduction\nWeek 2: Algorithms"}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'SİLLABUS SƏNƏDLƏRİ (VERGÜLLƏ AYRILMIŞ LİNKLƏR)' : 'SYLLABUS DOCUMENTS (COMMA SEPARATED URLS)'}</label>
                      <input
                        type="text"
                        value={editSyllFiles}
                        onChange={e => setEditSyllFiles(e.target.value)}
                        placeholder="https://example.com/syllabus.pdf"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{language === 'AZ' ? 'DƏYİŞİKLİK QEYDİ (LOG) *' : 'CHANGE LOG COMMENT *'}</label>
                      <input
                        type="text"
                        value={editSyllComment}
                        onChange={e => setEditSyllComment(e.target.value)}
                        placeholder={language === 'AZ' ? 'Məs. Yaşıl Təhsil prinsipləri və layihələr əlavə olundu...' : 'E.g., Added green education principles and projects...'}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSyll(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        {language === 'AZ' ? 'Ləğv Et' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        {language === 'AZ' ? 'Yadda Saxla və Tətbiq Et' : 'Save and Apply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Fənn' : 'Subject'}</h4>
                      <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 flex-wrap">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {selectedSyll.code}
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                          {selectedSyll.credits || 6} {language === 'AZ' ? 'Kredit' : 'Credits'}
                        </span>
                        <p className="text-slate-800 font-bold text-sm leading-relaxed ml-1">{selectedSyll.name}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Aiddir' : 'Program'}</h4>
                      <p className="text-slate-700 font-medium text-xs bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                        {programs.find(p => p.id === selectedSyll.programId)?.name || (language === 'AZ' ? 'Naməlum proqram' : 'Unknown program')}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Təyin Olunan Müəllim(lər)' : 'Assigned Teacher(s)'}</h4>
                      <div className="flex flex-wrap gap-1.5 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 text-slate-700 text-xs font-medium">
                        {(() => {
                          const emails = selectedSyll.teacherEmails || (selectedSyll.teacherEmail ? [selectedSyll.teacherEmail] : []);
                          if (emails.length === 0) return <span className="text-slate-400">{language === 'AZ' ? 'Təyin edilməyib' : 'Unassigned'}</span>;
                          return emails.map(email => {
                            const found = users.find(u => u.email === email);
                            return (
                              <span key={email} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[11px] font-bold">
                                {found ? found.name : email}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Məzmun və Mövzular' : 'Syllabus Content & Topics'}</h4>
                      <div className="bg-slate-50 px-4 py-4 rounded-2xl border border-slate-100 text-slate-700 text-xs leading-relaxed whitespace-pre-line font-mono max-h-64 overflow-y-auto">
                        {selectedSyll.content}
                      </div>
                    </div>

                    {selectedSyll.updatesLog && selectedSyll.updatesLog.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          {language === 'AZ' ? 'Dəyişiklik Jurnalı (Logs)' : 'Change Log History (Logs)'}
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 max-h-36 overflow-y-auto">
                          {selectedSyll.updatesLog.map((log, lIdx) => (
                            <p key={lIdx} className="text-[11px] text-slate-500 font-mono leading-relaxed border-l-2 border-emerald-500 pl-2">
                              • {log}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSyll(null);
                          setIsEditingSyll(false);
                        }}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        {language === 'AZ' ? 'Bağla' : 'Close'}
                      </button>
                      {currentUser.role === 'head' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirm({
                                name: selectedSyll.name,
                                onConfirm: async () => {
                                  if (onDeleteSyllabus) {
                                    await onDeleteSyllabus(selectedSyll.id);
                                    setSelectedSyll(null);
                                  }
                                }
                              });
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {language === 'AZ' ? 'Sil' : 'Delete'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsEditingSyll(true)}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {language === 'AZ' ? 'Düzəliş et' : 'Edit'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

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
            onDelete={() => {
              setDeleteConfirm({
                name: selectedRefDoc.name,
                onConfirm: async () => {
                  await onDeleteReferenceDoc(selectedRefDoc.id);
                  setSelectedRefDoc(null);
                }
              });
            }}
          />
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
