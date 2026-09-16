export interface Submission {
  id: string; repo: string; title: string; description: string; owner: string;
  path: string; url: string; createdAt: string; status: 'pending' | 'confirmed' | 'removed';
  images?: {path: string; alt: string}[]; mediaNote?: string; summary?: string[]; discord?: string;
  moderatedBy?: string; moderatedAt?: string;
}
export const SUBMISSIONS_PATH: string;
export function repositoryUrl(value: unknown): string;
export function submissionId(repo: string): string;
export function plainText(value: unknown, max: number): string;
export function markdownText(value: string): string;
export const TOOLKITS: [string, string][];
export function linkToolkits(escaped: string): string;
export function detectPlatform(...texts: (string | undefined)[]): string | undefined;
export function ownerProfile(record: Pick<Submission, 'repo' | 'owner'>): string;
export function submissionPage(record: Submission): string;
export function discordSubmission(text: string, attachments?: {url: string; name?: string; contentType?: string}[], discord?: string): {repo: string; description: string; name?: string; images?: {url: string; alt: string}[]; discord?: string} | null;
export function editLink(record: Pick<Submission, 'url'>, siteUrl?: string): string;
export function editNote(record: Pick<Submission, 'url' | 'owner'>, siteUrl?: string): string;
export function moderationPage(raw: string, record: Submission, decision: string): string;
