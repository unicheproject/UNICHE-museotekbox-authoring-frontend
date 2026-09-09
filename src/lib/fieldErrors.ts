import axios from 'axios'
import { describeError } from '@/api/museotekBox'

export interface ParsedError {
  /** A message safe to show at form level (never empty). */
  message: string
  /** Per-field messages, keyed by the form field name. */
  fields: Record<string, string>
}

/**
 * `details` entries arrive as free-text strings, so the field name has to be recovered from the
 * text itself. Two shapes cover what the backend's bean-validation layer emits:
 *   "name: must not be blank"        → prefix before a colon
 *   "slug must match [a-z0-9-]+"     → identifier followed by a verb
 */
const PREFIXED = /^([A-Za-z][\w.[\]]*)\s*[:=]\s*(.+)$/
const VERB = /^([A-Za-z][\w.[\]]*)\s+((?:must|should|is|are|was|cannot|can't|may not|has to|needs)\b.*)$/

/**
 * Field names may be reported fully qualified by the validation layer
 * (`createProjectRequest.name`, `body.items[0].slug`) — the form only knows the leaf.
 */
function leafField(raw: string): string {
  const leaf = raw.split('.').pop() ?? raw
  return leaf.replace(/\[\d+\]$/, '')
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function splitDetail(detail: string): { field: string; message: string } | null {
  const match = PREFIXED.exec(detail) ?? VERB.exec(detail)
  if (!match) return null
  const field = leafField(match[1])
  // A single lowercase word is far more likely a field name than the start of a sentence;
  // anything with spaces in it is prose, not an identifier.
  if (!/^[A-Za-z]\w*$/.test(field)) return null
  return { field, message: capitalise(match[2].trim()) }
}

interface ErrorEnvelope {
  code?: string
  message?: string
  details?: unknown[]
}

/**
 * Split a backend error into a form-level message plus per-field messages. Details that name a
 * field are routed to that field; anything unattributable is folded into the form-level message,
 * so no validation text is ever silently dropped.
 */
export function parseError(error: unknown): ParsedError {
  const fields: Record<string, string> = {}
  const unattributed: string[] = []

  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ErrorEnvelope | undefined
    for (const detail of body?.details ?? []) {
      if (typeof detail === 'string') {
        const split = splitDetail(detail)
        if (split) {
          // First message per field wins — showing one reason per input is enough.
          fields[split.field] ??= split.message
        } else {
          unattributed.push(detail)
        }
        continue
      }
      // Defensive: some validation layers serialise details as objects rather than strings.
      if (detail && typeof detail === 'object') {
        const record = detail as Record<string, unknown>
        const field = record.field ?? record.name ?? record.property
        const message = record.message ?? record.defaultMessage ?? record.reason
        if (typeof field === 'string' && typeof message === 'string') {
          fields[leafField(field)] ??= capitalise(message)
        } else if (typeof message === 'string') {
          unattributed.push(message)
        }
      }
    }

    if (unattributed.length) {
      return { message: unattributed.join('; '), fields }
    }
    if (Object.keys(fields).length) {
      // Every detail was attributed to a field, so the fields carry the specifics. The backend's
      // own top-level message here is generic ("Invalid", "Validation failed") and only adds noise.
      return { message: 'Please correct the highlighted fields.', fields }
    }
  }

  return { message: describeError(error), fields }
}
