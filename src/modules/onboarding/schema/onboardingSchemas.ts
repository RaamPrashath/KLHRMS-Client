import { z } from 'zod';

export const onboardingSendPayloadSchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1, 'Select at least one candidate'),
});

export const onboardingAssignCredentialsPayloadSchema = z.object({
  roleId: z.string().min(1, 'Select a role'),
  email: z.string().min(1, 'Enter an email').email('Invalid email'),
});

export const onboardingSubmitDocumentsPayloadSchema = z.object({
  aadharBase64: z.string().min(1, 'Aadhar card is required'),
  aadharFileName: z.string().optional(),
  panBase64: z.string().min(1, 'PAN card is required'),
  panFileName: z.string().optional(),
});

export interface OnboardingSendPayload {
  applicationIds: string[];
}

export interface OnboardingAssignCredentialsPayload {
  roleId: string;
  email: string;
}

export interface OnboardingSubmitDocumentsPayload {
  aadharBase64: string;
  aadharFileName?: string;
  panBase64: string;
  panFileName?: string;
}
