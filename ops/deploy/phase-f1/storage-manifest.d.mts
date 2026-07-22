export function storageInventory(root: string): string[];
export function assertSourceSubset(source: string, destination: string): {
  sourceRows: string[];
  destinationRows: string[];
};
export function compareStorage(source: string, destination: string): {
  sourceRows: string[];
  destinationRows: string[];
  changed: string[];
  destinationOnly: string[];
};
