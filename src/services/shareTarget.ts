// Web Share Target (GET) lands the PWA at /?title=&text=&url=. Extract the shared body
// (text preferred, title as fallback). Returns null for empty/whitespace/missing so the
// caller can no-op cleanly.
export function parseShareText(search: string): string | null {
  const params = new URLSearchParams(search)
  const raw = params.get('text') ?? params.get('title') ?? ''
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}
