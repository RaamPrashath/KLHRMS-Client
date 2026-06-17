import { http, HttpResponse } from "msw";
import type { PipelineApplication, PipelineBoard, PipelineJobPosting, PipelineStage } from "@/modules/candidates/types/atsTypes";
import type { PublicCareerApplicationResult } from "@/modules/jobs/types/publicCareerTypes";
import type { OnboardingPublic, AcceptedOnboardingWorkspace, OnboardWorkspace } from "@/modules/onboarding/types/onboardingTypes";
import type { OnboardingSendPayload, OnboardingSubmitDocumentsPayload } from "@/modules/onboarding/schema/onboardingSchemas";
import type { DocumentCollectionSendPayload, DocumentCollectionSubmitPayload } from "@/modules/document-collection/schema/documentCollectionSchemas";

const nowIso = "2026-06-10T06:30:00.000Z";

export interface PublicCandidateApplicationRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    linkedinUrl: string | null;
    resumeUrl: string;
    coverLetter: string | null;
}

export interface CandidateStageUpdateRequest {
    applicationId: string;
    body: {
        toStageId: string;
    };
    orgSlug: string | null;
    memberId: string | null;
}

export const recruitmentRequests: {
    publicApplications: PublicCandidateApplicationRequest[];
    pipelineQueries: URLSearchParams[];
    statusUpdates: CandidateStageUpdateRequest[];
    onboardingSends: OnboardingSendPayload[];
    onboardingDocumentSubmissions: OnboardingSubmitDocumentsPayload[];
    documentCollectionSends: DocumentCollectionSendPayload[];
    documentCollectionSubmissions: DocumentCollectionSubmitPayload[];
} = {
    publicApplications: [],
    pipelineQueries: [],
    statusUpdates: [],
    onboardingSends: [],
    onboardingDocumentSubmissions: [],
    documentCollectionSends: [],
    documentCollectionSubmissions: [],
};

export function resetRecruitmentRequests() {
    recruitmentRequests.publicApplications = [];
    recruitmentRequests.pipelineQueries = [];
    recruitmentRequests.statusUpdates = [];
    recruitmentRequests.onboardingSends = [];
    recruitmentRequests.onboardingDocumentSubmissions = [];
    recruitmentRequests.documentCollectionSends = [];
    recruitmentRequests.documentCollectionSubmissions = [];
}

const mockJobPosting: PipelineJobPosting = {
    id: "job_frontend_senior",
    slug: "senior-frontend-engineer",
    title: "Senior Frontend Engineer",
    status: "ACTIVE",
    requisitionId: "req_frontend_senior",
    candidateCount: 2,
    stageCount: 3,
    priority: "HIGH",
    openings: 2,
};

const appliedApplication: PipelineApplication = {
    id: "application_applied_1",
    jobPostingId: mockJobPosting.id,
    pipelineStageId: "stage_applied",
    currentStage: "Applied",
    candidate: {
        id: "candidate_priya",
        firstName: "Priya",
        lastName: "Nair",
        email: "priya.nair@example.com",
        phone: "+91 98765 43210",
        linkedinUrl: "https://linkedin.com/in/priyanair",
        portfolioUrl: null,
        currentCompany: "Acme",
        currentTitle: "Frontend Engineer",
        totalExperience: "5 years",
        resumeUrl: "https://cdn.example.com/priya-resume.pdf",
        image: null,
    },
    source: "CAREERS",
    appliedDate: "2026-06-08T04:30:00.000Z",
    lastMovedAt: null,
    status: "ACTIVE",
    resumeUrl: "https://cdn.example.com/priya-resume.pdf",
    aiScore: 82,
    aiAnalysisStatus: "COMPLETED",
    aiEvaluationStatus: "QUALIFIED",
    isFlaggedForCheating: false,
    aiFailedKnockouts: [],
    interviewMeeting: null,
    currentAssignment: null,
};

