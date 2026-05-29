export interface OfferStageSummary {
  id: string;
  name: string;
  slug: string;
  stageType: string;
  order: number;
}

export interface OfferJobPostingSummary {
  id: string;
  slug: string;
  title: string;
  requisitionId: string | null;
}

export interface OfferCandidateSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  resumeUrl: string | null;
}

export interface OfferEligibility {
  canSend: boolean;
  errors: string[];
  warnings: string[];
}

export interface OfferLetter {
  id: string;
  organizationId: string;
  applicationId: string;
  batchId: string | null;
  templateId: string | null;
  templateCategoryId: string | null;
  stageId: string | null;
  status: string;
  title: string;
  message: string | null;
  salary: number | null;
  currency: string;
  joiningDate: string | null;
  expiresAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  candidateToken: string | null;
  pdfUrl: string | null;
  renderedHtml: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  fileName: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  responseIgnoredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferWorkspaceCandidate {
  applicationId: string;
  candidate: OfferCandidateSummary;
  appliedAt: string;
  source: string;
  offerStatus: string;
  latestOffer: OfferLetter | null;
  eligibility: OfferEligibility;
}

export interface OfferTemplateCategory {
  id: string;
  organizationId: string;
  templateId: string;
  name: string;
  slug: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfferTemplateSection {
  id: string;
  organizationId: string;
  templateId: string;
  categoryId: string;
  sectionKey: string;
  sectionName: string;
  order: number;
  tiptapJson: Record<string, unknown>;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferTemplateListItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  logoUrl: string | null;
  signatureUrl: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryNames: string[];
}

export interface OfferTemplate extends Omit<OfferTemplateListItem, 'categoryNames'> {
  footerHtml: string | null;
  websiteUrl: string | null;
  createdByMemberId: string | null;
  updatedByMemberId: string | null;
  categories: OfferTemplateCategory[];
  sections: OfferTemplateSection[];
}

export interface OfferStageWorkspace {
  stage: OfferStageSummary;
  jobPosting: OfferJobPostingSummary;
  candidateCount: number;
  candidates: OfferWorkspaceCandidate[];
  templates: OfferTemplateListItem[];
  recentTemplate: OfferTemplateListItem | null;
  latestBatch: OfferDispatchBatch | null;
  acceptedStage: OfferStageSummary | null;
  rejectedStage: OfferStageSummary | null;
  jobHasSalaryData?: boolean;
}

export interface OfferCandidateValidationResult {
  applicationId: string;
  candidate: OfferCandidateSummary | null;
  eligibility: OfferEligibility;
}

export interface OfferCandidateValidationResponse {
  validCandidates: OfferCandidateValidationResult[];
  blockedCandidates: OfferCandidateValidationResult[];
  warnings: string[];
}

export interface OfferDispatchBatch {
  id: string;
  organizationId: string;
  jobPostingId: string;
  stageId: string | null;
  templateId: string | null;
  templateCategoryId: string | null;
  status: string;
  candidateCount: number;
  successCount: number;
  failureCount: number;
  createdByMemberId: string | null;
  createdAt: string;
  completedAt: string | null;
  errorSummary: string | null;
}

export interface OfferDispatchCreateResponse {
  batch: OfferDispatchBatch | null;
  queuedOfferLetters: OfferLetter[];
  blockedCandidates: OfferCandidateValidationResult[];
}

export interface OfferDispatchBatchDetail {
  batch: OfferDispatchBatch;
  offerLetters: OfferLetter[];
}

export interface OfferApplicationLetters {
  applicationId: string;
  offerLetters: OfferLetter[];
}
