export interface MediaCandidate { url: string; alt: string }
export function mediaUrl(value: string, base?: string): string | null;
export function readmeImages(markdown: string, base: string): MediaCandidate[];
export function messageImages(text: string, attachments?: {url: string; name?: string; contentType?: string}[]): MediaCandidate[];
