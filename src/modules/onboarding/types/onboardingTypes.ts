export interface OnboardingStageSummary {
  id: string;
  name: string;
  slug: string;
  stageType: string;
  order: number;
}

export interface OnboardingJobPostingSummary {
  id: string;
  slug: string;
  title: string;
}

export interface OnboardingCandidateSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  resumeUrl: string | null;
}

export interface OnboardingRecord {
  id: string;
  applicationId: string;
  status: string;
  aadharUrl: string | null;
  panUrl: string | null;
  assignedRoleId: string | null;
  assignedEmail: string | null;
  tokenSentAt: string | null;
  submittedAt: string | null;
  credentialsSentAt: string | null;
  credentialsEmailError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptedOnboardingCandidate {
  applicationId: string;
  candidate: OnboardingCandidateSummary;
  appliedAt: string;
  source: string;
  onboardingStatus: string;
  latestOnboarding: OnboardingRecord | null;
}

export interface AcceptedOnboardingWorkspace {
  stage: OnboardingStageSummary;
  jobPosting: OnboardingJobPostingSummary;
  candidateCount: number;
  candidates: AcceptedOnboardingCandidate[];
  onboardStage: OnboardingStageSummary | null;
}

export interface OnboardWorkspaceCandidate {
  applicationId: string;
  candidate: OnboardingCandidateSummary;
  appliedAt: string;
  source: string;
  onboardingStatus: string;
  onboardingRecordId: string | null;
  aadharUrl: string | null;
  panUrl: string | null;
  assignedRoleId: string | null;
  assignedEmail: string | null;
  credentialsSentAt: string | null;
  credentialsEmailError: string | null;
}

export interface OnboardWorkspace {
  stage: OnboardingStageSummary;
  jobPosting: OnboardingJobPostingSummary;
  candidateCount: number;
  candidates: OnboardWorkspaceCandidate[];
}

export interface OnboardingPublic {
  token: string;
  candidateName: string;
  jobTitle: string;
  organizationName: string;
  status: string;
  submittedAt: string | null;
}

export interface OnboardingSendResponse {
  requestedCount: number;
}

export interface OnboardingAssignCredentialsResponse {
  onboardingId: string;
  status: string;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  permissions: Record<string, unknown>;
}
