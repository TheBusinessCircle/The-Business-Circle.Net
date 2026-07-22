export interface Listener { address: string; port: number; inode: string; }
export function parseProcNet(body: string, family: number): Listener[];
export function assertExactListener(entries: Listener[], expected: { address: string; port: number; inodes: Set<string> }): Listener;
