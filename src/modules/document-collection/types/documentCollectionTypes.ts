export type DocumentCollectionFieldType = 'FILE_UPLOAD' | 'SHORT_TEXT' | 'LONG_TEXT' | 'DATE';
export type DocumentCollectionAllowedFormatGroup = 'IMAGE' | 'FILE' | 'VIDEO' | 'ALL';

export interface DocumentCollectionField {
  id: string;
  organizationId: string;
  templateId: string;
  fieldType: DocumentCollectionFieldType;
  name: string;
  description: string | null;
  required: boolean;
  order: number;
  allowedFormatGroup: DocumentCollectionAllowedFormatGroup;
  maxSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCollectionFieldInput {
  id?: string | null;
  fieldType: DocumentCollectionFieldType;
  name: string;
  description?: string | null;
  required: boolean;
  order?: number | null;
  allowedFormatGroup?: DocumentCollectionAllowedFormatGroup;
  maxSizeBytes?: number | null;
}

export interface DocumentCollectionTemplateListItem {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fieldCount: number;
}

export interface DocumentCollectionTemplate extends Omit<DocumentCollectionTemplateListItem, 'fieldCount'> {
  createdByMemberId: string | null;
  updatedByMemberId: string | null;
  fields: DocumentCollectionField[];
}

export interface DocumentCollectionRequestSummary {
  id: string;
  templateId: string | null;
  templateName: string;
  status: string;
  tokenSentAt: string | null;
  submittedAt: string | null;
  emailError: string | null;
  createdAt: string;
}

export interface DocumentCollectionRequestDetail extends DocumentCollectionRequestSummary {
  templateSnapshotJson: DocumentCollectionPublicTemplate;
  answersJson: {
    answers?: Array<{
      fieldId: string;
      fieldType: DocumentCollectionFieldType;
      name: string;
      value?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      url?: string;
      bucket?: string;
      path?: string;
    }>;
  } | null;
}

export interface DocumentCollectionPublicTemplate {
  id: string;
  name: string;
  description: string | null;
  fields: Array<{
    id: string;
    fieldType: DocumentCollectionFieldType;
    name: string;
    description: string | null;
    required: boolean;
    order: number;
    allowedFormatGroup: DocumentCollectionAllowedFormatGroup;
    maxSizeBytes: number | null;
  }>;
}

export interface DocumentCollectionPublic {
  token: string;
  candidateName: string;
  jobTitle: string;
  organizationName: string;
  status: string;
  submittedAt: string | null;
  template: DocumentCollectionPublicTemplate;
}
