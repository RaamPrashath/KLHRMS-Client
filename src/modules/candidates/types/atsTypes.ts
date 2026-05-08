export interface PipelineJobPosting {
  id: string;
  title: string;
  status: string;
}

export interface CandidateSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
}

export interface PipelineApplication {
  id: string;
  jobPostingId: string;
  pipelineStageId: string;
  currentStage: string;
  candidate: CandidateSummary;
  score: number | null;
  source: string;
  appliedDate: string;
  resumeUrl: string | null;
}

export interface PipelineStage {
  id: string;
  jobPostingId: string;
  name: string;
  order: number;
  color: string | null;
  isDefault: boolean;
  isFinal: boolean;
  isProtected: boolean;
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

export interface CandidateApplicationDetail {
  id: string;
  jobPostingId: string;
  jobPostingTitle: string;
  pipelineStageId: string;
  currentStage: string;
  candidate: CandidateSummary;
  source: string;
  score: number | null;
  notes: string | null;
  resumeUrl: string | null;
  appliedAt: string;
  lastActivityAt: string;
  stageHistory: StageHistoryItem[];
}
