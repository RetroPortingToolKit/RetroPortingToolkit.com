export interface Submission {
  id: string; repo: string; title: string; description: string; owner: string;
  path: string; url: string; createdAt: string; status: 'pending' | 'confirmed' | 'removed';
  moderatedBy?: string; moderatedAt?: string;
}
export const SUBMISSIONS_PATH: string;
export function repositoryUrl(value: unknown): string;
export function submissionId(repo: string): string;
export function plainText(value: unknown, max: number): string;
export function markdownText(value: string): string;
export function submissionPage(record: Submission): string;
export function discordSubmission(text: string): {repo: string; description: string} | null;
export function moderationPage(raw: string, record: Submission, decision: string): string;
