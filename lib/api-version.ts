// lib/api-version.ts
// Helper for API versioning without breaking existing routes

export const API_VERSION = "v1";
export const API_BASE = `/api/${API_VERSION}`;

// Used in frontend for new requests
export function apiUrl(path: string): string {
  // path like: /farms/list or /farms/adb
  return `/api/v1${path}`;
}

export function withVersion(response: Response): Response {
  response.headers.set("X-API-Version", API_VERSION);
  response.headers.set("X-API-Deprecated", "false");
  return response;
}
