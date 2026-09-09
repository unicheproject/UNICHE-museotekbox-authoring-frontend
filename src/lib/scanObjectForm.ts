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
 * `scanObjectTypeId` is a string because it is bound to a text input: there is no endpoint listing
 * scan object types yet, so the user has to enter the id (see docs/BACKEND-GAPS.md).
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
    case 'PRINTED_IMAGE':
      return { ...base, imageUrl: orNull(form.imageUrl) }
    case 'THREE_D_PRINTED_OBJECT':
      return { ...base, modelRef: orNull(form.modelRef) }
    case 'DRAFT':
      return base
  }
}

/** A form is submittable once it has the fields its kind cannot do without. */
export function scanObjectFormComplete(form: ScanObjectFormModel): boolean {
  if (!form.name.trim()) return false
  // `colour` is the only field the backend marks required, and it always has a default.
  return true
}
