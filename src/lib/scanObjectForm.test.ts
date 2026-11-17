import { describe, expect, it } from 'vitest'
import {
  emptyScanObjectForm,
  scanObjectFormComplete,
  scanObjectFormErrors,
  scanObjectToForm,
  toScanObjectRequest,
} from './scanObjectForm'
import type { ScanObjectDto } from '@/api/museotekBox'

describe('toScanObjectRequest', () => {
  it('sends only the base fields for a draft', () => {
    const form = { ...emptyScanObjectForm('DRAFT'), name: 'Sketch', scanObjectTypeId: '7' }
    expect(toScanObjectRequest(form)).toEqual({
      name: 'Sketch',
      rfidTag: null,
      reusable: false,
      scanObjectTypeId: 7,
    })
  })

  it('adds the colour for a coloured card', () => {
    const form = { ...emptyScanObjectForm('COLOURED_CARD'), name: 'Red card', colour: 'GREEN' as const }
    expect(toScanObjectRequest(form)).toMatchObject({ name: 'Red card', colour: 'GREEN' })
  })

  it('adds the image reference for a printed image, and nothing else', () => {
    const form = {
      ...emptyScanObjectForm('PRINTED_IMAGE'),
      name: 'Poster',
      imageUrl: 'https://example.test/a.png',
      modelRef: 'left over from another kind',
    }
    const body = toScanObjectRequest(form) as unknown as Record<string, unknown>
    expect(body.imageUrl).toBe('https://example.test/a.png')
    expect(body).not.toHaveProperty('modelRef')
    expect(body).not.toHaveProperty('colour')
  })

  it('adds the model reference for a 3D printed object', () => {
    const form = { ...emptyScanObjectForm('THREE_D_PRINTED_OBJECT'), name: 'Vase', modelRef: 'vase.glb' }
    const body = toScanObjectRequest(form) as unknown as Record<string, unknown>
    expect(body.modelRef).toBe('vase.glb')
    expect(body).not.toHaveProperty('imageUrl')
  })

  it('trims text and sends a blank RFID tag or type as null, never an empty string', () => {
    const form = { ...emptyScanObjectForm('PRINTED_IMAGE'), name: ' Poster ', rfidTag: '   ', imageUrl: ' a.png ' }
    expect(toScanObjectRequest(form)).toEqual({
      name: 'Poster',
      rfidTag: null,
      reusable: false,
      scanObjectTypeId: null,
      imageUrl: 'a.png',
    })
  })

  it('sends back the stored reusable value it does not show', () => {
    const form = { ...emptyScanObjectForm('DRAFT'), name: 'X', reusable: true }
    expect(toScanObjectRequest(form).reusable).toBe(true)
  })

  it('treats a non-numeric type id as absent instead of sending NaN', () => {
    const form = { ...emptyScanObjectForm('DRAFT'), name: 'X', scanObjectTypeId: 'abc' }
    expect(toScanObjectRequest(form).scanObjectTypeId).toBeNull()
  })

  it('always includes every field of the kind, so a PATCH cannot blank one by omission', () => {
    const body = toScanObjectRequest({ ...emptyScanObjectForm('COLOURED_CARD'), name: 'C' })
    expect(Object.keys(body).sort()).toEqual(
      ['colour', 'name', 'reusable', 'rfidTag', 'scanObjectTypeId'].sort(),
    )
  })
})

describe('scanObjectToForm', () => {
  const object: ScanObjectDto = {
    id: 1,
    orgId: 'org',
    scanObjectTypeId: 3,
    name: 'Card',
    rfidTag: 'ABC',
    reusable: true,
    kind: 'COLOURED_CARD',
    colour: 'YELLOW',
    imageUrl: null,
    modelRef: null,
  }

  it('prefills from the object', () => {
    expect(scanObjectToForm(object, 'COLOURED_CARD')).toEqual({
      kind: 'COLOURED_CARD',
      name: 'Card',
      scanObjectTypeId: '3',
      rfidTag: 'ABC',
      reusable: true,
      colour: 'YELLOW',
      imageUrl: '',
      modelRef: '',
    })
  })

  it('renders absent values as blank inputs, not as the text "null"', () => {
    const form = scanObjectToForm(
      { ...object, scanObjectTypeId: null, rfidTag: null, colour: null },
      'DRAFT',
    )
    expect(form.scanObjectTypeId).toBe('')
    expect(form.rfidTag).toBe('')
    expect(form.colour).toBe('RED')
  })
})

describe('scanObjectFormComplete', () => {
  it('requires a name', () => {
    expect(scanObjectFormComplete(emptyScanObjectForm())).toBe(false)
    expect(scanObjectFormComplete({ ...emptyScanObjectForm(), name: '  ' })).toBe(false)
    expect(scanObjectFormComplete({ ...emptyScanObjectForm(), name: 'Ok' })).toBe(true)
  })

  it('requires the image reference for a printed image and the model reference for a 3D object', () => {
    expect(scanObjectFormComplete({ ...emptyScanObjectForm('PRINTED_IMAGE'), name: 'P', imageUrl: ' ' })).toBe(false)
    expect(scanObjectFormComplete({ ...emptyScanObjectForm('PRINTED_IMAGE'), name: 'P', imageUrl: 'a.png' })).toBe(true)
    expect(scanObjectFormComplete({ ...emptyScanObjectForm('THREE_D_PRINTED_OBJECT'), name: 'V' })).toBe(false)
    expect(scanObjectFormComplete({ ...emptyScanObjectForm('THREE_D_PRINTED_OBJECT'), name: 'V', modelRef: 'v.glb' })).toBe(true)
  })

  it('ignores the reference fields of other kinds', () => {
    expect(scanObjectFormComplete({ ...emptyScanObjectForm('DRAFT'), name: 'D', imageUrl: '', modelRef: '' })).toBe(true)
  })
})

describe('scanObjectFormErrors', () => {
  it('names the field that is missing', () => {
    expect(scanObjectFormErrors({ ...emptyScanObjectForm('PRINTED_IMAGE') })).toEqual({
      name: 'Give it a name',
      imageUrl: 'A printed image needs its image reference',
    })
  })

  it('enforces the 255-character limit, RFID tag included', () => {
    const long = 'x'.repeat(256)
    const errors = scanObjectFormErrors({ ...emptyScanObjectForm('THREE_D_PRINTED_OBJECT'), name: long, modelRef: long, rfidTag: long })
    expect(errors).toEqual({ name: 'At most 255 characters', modelRef: 'At most 255 characters', rfidTag: 'At most 255 characters' })
    expect(scanObjectFormErrors({ ...emptyScanObjectForm('DRAFT'), name: 'x'.repeat(255) })).toEqual({})
  })
})
