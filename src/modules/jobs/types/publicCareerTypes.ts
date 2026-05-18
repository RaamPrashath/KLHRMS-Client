export interface PublicCareerPosting {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  title: string;
  description: string;
  requirements: string | null;
  roleSummary: string | null;
  responsibilities: string | null;
  requirementsRich: string | null;
  benefits: string | null;
  aboutTeam: string | null;
  requisitionId: string | null;
  location: string | null;
  employmentType: string | null;
  openings: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  isRemote: boolean;
  targetDate: string | null;
  skills: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCareerApplicationResult {
  applicationId: string;
  candidateId: string;
  jobPostingId: string;
  organizationId: string;
  pipelineStageId: string;
}
