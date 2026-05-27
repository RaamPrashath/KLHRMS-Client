export interface PipelineJobPosting {
  id: string;
  slug: string;
  title: string;
  status: string;
  requisitionId: string | null;
  candidateCount: number;
  stageCount: number;
  priority: string | null;
  openings: number | null;
}

export interface CandidateSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentTitle: string | null;
  totalExperience: string | null;
  resumeUrl: string | null;
  image: string | null;
}

export interface ApplicationInterviewMeeting {
  id: string;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  scheduledStartAt: string;
  scheduledEndAt: string;
  meetingUrl: string | null;
  interviewerName?: string | null;
  completedAt?: string | null;
}

export interface AiFailedKnockout {
  type?: string;
  required?: unknown;
  found?: unknown;
  missing?: unknown;
  evidence?: string | null;
}

export interface ResumeEvidenceFact {
  value: string;
  evidence: string;
  confidence: number;
}

export interface ResumeYearsExperienceFact {
  value: number;
  evidence: string;
  confidence: number;
}

export interface ResumeSkillEvidence {
  skill: string;
  normalizedSkill: string | null;
  evidence: string;
  confidence: number;
}

export interface ExtractedResumeFacts {
  candidateName?: ResumeEvidenceFact | null;
  targetRoleAlignment?: {
    matchesTargetRole: boolean;
    evidence: string;
    confidence: number;
  } | null;
  explicitKnockoutAssessment?: {
    passed: boolean;
    evidence: string;
    confidence: number;
  } | null;
  explicitKnockoutRule?: string | null;
  yearsExperience?: ResumeYearsExperienceFact | null;
  skills?: ResumeSkillEvidence[];
  degree?: ResumeEvidenceFact | null;
  certifications?: ResumeEvidenceFact[];
  warnings?: string[];
  overallConfidence?: number;
  rulesVersion?: string;
  rulesId?: string;
}

