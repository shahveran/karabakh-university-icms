import React, { useState } from 'react';
import { Program, Syllabus, SuggestionCase, User, ReferenceDocument } from '../types';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, 
  Layers, BookOpen, Search, History, BarChart3, HelpCircle, 
  GraduationCap, Building2, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

interface ObserverPanelProps {
  currentUser: User;
  programs: Program[];
  syllabi: Syllabus[];
  suggestions: SuggestionCase[];
  users: User[];
  referenceDocs: ReferenceDocument[];
}

export default function ObserverPanel({
  currentUser,
  programs,
  syllabi,
  suggestions,
  users,
  referenceDocs
}: ObserverPanelProps) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'programs' | 'cases' | 'references'>('overview');
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState<'all' | 'student' | 'enterprise'>('all');
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('all');
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  
  // Selected Details Modal
  const [selectedSyllabus, setSelectedSyllabus] = useState<Syllabus | null>(null);
  const [selectedCase, setSelectedCase] = useState<SuggestionCase | null>(null);

  // Statistics calculation
  const totalPrograms = programs.length;
  const totalSyllabi = syllabi.length;
  const totalSuggestions = suggestions.length;
  const totalReferences = referenceDocs.length;
  
  const pendingCases = suggestions.filter(s => s.status === 'Gözləmədə').length;
  const reviewingCases = suggestions.filter(s => s.status === 'Baxılır').length;
  const approvedCases = suggestions.filter(s => s.status === 'Qəbul edildi').length;
  const appliedCases = suggestions.filter(s => s.status === 'Tətbiq olundu').length;
  
  const aiAlignmentPercentage = totalSuggestions > 0 
    ? Math.round(((appliedCases + approvedCases) / totalSuggestions) * 100)
    : 95; // default simulation alignment score if no suggestions

  const toggleProgram = (id: string) => {
    setExpandedProgramId(expandedProgramId === id ? null : id);
  };

  // Filtered lists
  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCases = suggestions.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAuthor = caseFilter === 'all' || c.authorType === caseFilter;
    const matchesStatus = caseStatusFilter === 'all' || c.status === caseStatusFilter;
    return matchesSearch && matchesAuthor && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden text-left">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                QS Reimagine Showcase
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                {language === 'AZ' ? 'Jüri / İzləyici Paneli' : 'Jury / Observer Mode'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-1 bg-gradient-to-r from-white via-indigo-100 to-slate-200 bg-clip-text text-transparent">
              {language === 'AZ' ? 'Qarabağ Universiteti ICMS Portal Monitorinqi' : 'Karabakh University ICMS Portal Monitor'}
            </h1>
            <p className="text-xs text-indigo-200/70 mt-1 max-w-2xl font-medium leading-relaxed">
              {language === 'AZ' 
                ? 'Bu panel yarışma münsifləri üçün xüsusi olaraq hazırlanıb. Sistemdə müəllimlər və proqram rəhbərlərinin fəaliyyətini, sənaye keyslərini və Gemini AI analitikasını tam izləyə bilərsiniz.'
                : 'This panel is customized for the QS Reimagine jury. Monitor real-time activities, syllabus audits, industrial cases, and Gemini AI alignment metrics.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 bg-slate-900/60 p-2.5 rounded-xl border border-indigo-950 shadow-inner">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            <div className="text-left">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">{language === 'AZ' ? 'AI UYĞUNLAŞMA REYTİNQİ' : 'AI ALIGNMENT RATE'}</p>
              <p className="text-lg font-black text-indigo-300">{aiAlignmentPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {language === 'AZ' ? 'Ümumi Hesabat (Overview)' : 'Overview'}
        </button>
        <button
          onClick={() => { setActiveTab('programs'); setSearchQuery(''); }}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'programs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {language === 'AZ' ? 'Proqramlar və Sillabuslar' : 'Programs & Syllabi'}
        </button>
        <button
          onClick={() => { setActiveTab('cases'); setSearchQuery(''); }}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'cases'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {language === 'AZ' ? 'Tələbə və Müəssisə Keysləri' : 'Student & Enterprise Cases'}
        </button>
        <button
          onClick={() => { setActiveTab('references'); setSearchQuery(''); }}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'references'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {language === 'AZ' ? 'Referans Standartları' : 'Reference Standards'}
        </button>
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-3 bg-indigo-50 rounded-bl-2xl">
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'İxtisas Proqramları' : 'Specialty Programs'}</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalPrograms}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{language === 'AZ' ? 'Fakültə üzrə aktiv ixtisaslar' : 'Active specialties'}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-3 bg-teal-50 rounded-bl-2xl">
                <BookOpen className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Fənn Sillabusları' : 'Subject Syllabi'}</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalSyllabi}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{language === 'AZ' ? 'Akademik fənn planları' : 'Academic course plans'}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-3 bg-amber-50 rounded-bl-2xl">
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Sənaye və Tələbə Keysləri' : 'Feedback Cases'}</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalSuggestions}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                <span className="text-emerald-600 font-bold">{appliedCases}</span> {language === 'AZ' ? 'tətbiq olunub' : 'applied'} • <span className="text-amber-500 font-bold">{pendingCases}</span> {language === 'AZ' ? 'gözləmədə' : 'pending'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-3 bg-violet-50 rounded-bl-2xl">
                <FileText className="w-4 h-4 text-violet-600" />
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{language === 'AZ' ? 'Referans Sənədlər' : 'Reference Documents'}</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalReferences}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{language === 'AZ' ? 'Dövlət standartları və təlimatlar' : 'State standards & guides'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Status Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">{language === 'AZ' ? 'Keyslərin İcra Vəziyyəti' : 'Feedback Loop Metrics'}</h3>
                <p className="text-[10px] text-slate-400">{language === 'AZ' ? 'Tələbə və müəssisələrdən gələn təkliflərin statusu' : 'Workflow status of received feedback cases'}</p>
              </div>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-slate-700">{language === 'AZ' ? 'Gözləmədə olan keyslər' : 'Pending Cases'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-black text-[10px]">{pendingCases}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-700">{language === 'AZ' ? 'Baxılmaqda olanlar' : 'Under Review'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-[10px]">{reviewingCases}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-slate-700">{language === 'AZ' ? 'Qəbul edilmiş (Analizə hazır)' : 'Accepted'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-[10px]">{approvedCases}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-emerald-800">{language === 'AZ' ? 'Sillabusa tətbiq edilənlər (AI)' : 'Applied to Syllabus'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">{appliedCases}</span>
                </div>
              </div>
            </div>

            {/* AI Capability info for QS Reimagine */}
            <div className="bg-gradient-to-br from-indigo-50 to-teal-50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
              <div>
                <h3 className="font-black text-indigo-950 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  {language === 'AZ' ? 'Munsiflər üçün: Təhsil Təsirinin Analizi' : 'QS Showcase: Education Impact Analytics'}
                </h3>
                <p className="text-[10px] text-indigo-950/60 mt-0.5">
                  {language === 'AZ' 
                    ? 'Qarabağ bölgəsində ixtisaslı müəllim kadrlarının hazırlanması prosesinin sənaye ehtiyacları ilə inteqrasiyası'
                    : 'Rebuilding pedagogical capacity in Karabakh through automatic industry-curriculum loops'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100/50 space-y-1">
                  <span className="text-[10px] font-extrabold text-indigo-700 tracking-wider uppercase block">{language === 'AZ' ? 'AVTOMATİK GERİ-ƏLAQƏ DÖVRÜ' : 'AUTOMATIC FEEDBACK LOOP'}</span>
                  <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                    {language === 'AZ' 
                      ? 'Pedaqoji təcrübədə olan tələbələr və Şuşa/Ağdam məktəbləri (müəssisələr) problemləri birbaşa sistemə daxil edirlər. Proqram rəhbəri və müəllim bu keysləri Gemini AI vasitəsilə dərhal təhlil edib rəsmi standartlarla uyğunlaşdırır və sillabusa inteqrasiya edir.'
                      : 'Internship students and schools input local education gaps. Platform automatically leverages Gemini to parse, map reference guides, and inject reforms directly into syllabus modules.'}
                  </p>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100/50 space-y-1">
                  <span className="text-[10px] font-extrabold text-teal-700 tracking-wider uppercase block">{language === 'AZ' ? 'YARIŞMA ÜSTÜNLÜKLƏRİ' : 'REIMAGINE HIGHLIGHTS'}</span>
                  <p className="text-slate-600 font-medium text-[11px] leading-relaxed">
                    {language === 'AZ' 
                      ? 'Ənənəvi olaraq 3-5 il çəkən tədris proqramı yenilənmələri bu platforma ilə cəmi bir neçə dəqiqəyə endirilib. Eyni zamanda dövlət təhsil standartları (referanslar) qorunmaqla pedaqoji keyfiyyət sığortalanır.'
                      : 'Curriculum updates that traditionally take 3-5 years are compressed into minutes. Official state curriculum standards (reference base) are protected through strict RAG compliance mechanisms.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: PROGRAMS & SYLLABI --- */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'AZ' ? 'Proqram və ya fənn axtar...' : 'Search programs or subjects...'}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'AZ' ? `${filteredPrograms.length} İxtisas Tapıldı` : `${filteredPrograms.length} Programs Found`}</span>
          </div>

          <div className="space-y-3">
            {filteredPrograms.map(program => {
              const programSyllabi = syllabi.filter(s => s.programId === program.id);
              const isExpanded = expandedProgramId === program.id;
              
              return (
                <div key={program.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all text-left">
                  <div 
                    onClick={() => toggleProgram(program.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                        <Layers className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{program.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {language === 'AZ' ? 'Kod:' : 'Code:'} <strong className="text-slate-600">{program.id}</strong> • {program.totalCredits || 240} ECTS • {programSyllabi.length} {language === 'AZ' ? 'Fənn' : 'Courses'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        {program.status || 'Güncəl'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-3"
                      >
                        <p className="text-xs text-slate-500 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100 max-w-4xl">
                          {program.description}
                        </p>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-widest pl-1">
                            {language === 'AZ' ? '• İXTİSAS FƏNLƏRİ (SİLLABUSLAR)' : '• SPECIALTY COURSES (SYLLABI)'}
                          </h4>
                          
                          {programSyllabi.length === 0 ? (
                            <p className="text-xs text-slate-400 italic pl-1">{language === 'AZ' ? 'Bu proqrama fənn əlavə edilməyib.' : 'No courses added under this program.'}</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {programSyllabi.map(syll => (
                                <div key={syll.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3 text-left">
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] text-slate-400 font-mono font-bold">{syll.code}</span>
                                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[9px] font-bold border border-slate-150">{syll.credits || 6} ECTS</span>
                                    </div>
                                    <h4 className="font-extrabold text-slate-800 text-xs mt-1 leading-snug line-clamp-1">{syll.name}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-normal font-sans font-medium">{syll.content}</p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      {syll.updatesLog && syll.updatesLog.length > 1 ? (
                                        <span className="text-[9px] text-emerald-700 flex items-center gap-0.5 font-bold">
                                          <History className="w-3 h-3" />
                                          {language === 'AZ' ? 'Yenilənib' : 'Updated'}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-slate-400">{language === 'AZ' ? 'İlkin versiya' : 'Initial version'}</span>
                                      )}
                                    </div>
                                    
                                    <button
                                      onClick={() => setSelectedSyllabus(syll)}
                                      className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg text-[9px] font-extrabold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3" />
                                      {language === 'AZ' ? 'Sillabusa Bax' : 'View Syllabus'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: CUSTOMER & STUDENT CASES --- */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'AZ' ? 'Keyslərdə və ya müəllif adlarında axtar...' : 'Search cases or authors...'}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
            </div>
            
            <div className="flex gap-2 items-center w-full md:w-auto">
              <select
                value={caseFilter}
                onChange={e => setCaseFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="all">{language === 'AZ' ? 'Bütün Mənbələr' : 'All Sources'}</option>
                <option value="student">{language === 'AZ' ? 'Tələbələr' : 'Students'}</option>
                <option value="enterprise">{language === 'AZ' ? 'Müəssisələr' : 'Enterprises'}</option>
              </select>

              <select
                value={caseStatusFilter}
                onChange={e => setCaseStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="all">{language === 'AZ' ? 'Bütün Statuslar' : 'All Statuses'}</option>
                <option value="Gözləmədə">{language === 'AZ' ? 'Gözləmədə' : 'Pending'}</option>
                <option value="Baxılır">{language === 'AZ' ? 'Baxılır' : 'Under Review'}</option>
                <option value="Qəbul edildi">{language === 'AZ' ? 'Qəbul edildi' : 'Accepted'}</option>
                <option value="Tətbiq olundu">{language === 'AZ' ? 'Tətbiq olundu' : 'Applied'}</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3">{language === 'AZ' ? 'Keys Başlığı' : 'Case Title'}</th>
                    <th className="p-3">{language === 'AZ' ? 'Müəllif' : 'Author'}</th>
                    <th className="p-3">{language === 'AZ' ? 'Növü' : 'Type'}</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">{language === 'AZ' ? 'Əməliyyat' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        {language === 'AZ' ? 'Axtarışa uyğun keys tapılmadı.' : 'No cases found matching your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map(c => {
                      let statusBadge = '';
                      if (c.status === 'Gözləmədə') statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                      else if (c.status === 'Baxılır') statusBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                      else if (c.status === 'Qəbul edildi') statusBadge = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                      else if (c.status === 'Tətbiq olundu') statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      else statusBadge = 'bg-red-50 text-red-800 border-red-200';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            <p className="font-extrabold text-slate-800 line-clamp-1">{c.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {c.id}</p>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {c.authorType === 'student' ? (
                                <GraduationCap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              <div>
                                <p className="font-bold text-slate-700">{c.authorName}</p>
                                <p className="text-[10px] text-slate-400">{c.authorEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] border border-slate-200">
                              {c.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusBadge}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedCase(c)}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
                            >
                              {language === 'AZ' ? 'Detallar' : 'View Case'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: REFERENCE STANDARDS --- */}
      {activeTab === 'references' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'AZ' ? 'Standart və ya sənəd axtar...' : 'Search guidelines or standards...'}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{language === 'AZ' ? `${referenceDocs.length} Sənəd Mövcuddur` : `${referenceDocs.length} Documents Available`}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {referenceDocs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(doc => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded text-[9px] font-black uppercase tracking-wider">
                      {doc.type === 'program' ? (language === 'AZ' ? 'İxtisas Proqramı' : 'Program Standard') : doc.type === 'syllabus' ? (language === 'AZ' ? 'Sillabus Təlimatı' : 'Syllabus Guideline') : (language === 'AZ' ? 'Ümumi Qayda' : 'General Instruction')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{doc.fileSize || 'N/A'}</span>
                  </div>
                  
                  <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-1">{doc.name}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-3 leading-normal font-sans font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 whitespace-pre-wrap">{doc.content}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{language === 'AZ' ? `Yükləyən: ${doc.uploadedBy || 'Sistem'}` : `By: ${doc.uploadedBy || 'System'}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- DETAIL MODAL 1: SYLLABUS DETAILS --- */}
      <AnimatePresence>
        {selectedSyllabus && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col justify-between overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase tracking-wider">{selectedSyllabus.code}</span>
                  <h3 className="font-extrabold text-slate-800 text-sm mt-1">{selectedSyllabus.name}</h3>
                </div>
                <button onClick={() => setSelectedSyllabus(null)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors font-bold">×</button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">{language === 'AZ' ? 'Fənnin Cari Təsviri və Mövzuları' : 'Current Syllabus Content & Topics'}</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
                    {selectedSyllabus.content}
                  </p>
                </div>

                {/* Updates Log timeline */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    {language === 'AZ' ? 'Təkmilləşdirmə və Dəyişiklik Tarixçəsi' : 'Revision & Audit Trail'}
                  </h4>

                  {selectedSyllabus.updatesLog && selectedSyllabus.updatesLog.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedSyllabus.updatesLog.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shrink-0 mt-1.5" />
                          <span className="text-[10px] text-slate-600 leading-normal font-medium">{log}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic pl-1">{language === 'AZ' ? 'Dəyişiklik qeydə alınmayıb.' : 'No revision logged.'}</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 text-right shrink-0">
                <button
                  onClick={() => setSelectedSyllabus(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  {language === 'AZ' ? 'Bağla' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DETAIL MODAL 2: CASE DETAILS & AI RESOLUTION --- */}
      <AnimatePresence>
        {selectedCase && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col justify-between overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase tracking-wider">{selectedCase.type}</span>
                  <h3 className="font-extrabold text-slate-800 text-sm mt-1">{selectedCase.title}</h3>
                </div>
                <button onClick={() => setSelectedCase(null)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-500 rounded-lg cursor-pointer transition-colors font-bold">×</button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Author Info */}
                <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{language === 'AZ' ? 'GÖNDƏRƏN MƏNBƏ' : 'SUBMISSION SOURCE'}</p>
                    <p className="font-extrabold text-slate-700">{selectedCase.authorName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{selectedCase.authorEmail}</p>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">{language === 'AZ' ? 'Geri-əlaqə Mətni (Problem/Təklif)' : 'Feedback Text (Problem/Proposal)'}</h4>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-150 whitespace-pre-wrap font-medium">
                    {selectedCase.description}
                  </p>
                </div>

                {/* AI & Pedagogy Evaluation */}
                <div className="space-y-1">
                  <h4 className="font-extrabold text-indigo-950 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {language === 'AZ' ? 'Pedaqoji və AI Qiymətləndirilməsi' : 'AI & Pedagogical Evaluation'}
                  </h4>
                  {selectedCase.evaluation ? (
                    <p className="text-slate-600 leading-relaxed bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 whitespace-pre-wrap font-medium">
                      {selectedCase.evaluation}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic pl-1">{language === 'AZ' ? 'Bu keys hələ ki, heç bir sillabusa tətbiq olunmayıb (təhlil gözləyir).' : 'This case is not yet mapped/applied to any syllabus module.'}</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 text-right shrink-0">
                <button
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  {language === 'AZ' ? 'Bağla' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
