import { errorCode } from '@/api/museotekBox'

/**
 * Plain wording for the backend error codes of the Scan objects (and their card types) and Boxes screens.
 * `field` names the form field the problem belongs to, when there is one, so the message can sit
 * under that input instead of at the top of the form.
 *
 * Publishing and putting experiences on Boxes have their own wording in `lib/publish.ts`.
 */
export interface KnownError {
  message: string
  field?: string
}

const KNOWN: Record<string, KnownError> = {
  DUPLICATE_RFID_TAG: {
    field: 'rfidTag',
    message: 'This RFID tag is already in use, possibly by another organisation. Unbind it there first.',
  },
  DUPLICATE_SERIAL_NUMBER: {
    field: 'serialNumber',
    message: 'This serial number is already in use, possibly by another organisation.',
  },
  SCAN_OBJECT_TYPE_NOT_FOUND: {
    field: 'scanObjectTypeId',
    message: 'That card type no longer exists. Choose another.',
  },
  EXIT_CARD_TYPE_TAKEN: {
    field: 'exit',
    message: 'The organisation already has an Exit card type. There can be only one.',
  },
  INVALID_SCAN_OBJECT_TYPE: {
    message: 'A card type cannot be both Universal and Exit.',
  },
  SCAN_OBJECT_NOT_FOUND: { message: 'This scan object no longer exists.' },
  BOX_NOT_FOUND: { message: 'This Box no longer exists.' },
}

/** The plain wording for a backend error this app knows, or null to fall back to the generic one. */
export function knownError(error: unknown): KnownError | null {
  const code = errorCode(error)
  return code ? (KNOWN[code] ?? null) : null
}
