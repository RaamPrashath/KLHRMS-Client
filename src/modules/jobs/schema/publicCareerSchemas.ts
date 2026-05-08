import { z } from 'zod';

export const publicCareerApplicationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(255, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(255, 'Last name is too long'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(50, 'Phone number is too long').optional().or(z.literal('')),
  linkedinUrl: z.union([
    z.url('Enter a valid LinkedIn URL'),
    z.literal(''),
  ]),
  coverLetter: z.string().max(5000, 'Notes are too long').optional().or(z.literal('')),
  resumeFile: z.custom<File | null>((value) => value instanceof File, {
    message: 'Resume is required',
  }).refine((file) => file == null || file.size <= 5 * 1024 * 1024, {
    message: 'Resume must be 5 MB or smaller',
  }).refine((file) => {
    if (file == null) return false;
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type);
  }, {
    message: 'Resume must be a PDF, DOC, or DOCX file',
  }),
});

export interface PublicCareerApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  resumeUrl: string;
  coverLetter?: string;
}

export interface PublicCareerApplicationFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  coverLetter: string;
  resumeFile: File | null;
}