export interface CandidateResumeAnalysis {
  id: string;
  organizationId: string;
  applicationId: string;
  status: string;
  resumeUrl: string | null;
  resumeContentType: string | null;
  resumeFileType: string | null;
  resumeSizeBytes: number | null;
  firewallFlags: Array<Record<string, unknown>> | null;
  removedSuspiciousText: Array<Record<string, unknown>> | null;
  isFlaggedForCheating: boolean;
  parserWarnings: Array<Record<string, unknown>> | null;
  extractedFacts: ExtractedResumeFacts | null;
  compositeScore: number | null;
  rawScore: number | null;
  maxScore: number | null;
  evaluationStatus: string | null;
  failedKnockouts: AiFailedKnockout[] | null;
  scoreBreakdown: Record<string, unknown> | null;
  extractionConfidence: number | null;
  analysisVersion: string;
  attemptCount: number;
  lastError: string | null;
  analyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineApplication {
  id: string;
  jobPostingId: string;
  pipelineStageId: string;
  currentStage: string;
  candidate: CandidateSummary;
  source: string;
  appliedDate: string;
  lastMovedAt: string | null;
  status: string;
  resumeUrl: string | null;
  aiScore: number | null;
  aiAnalysisStatus: string | null;
  aiEvaluationStatus: string | null;
  isFlaggedForCheating: boolean;
  aiFailedKnockouts: AiFailedKnockout[];
  interviewMeeting: ApplicationInterviewMeeting | null;
  currentAssignment: StageWorkspaceAssignment | null;
}

export interface PipelineStage {
  id: string;
  jobPostingId: string;
  name: string;
  slug: string;
  order: number;
  color: string | null;
  isDefault: boolean;
  isFinal: boolean;
  isProtected: boolean;
  stageType: string;
  meetingEnabled: boolean;
  offerLetterEnabled: boolean;
  dueDate: string | null;
  completedAt: string | null;
  extendToNextWorkingDay: boolean;
  applications: PipelineApplication[];
}

export interface PipelineBoard {
  jobPostingId: string;
  stages: PipelineStage[];
}

export interface StageHistoryItem {
  id: string;
  fromStageId: string | null;
  fromStageName: string | null;
  toStageId: string;
  toStageName: string | null;
  movedByMemberId: string | null;
  movedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface CandidateApplicationNote {
  id: string;
  authorMemberId: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewParticipant {
  memberId: string;
  name: string;
  email: string | null;
  role: string | null;
  isBackup: boolean;
}

export interface InterviewFeedback {
  id: string;
  memberId: string;
  memberName: string;
  outcome: string;
  notes: string | null;
  createdAt: string;
}

export interface ApplicationInterviewEvent {
  id: string;
  stageId: string;
  stageName: string | null;
  title: string;
  status: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
  meetingUrl: string | null;
  createdByName: string | null;
  completedByName: string | null;
  participants: InterviewParticipant[];
  feedbacks: InterviewFeedback[];
  notes: string | null;
  createdAt: string;
}

export interface InterviewMeeting {
  id: string;
  applicationId: string;
  stageId: string;
  title: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  meetingUrl: string | null;
  googleCalendarEventId: string | null;
  googleCalendarEventUrl: string | null;
  emailSentAt: string | null;
  createdAt: string;
}

export interface CandidateApplicationDetail {
  id: string;
  jobPostingId: string;
  jobPostingTitle: string;
  pipelineStageId: string;
  currentStage: string;
  candidate: CandidateSummary;
  source: string;
  coverLetter: string | null;
  internalNotes: string | null;
  status: string;
  resumeUrl: string | null;
  appliedAt: string;
  lastActivityAt: string;
  stageHistory: StageHistoryItem[];
  interviewEvents: ApplicationInterviewEvent[];
  notes: CandidateApplicationNote[];
}

export interface StageWorkspaceInterviewer {
  memberId: string;
  name: string;
  email: string;
  department: string | null;
}

export interface StageWorkspaceAssignment {
  eventId: string;
  interviewer: StageWorkspaceInterviewer | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  meetLink: string | null;
  status: 'PENDING' | 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'SCHEDULED' | 'ONGOING' | 'REJECTED' | 'COMPLETED' | 'UNASSIGNED' | string;
  emailSentAt: string | null;
}

export interface StageWorkspaceCandidate {
  applicationId: string;
  candidate: CandidateSummary;
  jobTitle: string;
  source: string;
  appliedAt: string;
  currentAssignment: StageWorkspaceAssignment | null;
}

export interface StageWorkspace {
  stage: PipelineStage;
  jobPosting: PipelineJobPosting;
  candidateCount: number;
  candidates: StageWorkspaceCandidate[];
  teamMembers: StageWorkspaceInterviewer[];
  assignmentTeamId: string | null;
}

export interface InterviewerSearchResponse {
  items: StageWorkspaceInterviewer[];
}

export interface StageInterviewAssignment {
  applicationId: string;
  interviewerMemberId: string;
  scheduledStartAt?: string | null;
  durationMinutes: number;
  meetLink?: string | null;
}

export interface StageInterviewWarning {
  applicationId: string;
  interviewerMemberId: string;
  messages: string[];
}

export interface StageInterviewWarningResponse {
  warnings: StageInterviewWarning[];
}

export interface StageInterviewAssignmentResponse {
  assignedCount: number;
  warnings: StageInterviewWarning[];
}

export interface HiringTeamMember {
  id: string;
  memberId: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface HiringTeam {
  id: string;
  jobPostingId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  members: HiringTeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamDistributionRequest {
  hiringTeamId: string;
  strategy: 'ROUND_ROBIN';
  applicationIds: string[];
  scheduledStartAt?: string | null;
  durationMinutes: number;
  ignoreWarnings?: boolean;
}

export interface TeamDistributionResponse {
  assignedCount: number;
  warnings: StageInterviewWarning[];
}

export interface ReshuffleRequest {
  newInterviewerMemberId?: string;
}

export interface ReshuffleResponse {
  eventId: string;
  newInterviewerMemberId: string;
  warnings: StageInterviewWarning[];
}

export interface AcceptInterviewResponse {
  eventId: string;
  status: string;
  meeting: InterviewMeeting | null;
}

export interface RejectInterviewResponse {
  eventId: string;
  newInterviewerMemberId: string | null;
  status: 'ESCALATED' | 'UNASSIGNED';
  warnings: StageInterviewWarning[];
}

export interface MyInterview {
  eventId: string;
  applicationId: string;
  stageId: string;
  stageName: string;
  candidate: CandidateSummary;
  jobTitle: string;
  jobPostingId: string;
  jobSlug: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  status: string;
  role: 'INTERVIEWER';
  isBackup: boolean;
  meetingUrl: string | null;
  stageDueDate: string | null;
}

export interface MyInterviewListResponse {
  items: MyInterview[];
}
