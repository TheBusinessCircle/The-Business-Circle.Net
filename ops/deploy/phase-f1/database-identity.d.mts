export interface DatabaseIdentity { host: string; port: string; username: string; password: string; database: string; sslmode: string; identitySha256: string; }
export function parseDatabaseUrl(value: string): DatabaseIdentity;
