// Helpers for safely emitting file-download response headers.
//
// Filenames are user-controlled (upload/email metadata) and must never be
// interpolated raw into a `Content-Disposition` header: embedded quotes,
// backslashes, or CR/LF allow header injection / response splitting. We emit a
// sanitized ASCII `filename="…"` for legacy clients plus an RFC 5987
// `filename*=UTF-8''…` for correct Unicode handling.

const DEFAULT_FILENAME = 'download';

/** Build a safe `Content-Disposition: attachment` header value for a filename. */
export function attachmentDisposition(filename: string | null | undefined): string {
  const name = (filename ?? '').trim() || DEFAULT_FILENAME;

  // ASCII fallback: keep only printable ASCII, then neutralize quote/backslash
  // so nothing can terminate or escape the quoted-string (or inject CR/LF).
  const asciiFallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || DEFAULT_FILENAME;

  // RFC 5987 encoded form for Unicode-aware clients.
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
