/**
 * Derive a Catalogue-valid slug from a free-text name. The Catalogue enforces
 * `[a-z0-9][a-z0-9-]{1,62}`; this produces a best-effort suggestion the user can still edit.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritic marks
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → dash
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    .slice(0, 63)
}
