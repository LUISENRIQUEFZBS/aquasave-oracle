/** URL to show a stored file (relative path from the DB) through the authenticated file route. */
export function fileUrl(path: string | null | undefined): string | null {
  return path ? `/api/files/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}
