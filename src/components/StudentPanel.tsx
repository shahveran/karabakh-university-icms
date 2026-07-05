import React, { useState } from 'react';
import { Program, Syllabus, SuggestionCase, User } from '../types';
import { useLanguage } from '../LanguageContext';
import { motion } from 'motion/react';
import { Send, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, MapPin, Layers, ChevronRight } from 'lucide-react';

interface StudentPanelProps {
  currentUser: User;
  programs: Program[];
  syllabi: Syllabus[];
  suggestions: SuggestionCase[];
  onSubmitSuggestion: (data: any) => Promise<void>;
}

export default function StudentPanel({
  currentUser,
  programs,
  syllabi,
  suggestions,
  onSubmitSuggestion
}: StudentPanelProps) {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');

  // Progress tracker: determines which stages are completed for a case
  const CaseProgressTracker = ({ item }: { item: SuggestionCase }) => {
    const isRejected = item.status === 'Rədd edildi';
    const isTerminal = item.status === 'Tətbiq olundu' || item.status === 'Qəbul edildi' || isRejected;

    // Determine completed stage index (0-indexed)
    let activeStage = 0; // Always at least "Sent"
    if (item.status !== 'Gözləmədə') activeStage = 1; // Head viewed / Under review
    if (item.assignedTeacherEmail) activeStage = 2;     // Forwarded to teacher
    if (item.teacherFeedbackStatus && item.teacherFeedbackStatus !== 'none') activeStage = 3; // Teacher wrote feedback
    if (isTerminal) activeStage = 4;                    // Final decision

    const azStages = ['Göndərildi', 'Rəhbər baxdı', 'Müəllimə', 'Rəy yazıldı', 'Nəticə'];
    const enStages = ['Sent', 'Reviewed', 'To Teacher', 'Feedback', 'Decision'];
    const stages = language === 'AZ' ? azStages : enStages;

    return (
      <div className="mt-2 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">
          {language === 'AZ' ? 'Mərhələ' : 'Progress'}
        </p>
        <div className="flex items-center gap-0.5">
          {stages.map((stage, idx) => {
            const done = idx <= activeStage;
            const isLast = idx === stages.length - 1;
            const lastColor = isRejected
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-emerald-600 text-white border-emerald-600';
            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 0, flex: 1 }}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${
                    done
                      ? (isLast ? lastColor : 'bg-emerald-600 text-white border-emerald-600')
                      : 'bg-white text-slate-300 border-slate-200'
                  }`}>
                    {done ? (isLast && isRejected ? '×' : '✓') : idx + 1}
                  </div>
                  <span className={`text-[9px] text-center leading-tight font-medium ${
                    done ? (isLast && isRejected ? 'text-red-600' : 'text-emerald-700') : 'text-slate-400'
                  }`} style={{ maxWidth: 44 }}>{stage}</span>
                </div>
                {!isLast && (
                  <div className={`h-0.5 flex-1 mt-[-10px] rounded ${
                    idx < activeStage ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };
  const activePrograms = programs.filter(p => !p.archived);
  const [type, setType] = useState('Tədris proqramındakı boşluq');
  const [selectedProgramId, setSelectedProgramId] = useState(activePrograms[0]?.id || '');
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filter syllabi based on selected program and ensure it's not archived
  const filteredSyllabi = syllabi.filter(s => s.programId === selectedProgramId && !s.archived);

  // Filter suggestions submitted by this student
  const studentSuggestions = suggestions.filter(
    s => s.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedProgramId) {
      setErrorMsg(language === 'AZ' ? 'Zəhmət olmasa, məcburi sahələri (Başlıq, Təsvir, Proqram) doldurun.' : 'Please fill in required fields (Title, Description, Program).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onSubmitSuggestion({
        authorType: 'student',
        authorEmail: currentUser.email,
        authorName: currentUser.name,
        title,
        type,
        programId: selectedProgramId,
        syllabusId: selectedSyllabusId || undefined,
        description
      });

      setSuccessMsg(language === 'AZ' ? 'Təklifiniz müvəffəqiyyətlə qeydə alındı və proqram rəhbərinə göndərildi!' : 'Your suggestion was successfully recorded and sent to the program head!');
      setTitle('');
      setDescription('');
      setSelectedSyllabusId('');
      
      // Auto clear success message
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'AZ' ? 'Təklif göndərilərkən xəta baş verdi.' : 'Error sending suggestion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Tətbiq olundu':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            {language === 'AZ' ? 'Tətbiq olundu' : 'Implemented'}
          </span>
        );
      case 'Qəbul edildi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            {language === 'AZ' ? 'Qəbul edildi' : 'Accepted'}
          </span>
        );
      case 'Baxılır':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {language === 'AZ' ? 'Baxılır' : 'Under Review'}
          </span>
        );
      case 'Rədd edildi':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            {language === 'AZ' ? 'Rədd edildi' : 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {language === 'AZ' ? 'Gözləmədə' : 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="student-panel-root">
      {/* Left Column: Form to submit suggestion */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm shadow-emerald-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Send className="w-5 h-5" id="student-send-icon" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {language === 'AZ' ? 'Yeni Təklif / Keys Göndər' : 'Submit Suggestion / Case'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'AZ' ? 'Tədris prosesinin mükəmməlləşdirilməsinə töhfə verin' : 'Contribute to optimizing the educational process'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-start gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {language === 'AZ' ? 'Təklifin Qısa Mövusu *' : 'Brief Topic of Suggestion *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={language === 'AZ' ? 'Məs. Ağdam məktəbində rəqəmsal lövhə istifadəsi...' : 'E.g. Digital whiteboard usage in Aghdam school...'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all text-slate-800 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {language === 'AZ' ? 'Təklif Növü *' : 'Suggestion Type *'}
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition-all bg-white text-slate-700 font-medium cursor-pointer"
                >
                  <option value="Tədris proqramındakı boşluq">
                    {language === 'AZ' ? 'Tədris boşluğu' : 'Curriculum gap'}
                  </option>
                  <option value="Müəssisədəki problem">
                    {language === 'AZ' ? 'Müəssisə problemi' : 'Institutional problem'}
                  </option>
                  <option value="Dərsdənkənar fəaliyyət">
                    {language === 'AZ' ? 'Dərsdənkənar təcrübə' : 'Extracurricular experience'}
                  </option>
                  <option value="Təklif">
                    {language === 'AZ' ? 'Ümumi Təklif' : 'General Suggestion'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {language === 'AZ' ? 'Tədris Proqramı *' : 'Curriculum Program *'}
                </label>
                <select
                  value={selectedProgramId}
                  onChange={e => {
                    setSelectedProgramId(e.target.value);
                    setSelectedSyllabusId(''); // Reset syllabus on program change
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition-all bg-white text-slate-700 font-semibold cursor-pointer"
                >
                  {activePrograms.map(prog => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name.length > 25 ? `${prog.name.slice(0, 25)}...` : prog.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {language === 'AZ' ? 'Əlaqəli Fənn (Sillabus)' : 'Related Course (Syllabus)'} <span className="text-slate-400 text-[10px] font-normal">({language === 'AZ' ? 'Könüllü' : 'Optional'})</span>
              </label>
              <select
                value={selectedSyllabusId}
                onChange={e => setSelectedSyllabusId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs transition-all bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="">{language === 'AZ' ? 'Fənn seçilməyib (Ümumi proqram rəyi)' : 'No subject chosen (General program review)'}</option>
                {filteredSyllabi.map(syll => (
                  <option key={syll.id} value={syll.id}>
                    {syll.code} ({syll.credits || 6} {language === 'AZ' ? 'Kredit' : 'ECTS'}) - {syll.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                {language === 'AZ' ? 'Keysin/Problemin Təsviri və Təklifiniz *' : 'Case/Problem Description & Suggestion *'}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder={language === 'AZ' ? 'Təcrübə zamanı qarşılaşdığınız boşluğu, problemi və ya Qarabağ bölgəsinin məktəblərinə faydalı ola biləcək təklifinizi ətraflı yazın...' : 'Describe in detail the gap or problem observed during internship, or your suggestion that could benefit schools in the Qarabağ region...'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all resize-none text-slate-800 font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-emerald-700/10 active:scale-95 disabled:opacity-50 cursor-pointer"
              id="student-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('pleaseWait')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {language === 'AZ' ? 'Pedaqoji Komitəyə Göndər' : 'Submit to Pedagogical Committee'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Informative widget linking to Karabakh reconstruction */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-emerald-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="font-bold text-white text-sm">
              {language === 'AZ' ? 'Bizim Missiyamız' : 'Our Mission'}
            </h3>
          </div>
          <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
            {language === 'AZ' 
              ? 'Qarabağ bölgəsində təhsil infrastrukturu ən müasir səviyyədə yenidən qurulur. Pedaqoji fakültənin tələbəsi olaraq sizin məktəblərdə keçdiyiniz təcrübələr və müşahidələr tədris proqramlarımızın daimi yenilənməsi üçün əvəzsizdir. Yazdığınız hər bir təklif real dərslikləri formalaşdırır!' 
              : 'The educational infrastructure in the Qarabağ region is being rebuilt to the highest standards. As a student of the Faculty of Pedagogy, your internships and observations in schools are invaluable for updating our curricula. Every suggestion you write helps shape actual educational resources!'}
          </p>
          <div className="flex items-center gap-4 pt-1.5 border-t border-emerald-800/50 text-[10px] text-emerald-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> {language === 'AZ' ? 'Şuşa • Ağdam • Xankəndi' : 'Shusha • Aghdam • Khankendi'}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" /> {language === 'AZ' ? 'Pedaqoji İnnovasiya' : 'Pedagogical Innovation'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: List of suggestions and outcomes */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800">
                {language === 'AZ' ? 'Sizin Göndərdiyiniz Təkliflər' : 'Suggestions Submitted By You'}
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
              {language === 'AZ' ? 'Cəmi' : 'Total'}: {studentSuggestions.length}
            </span>
          </div>

          {studentSuggestions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">
                {language === 'AZ' ? 'Hələ heç bir təklif daxil etməmisiniz.' : 'You have not submitted any suggestions yet.'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {language === 'AZ' 
                  ? 'Sol tərəfdəki form vasitəsilə ilk təklifinizi əlavə edərək Qarabağda təhsilin qurulmasına dəstək olun!' 
                  : 'Submit your first suggestion via the left form to support educational development in Qarabağ!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {studentSuggestions.map((item, idx) => {
                const associatedProgram = programs.find(p => p.id === item.programId);
                const associatedSyllabus = syllabi.find(s => s.id === item.syllabusId);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all space-y-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold uppercase tracking-wide">
                          {language === 'EN' && item.type === 'Tədris proqramındakı boşluq' ? 'Curriculum Gap' :
                           language === 'EN' && item.type === 'Müəssisədəki problem' ? 'Enterprise Problem' :
                           language === 'EN' && item.type === 'Dərsdənkənar fəaliyyət' ? 'Extracurricular experience' :
                           language === 'EN' && item.type === 'Təklif' ? 'General Suggestion' : item.type}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.title}</h3>
                      </div>
                      <div className="shrink-0">{getStatusBadge(item.status)}</div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 bg-white p-2.5 rounded-lg border border-slate-100/80">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
                      <span>{language === 'AZ' ? 'Proqram' : 'Program'}: <strong className="text-slate-600">{associatedProgram?.name}</strong></span>
                      {associatedSyllabus && (
                        <span>{language === 'AZ' ? 'Fənn' : 'Subject'}: <strong className="text-slate-600">{associatedSyllabus.code} - {associatedSyllabus.name}</strong></span>
                      )}
                      <span className="ml-auto text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString(language === 'AZ' ? 'az-AZ' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Feedback block from program manager if available */}
                    {(item.evaluation || item.actionTaken) && (
                      <div className="mt-3 p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-100/60 space-y-2">
                        {item.evaluation && (
                          <div className="text-xs text-slate-700">
                            <strong className="text-emerald-900 block mb-0.5">
                              {language === 'AZ' ? 'Rəhbərliyin Analizi və Rəyi:' : 'Management Analysis & Feedback:'}
                            </strong>
                            <p className="italic leading-relaxed">"{item.evaluation}"</p>
                          </div>
                        )}
                        {item.actionTaken && (
                          <div className="text-xs text-emerald-800 bg-emerald-100/40 p-2 rounded border border-emerald-100/80">
                            <strong className="text-emerald-950 flex items-center gap-1.5 mb-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              {language === 'AZ' ? 'Edilən Dəyişiklik (Sillabus/Kurikulum Yeniləndi):' : 'Action Taken (Syllabus/Curriculum Updated):'}
                            </strong>
                            <p className="font-semibold">{item.actionTaken}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress tracker */}
                    <CaseProgressTracker item={item} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
