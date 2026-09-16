export interface PageUpdate { date: string; text: string }
export function parseUpdates(fmText: string): PageUpdate[];
export function updatesBlock(list: PageUpdate[]): string;
export function setUpdates(fmText: string, list: PageUpdate[]): string;
export function addUpdate(fmText: string, text: string, date?: string): string;
