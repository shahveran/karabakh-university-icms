export type UserRole = 'student' | 'enterprise' | 'head' | 'admin' | 'teacher' | 'observer';

export interface User {
  email: string;
  name: string;
  role: UserRole;
  details?: string;
  password?: string;
  approved?: boolean;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  status: string; // e.g., 'Güncəl' or 'Yenilənib'
  updatesLog: string[];
  totalCredits?: number;
  createdBy?: string;
  allowedHeads?: string[];
  archived?: boolean;
}

export interface Syllabus {
  id: string;
  programId: string;
  code: string;
  name: string;
  content: string;
  lastUpdated: string;
  updatesLog: string[];
  credits?: number;
  teacherEmail?: string;
  teacherEmails?: string[];
  archived?: boolean;
  description?: string;
  syllabusFiles?: string[];
  topics?: string[];
}

export interface SuggestionCase {
  id: string;
  authorType: 'student' | 'enterprise';
  authorEmail: string;
  authorName: string;
  title: string;
  type: string; // e.g. "Tədris boşluğu", "Müəssisə problemi", "Bazar tələbi", "Təcrübə qiymətləndirilməsi", "Təklif"
  programId: string;
  syllabusId?: string; // Optional specific course syllabus
  description: string;
  status: 'Gözləmədə' | 'Baxılır' | 'Qəbul edildi' | 'Rədd edildi' | 'Tətbiq olundu';
  createdAt: string;
  evaluation?: string; // Program head's feedback
  actionTaken?: string; // Specific change applied
  assignedTeacherEmail?: string; // Email of the teacher this is forwarded to
  teacherProposedChanges?: string; // Proposed changes written by the teacher
  teacherEvaluationNotes?: string; // Analysis/notes written by the teacher
  teacherFeedbackStatus?: 'none' | 'pending_review' | 'approved' | 'rejected'; // Status of teacher's feedback review
}

export interface ReferenceDocument {
  id: string;
  name: string; // e.g., 'Fakültə Təlimatları.docx'
  content: string; // Full extracted text content from the uploaded file
  htmlContent?: string; // HTML formatted content keeping lists, tables, bold text, etc.
  type: 'program' | 'syllabus' | 'general';
  associatedId?: string; // programId or syllabusId if applicable
  uploadedAt: string;
  fileSize?: string;
  uploadedBy?: string;
}

export interface Notification {
  id: string;
  userEmail: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AIAnalysisCache {
  key: string;         // hash of programId + syllabusId + sorted suggestionIds
  result: AIAnalysisResponse;
  cachedAt: string;    // ISO timestamp
  expiresAt: string;   // ISO timestamp (24h from cachedAt)
}

export interface DatabaseState {
  users: User[];
  programs: Program[];
  syllabi: Syllabus[];
  suggestions: SuggestionCase[];
  notifications: Notification[];
  referenceDocs?: ReferenceDocument[];
  aiAnalysisCache?: AIAnalysisCache[];
}

export interface AIAnalysisRequest {
  programId: string;
  syllabusId?: string;
  suggestionIds: string[];
}

export interface SpecificSectionModification {
  sectionName: string;
  action: 'Əlavə' | 'Dəyişiklik' | 'Yeniləmə';
  description: string;
  proposedText: string;
}

export interface ReferenceDocMatch {
  docId: string;
  docName: string;
  matchedSectionText: string; // The specific segment/paragraph from the reference document targeted for modification
  explanation: string; // Explanation of how the suggestion modifies this specific reference file content
}

export interface AIAnalysisResponse {
  evaluation: string;
  suggestedChanges: string[];
  karabakhContext: string;
  specificSectionModifications?: SpecificSectionModification[];
  referenceDocMatches?: ReferenceDocMatch[];
  title?: string;
  summary?: string;
  strategicGoals?: string[];
  newContent?: string;
}
