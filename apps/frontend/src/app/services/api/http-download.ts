/**
 * Download a protected file by fetching it with an Authorization header and
 * saving the resulting blob via a temporary object URL. Keeps the auth token
 * out of the URL, where it would leak into browser history, proxy/server
 * logs, and Referer headers.
 */
export async function downloadWithAuthHeader(url: string, token: string | null, filename: string): Promise<void> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Download failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on a delay: Safari can still be streaming the blob into the
  // download when click() returns, and revoking immediately truncates it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_REVOKE_DELAY_MS);
}

const OBJECT_URL_REVOKE_DELAY_MS = 10_000;