const rejectedApplication: PipelineApplication = {
    id: "application_rejected_1",
    jobPostingId: mockJobPosting.id,
    pipelineStageId: "stage_rejected",
    currentStage: "Rejected",
    candidate: {
        id: "candidate_rohan",
        firstName: "Rohan",
        lastName: "Mehta",
        email: "rohan.mehta@example.com",
        phone: null,
        linkedinUrl: null,
        portfolioUrl: null,
        currentCompany: null,
        currentTitle: null,
        totalExperience: null,
        resumeUrl: "https://cdn.example.com/rohan-resume.pdf",
        image: null,
    },
    source: "REFERRAL",
    appliedDate: "2026-06-07T04:30:00.000Z",
    lastMovedAt: "2026-06-09T04:30:00.000Z",
    status: "REJECTED",
    resumeUrl: "https://cdn.example.com/rohan-resume.pdf",
    aiScore: 45,
    aiAnalysisStatus: "COMPLETED",
    aiEvaluationStatus: "REJECTED",
    isFlaggedForCheating: false,
    aiFailedKnockouts: [],
    interviewMeeting: null,
    currentAssignment: null,
};

const stageApplied: PipelineStage = {
    id: "stage_applied",
    jobPostingId: mockJobPosting.id,
    name: "Applied",
    slug: "applied",
    order: 1,
    color: null,
    isDefault: true,
    isFinal: false,
    isProtected: true,
    stageType: "APPLIED",
    meetingEnabled: false,
    offerLetterEnabled: false,
    dueDate: null,
    completedAt: null,
    extendToNextWorkingDay: false,
    applications: [appliedApplication],
};

const stageInterviewing: PipelineStage = {
    id: "stage_interviewing",
    jobPostingId: mockJobPosting.id,
    name: "Interviewing",
    slug: "interviewing",
    order: 2,
    color: null,
    isDefault: false,
    isFinal: false,
    isProtected: false,
    stageType: "INTERVIEW",
    meetingEnabled: true,
    offerLetterEnabled: false,
    dueDate: null,
    completedAt: null,
    extendToNextWorkingDay: false,
    applications: [],
};

const stageRejected: PipelineStage = {
    id: "stage_rejected",
    jobPostingId: mockJobPosting.id,
    name: "Rejected",
    slug: "rejected",
    order: 3,
    color: null,
    isDefault: false,
    isFinal: true,
    isProtected: false,
    stageType: "REJECTED",
    meetingEnabled: false,
    offerLetterEnabled: false,
    dueDate: null,
    completedAt: null,
    extendToNextWorkingDay: false,
    applications: [rejectedApplication],
};

export const recruitmentPipelineBoard: PipelineBoard = {
    jobPostingId: mockJobPosting.id,
    stages: [stageApplied, stageInterviewing, stageRejected],
};

export const acceptedOnboardingWorkspace: AcceptedOnboardingWorkspace = {
    stage: {
        id: "stage_hired",
        name: "Accepted",
        slug: "accepted",
        stageType: "HIRED",
        order: 5,
    },
    jobPosting: {
        id: mockJobPosting.id,
        slug: mockJobPosting.slug,
        title: mockJobPosting.title,
    },
    candidateCount: 2,
    candidates: [
        {
            applicationId: "application_onboard_unsent",
            candidate: {
                id: "candidate_meera",
                firstName: "Meera",
                lastName: "Iyer",
                email: "meera.iyer@example.com",
                resumeUrl: null,
            },
            appliedAt: "2026-06-01T04:30:00.000Z",
            source: "CAREERS",
            onboardingStatus: "UNSENT",
            latestOnboarding: null,
            latestDocumentCollection: null,
        },
        {
            applicationId: "application_onboard_submitted",
            candidate: {
                id: "candidate_dev",
                firstName: "Dev",
                lastName: "Kapoor",
                email: "dev.kapoor@example.com",
                resumeUrl: null,
            },
            appliedAt: "2026-06-02T04:30:00.000Z",
            source: "REFERRAL",
            onboardingStatus: "DOCUMENTS_SUBMITTED",
            latestDocumentCollection: {
                id: "doc_request_dev",
                templateId: "doc_template_standard",
                templateName: "Joining documents",
                status: "SUBMITTED",
                tokenSentAt: "2026-06-08T04:30:00.000Z",
                submittedAt: "2026-06-09T04:30:00.000Z",
                emailError: null,
                createdAt: nowIso,
            },
            latestOnboarding: {
                id: "onboarding_dev",
                applicationId: "application_onboard_submitted",
                status: "DOCUMENTS_SUBMITTED",
                aadharUrl: "https://cdn.example.com/aadhar.pdf",
                panUrl: "https://cdn.example.com/pan.pdf",
                assignedRoleId: null,
                assignedEmail: null,
                tokenSentAt: "2026-06-08T04:30:00.000Z",
                submittedAt: "2026-06-09T04:30:00.000Z",
                credentialsSentAt: null,
                credentialsEmailError: null,
                createdAt: nowIso,
                updatedAt: nowIso,
            },
        },
    ],
    onboardStage: {
        id: "stage_onboarding",
        name: "Onboarding",
        slug: "onboarding",
        stageType: "ONBOARDING",
        order: 6,
    },
};

