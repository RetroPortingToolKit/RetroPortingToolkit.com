// Types for scripts/authors.mjs, so the client and the API function import the
// same normalisation the build scripts use.
export interface TeamHandle { label: string; value: string; href?: string }
export interface TeamMember { slug: string; name: string; handles?: TeamHandle[]; [key: string]: unknown }
export type Team = TeamMember[] | { members: TeamMember[] };

export declare function authorsOf(fm: Record<string, unknown> | null | undefined, fallback?: string): string[];
export declare function authorsLine(names: readonly string[] | null | undefined): string;
export declare function teamMemberByDiscord(team: Team, username: string | null | undefined): TeamMember | null;
export declare function teamMemberByGithub(team: Team, login: string | null | undefined): TeamMember | null;
export declare function teamMemberByName(team: Team, name: string | null | undefined): TeamMember | null;
export declare function canonicalAuthors(team: Team, names: readonly unknown[] | null | undefined): string[];
export declare function teamSlugFor(team: Team, name: string): string | null;
export declare function rosterLines(team: Team): string[];
