export type ResumeParserTemplate = 'default' | 'ncs' | 'rsc';

export interface ResumeParserFile {
  originalFilename: string;
  jsonUrl: string | null;
  docxUrl: string | null;
  status: 'success' | 'failed';
  messages: string[];
}

export interface ResumeParserProcessResponse {
  processedFiles: ResumeParserFile[];
}

export interface ResumeParserHistoryItem {
  id: string;
  uploaderName: string | null;
  originalFilename: string;
  jsonUrl: string | null;
  docxUrl: string | null;
  status: 'success' | 'failed';
  messages: string[];
  createdAt: string;
}

export interface ResumeParserHistoryResponse {
  scope: 'self' | 'organization';
  items: ResumeParserHistoryItem[];
}
