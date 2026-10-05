export function referencedAssets(body: string): string[];
export function missingAssets(body: string, present?: string[]): string[];
export function contentProblem(input: { body: string; assets?: string[]; frontmatter?: string }): string | null;