export const onboardWorkspace: OnboardWorkspace = {
    stage: {
        id: "stage_onboarding",
        name: "Onboarding",
        slug: "onboarding",
        stageType: "ONBOARDING",
        order: 6,
    },
    jobPosting: {
        id: mockJobPosting.id,
        slug: mockJobPosting.slug,
        title: mockJobPosting.title,
    },
    candidateCount: 1,
    candidates: [
        {
            applicationId: "application_onboard_submitted",
            candidate: {
                id: "candidate_dev",
                firstName: "Dev",
                lastName: "Kapoor",
                email: "dev.kapoor@example.com",
                resumeUrl: null,
            },
            appliedAt: "2026-06-02T04:30:00.000Z",
            source: "REFERRAL",
            onboardingStatus: "DOCUMENTS_SUBMITTED",
            onboardingRecordId: "onboarding_dev",
            aadharUrl: "https://cdn.example.com/aadhar.pdf",
            panUrl: "https://cdn.example.com/pan.pdf",
            assignedRoleId: null,
            assignedEmail: null,
            credentialsSentAt: null,
            credentialsEmailError: null,
        },
    ],
};

export const publicOnboarding: OnboardingPublic = {
    token: "onboarding_token_123",
    candidateName: "Meera Iyer",
    jobTitle: mockJobPosting.title,
    organizationName: "Kovan Labs",
    status: "PENDING",
    submittedAt: null,
};

export const documentCollectionTemplate = {
    id: "doc_template_standard",
    organizationId: "org_01",
    name: "Joining documents",
    description: "Collect joining details and files.",
    status: "ACTIVE",
    lastUsedAt: null,
    createdByMemberId: "member_hr",
    updatedByMemberId: "member_hr",
    createdAt: nowIso,
    updatedAt: nowIso,
    fieldCount: 3,
    fields: [
        {
            id: "field_resume",
            organizationId: "org_01",
            templateId: "doc_template_standard",
            fieldType: "FILE_UPLOAD",
            name: "Signed declaration",
            description: null,
            required: true,
            order: 1,
            allowedFormatGroup: "FILE",
            maxSizeBytes: 10 * 1024 * 1024,
            createdAt: nowIso,
            updatedAt: nowIso,
        },
        {
            id: "field_address",
            organizationId: "org_01",
            templateId: "doc_template_standard",
            fieldType: "LONG_TEXT",
            name: "Current address",
            description: null,
            required: true,
            order: 2,
            allowedFormatGroup: "ALL",
            maxSizeBytes: null,
            createdAt: nowIso,
            updatedAt: nowIso,
        },
        {
            id: "field_joining",
            organizationId: "org_01",
            templateId: "doc_template_standard",
            fieldType: "DATE",
            name: "Preferred joining date",
            description: null,
            required: false,
            order: 3,
            allowedFormatGroup: "ALL",
            maxSizeBytes: null,
            createdAt: nowIso,
            updatedAt: nowIso,
        },
    ],
} as const;

