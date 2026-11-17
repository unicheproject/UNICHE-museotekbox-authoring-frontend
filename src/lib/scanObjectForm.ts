import type {
  CardColour,
  ScanObjectDto,
  ScanObjectKind,
  ScanObjectRequest,
} from '@/api/museotekBox'

/**
 * The scan object form, flattened so one set of inputs can serve all four kinds. Fields belonging
 * to other kinds simply sit unused, which keeps what the user typed if they switch kind and switch
 * back mid-form.
 *
 * `scanObjectTypeId` is a string because it is bound to the card-type select ('' = no type).
 *
 * `reusable` is not shown (the backend stores it but no longer uses it); it is still carried so an
 * edit sends back the value the object already has instead of resetting it.
 */
export interface ScanObjectFormModel {
  kind: ScanObjectKind
  name: string
  scanObjectTypeId: string
  rfidTag: string
  reusable: boolean
  colour: CardColour
  imageUrl: string
  modelRef: string
}

export function emptyScanObjectForm(kind: ScanObjectKind = 'DRAFT'): ScanObjectFormModel {
  return {
    kind,
    name: '',
    scanObjectTypeId: '',
    rfidTag: '',
    reusable: false,
    colour: 'RED',
    imageUrl: '',
    modelRef: '',
  }
}

/** Prefill the form from an existing object, for the edit dialog. */
export function scanObjectToForm(
  object: ScanObjectDto,
  kind: ScanObjectKind,
): ScanObjectFormModel {
  return {
    kind,
    name: object.name ?? '',
    scanObjectTypeId: object.scanObjectTypeId === null ? '' : String(object.scanObjectTypeId),
    rfidTag: object.rfidTag ?? '',
    reusable: Boolean(object.reusable),
    colour: object.colour ?? 'RED',
    imageUrl: object.imageUrl ?? '',
    modelRef: object.modelRef ?? '',
  }
}

/** The backend's limit on every text field of a scan object. */
export const MAX_TEXT = 255

/** Blank text means "no value", which the API expresses as null rather than an empty string. */
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Build the request body for the endpoint of the form's kind.
 *
 * Every field the kind's DTO declares is always included, even when unchanged or empty: it is not
 * documented whether the PATCH endpoints ignore omitted fields or overwrite them with null, and
 * sending the complete set makes both readings produce the same result.
 */
export function toScanObjectRequest(form: ScanObjectFormModel): ScanObjectRequest {
  const parsedType = Number.parseInt(form.scanObjectTypeId, 10)
  const base = {
    name: form.name.trim(),
    rfidTag: orNull(form.rfidTag),
    reusable: form.reusable,
    scanObjectTypeId: Number.isNaN(parsedType) ? null : parsedType,
  }

  switch (form.kind) {
    case 'COLOURED_CARD':
      return { ...base, colour: form.colour }
    // Required by the backend for these kinds; the form does not submit them blank.
    case 'PRINTED_IMAGE':
      return { ...base, imageUrl: form.imageUrl.trim() }
    case 'THREE_D_PRINTED_OBJECT':
      return { ...base, modelRef: form.modelRef.trim() }
    case 'DRAFT':
      return base
  }
}

/**
 * What is wrong with the form, per field, by the backend's own rules: a name; an image reference
 * for a printed image; a model reference for a 3D object; at most 255 characters each. `colour`
 * always has a value. Only the fields of the chosen kind are checked.
 */
export function scanObjectFormErrors(form: ScanObjectFormModel): Record<string, string> {
  const errors: Record<string, string> = {}
  const tooLong = (v: string) => v.trim().length > MAX_TEXT
  const limit = `At most ${MAX_TEXT} characters`

  if (!form.name.trim()) errors.name = 'Give it a name'
  else if (tooLong(form.name)) errors.name = limit

  if (form.kind === 'PRINTED_IMAGE') {
    if (!form.imageUrl.trim()) errors.imageUrl = 'A printed image needs its image reference'
    else if (tooLong(form.imageUrl)) errors.imageUrl = limit
  }
  if (form.kind === 'THREE_D_PRINTED_OBJECT') {
    if (!form.modelRef.trim()) errors.modelRef = 'A 3D printed object needs its model reference'
    else if (tooLong(form.modelRef)) errors.modelRef = limit
  }
  if (tooLong(form.rfidTag)) errors.rfidTag = limit
  return errors
}

/** A form is submittable once nothing is wrong with it. */
export function scanObjectFormComplete(form: ScanObjectFormModel): boolean {
  return Object.keys(scanObjectFormErrors(form)).length === 0
}
