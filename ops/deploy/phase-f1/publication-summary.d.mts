export declare const PUBLICATION_SUMMARY_SCHEMA: "phase-f1-publication-summary-v1";
export declare const ARCHIVE_FORMAT: "POSIX USTAR";
export declare const CORE_PUBLICATION_FILES: readonly string[];

export declare function inspectPublicationArchive(archive: Buffer): {
  format: "POSIX USTAR";
  memberCount: number;
};

export declare function renderPublicationSummary(
  directory: string,
  operationsCommit: string
): Buffer;

export declare function verifyPublicationDirectory(
  directory: string,
  operationsCommit: string
): {
  summaryName: string;
  summarySize: number;
  summarySha256: string;
};