export const publicDocumentCollection = {
    token: "document_collection_token_123",
    candidateName: "Meera Iyer",
    jobTitle: mockJobPosting.title,
    organizationName: "Kovan Labs",
    status: "PENDING",
    submittedAt: null,
    template: {
        id: documentCollectionTemplate.id,
        name: documentCollectionTemplate.name,
        description: documentCollectionTemplate.description,
        fields: documentCollectionTemplate.fields.map((field) => ({
            id: field.id,
            fieldType: field.fieldType,
            name: field.name,
            description: field.description,
            required: field.required,
            order: field.order,
            allowedFormatGroup: field.allowedFormatGroup,
            maxSizeBytes: field.maxSizeBytes,
        })),
    },
} as const;

function isPublicApplicationRequest(body: unknown): body is PublicCandidateApplicationRequest {
    if (typeof body !== "object" || body === null) return false;
    const value = body as Record<string, unknown>;
    return (
        typeof value.firstName === "string" &&
        typeof value.lastName === "string" &&
        typeof value.email === "string" &&
        typeof value.resumeUrl === "string"
    );
}

export const recruitmentHandlers = [
    http.get("*/candidates/pipeline/postings", () =>
        HttpResponse.json([mockJobPosting], { status: 200 }),
    ),

    http.get("*/candidates/pipeline", ({ request }) => {
        const url = new URL(request.url);
        recruitmentRequests.pipelineQueries.push(url.searchParams);
        return HttpResponse.json(recruitmentPipelineBoard, { status: 200 });
    }),

    http.patch("*/candidates/applications/:applicationId/stage", async ({ params, request }) => {
        const body = (await request.json()) as { toStageId?: unknown };
        const applicationId = String(params.applicationId);
        if (typeof body.toStageId !== "string" || !body.toStageId.trim()) {
            return HttpResponse.json({ detail: "toStageId is required" }, { status: 422 });
        }

        recruitmentRequests.statusUpdates.push({
            applicationId,
            body: { toStageId: body.toStageId },
            orgSlug: request.headers.get("x-organization-slug"),
            memberId: request.headers.get("x-membership-id"),
        });

        const targetStage = recruitmentPipelineBoard.stages.find((stage) => stage.id === body.toStageId);
        const application = recruitmentPipelineBoard.stages
            .flatMap((stage) => stage.applications)
            .find((item) => item.id === applicationId);

        if (!targetStage || !application) {
            return HttpResponse.json({ detail: "Application or stage was not found" }, { status: 404 });
        }

        return HttpResponse.json(
            {
                ...application,
                pipelineStageId: targetStage.id,
                currentStage: targetStage.name,
                lastMovedAt: nowIso,
            } satisfies PipelineApplication,
            { status: 200 },
        );
    }),

    http.post("*/jobs/public/postings/:jobId/apply", async ({ request }) => {
        const body = await request.json();
        if (!isPublicApplicationRequest(body) || !body.email.includes("@") || !body.resumeUrl) {
            return HttpResponse.json({ detail: "Invalid candidate application payload" }, { status: 422 });
        }

        recruitmentRequests.publicApplications.push(body);

        const response: PublicCareerApplicationResult = {
            applicationId: "application_new_public",
            candidateId: "candidate_new_public",
            jobPostingId: "job_frontend_senior",
            organizationId: "org_01",
            pipelineStageId: "stage_applied",
        };

        return HttpResponse.json(response, { status: 201 });
    }),

    http.get("*/onboarding/pipeline/jobs/:jobSlug/stages/:stageSlug/workspace", () =>
        HttpResponse.json(acceptedOnboardingWorkspace, { status: 200 }),
    ),

    http.get("*/onboarding/pipeline/jobs/:jobSlug/stages/:stageSlug/onboard-workspace", () =>
        HttpResponse.json(onboardWorkspace, { status: 200 }),
    ),

    http.post("*/onboarding/pipeline/jobs/:jobSlug/stages/:stageSlug/send-requests", async ({ request }) => {
        const body = (await request.json()) as OnboardingSendPayload;
        if (!Array.isArray(body.applicationIds) || body.applicationIds.length === 0) {
            return HttpResponse.json({ detail: "Select at least one candidate" }, { status: 422 });
        }

        recruitmentRequests.onboardingSends.push(body);
        return HttpResponse.json({ requestedCount: body.applicationIds.length }, { status: 200 });
    }),

    http.get("*/document-collection/templates", () =>
        HttpResponse.json([
            {
                id: documentCollectionTemplate.id,
                organizationId: documentCollectionTemplate.organizationId,
                name: documentCollectionTemplate.name,
                description: documentCollectionTemplate.description,
                status: documentCollectionTemplate.status,
                lastUsedAt: documentCollectionTemplate.lastUsedAt,
                createdAt: documentCollectionTemplate.createdAt,
                updatedAt: documentCollectionTemplate.updatedAt,
                fieldCount: documentCollectionTemplate.fieldCount,
            },
        ], { status: 200 }),
    ),

    http.post("*/document-collection/templates", async ({ request }) => {
        const body = await request.json() as { name?: string };
        return HttpResponse.json({ ...documentCollectionTemplate, id: "doc_template_new", name: body.name || "Untitled document collection", status: "DRAFT" }, { status: 200 });
    }),

    http.get("*/document-collection/templates/:templateId", () =>
        HttpResponse.json(documentCollectionTemplate, { status: 200 }),
    ),

    http.patch("*/document-collection/templates/:templateId", async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ ...documentCollectionTemplate, ...body }, { status: 200 });
    }),

    http.post("*/document-collection/templates/:templateId/copy", () =>
        HttpResponse.json({ ...documentCollectionTemplate, id: "doc_template_copy", name: "Joining documents - Copy", status: "DRAFT" }, { status: 200 }),
    ),

    http.delete("*/document-collection/templates/:templateId", () =>
        new HttpResponse(null, { status: 204 }),
    ),

    http.post("*/document-collection/pipeline/jobs/:jobSlug/stages/:stageSlug/send-requests", async ({ request }) => {
        const body = (await request.json()) as DocumentCollectionSendPayload;
        if (!body.templateId || !Array.isArray(body.applicationIds) || body.applicationIds.length === 0) {
            return HttpResponse.json({ detail: "Select a document collection template and candidates" }, { status: 422 });
        }

        recruitmentRequests.documentCollectionSends.push(body);
        return HttpResponse.json({ requestedCount: body.applicationIds.length }, { status: 200 });
    }),

    http.get("*/document-collection/requests/:requestId", () =>
        HttpResponse.json({
            id: "doc_request_dev",
            templateId: documentCollectionTemplate.id,
            templateName: documentCollectionTemplate.name,
            status: "SUBMITTED",
            tokenSentAt: "2026-06-08T04:30:00.000Z",
            submittedAt: "2026-06-09T04:30:00.000Z",
            emailError: null,
            createdAt: nowIso,
            templateSnapshotJson: publicDocumentCollection.template,
            answersJson: {
                answers: [
                    { fieldId: "field_address", fieldType: "LONG_TEXT", name: "Current address", value: "Coimbatore" },
                    { fieldId: "field_resume", fieldType: "FILE_UPLOAD", name: "Signed declaration", fileName: "declaration.pdf", url: "https://cdn.example.com/declaration.pdf" },
                ],
            },
        }, { status: 200 }),
    ),

    http.get("*/public/onboarding/:token", () =>
        HttpResponse.json(publicOnboarding, { status: 200 }),
    ),

    http.post("*/public/onboarding/:token/submit", async ({ request }) => {
        const body = (await request.json()) as OnboardingSubmitDocumentsPayload;
        if (!body.aadharBase64 || !body.panBase64) {
            return HttpResponse.json({ detail: "Both Aadhar and PAN files are required" }, { status: 422 });
        }

        recruitmentRequests.onboardingDocumentSubmissions.push(body);
        return HttpResponse.json(
            { status: "DOCUMENTS_SUBMITTED", message: "Documents submitted successfully" },
            { status: 200 },
        );
    }),

    http.get("*/public/document-collection/:token", () =>
        HttpResponse.json(publicDocumentCollection, { status: 200 }),
    ),

    http.post("*/public/document-collection/:token/submit", async ({ request }) => {
        const body = (await request.json()) as DocumentCollectionSubmitPayload;
        recruitmentRequests.documentCollectionSubmissions.push(body);
        return HttpResponse.json(
            { status: "SUBMITTED", message: "Document collection submitted successfully" },
            { status: 200 },
        );
    }),
];
