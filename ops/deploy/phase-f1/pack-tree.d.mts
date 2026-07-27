export type PackTreeEntry =
  | { type: "D"; path: string }
  | { type: "F"; path: string; body: Buffer };

export declare function parsePackTreeRows(rows: string, readBlob: (entry: { objectId: string; path: string }) => Buffer): PackTreeEntry[];
export declare function renderPackTar(entries: PackTreeEntry[]): Buffer;
