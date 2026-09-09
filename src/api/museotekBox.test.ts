import { describe, expect, it } from 'vitest'
import { boxOnline, resolveScanObjectKind, scanObjectKindSegment } from './museotekBox'

/**
 * Both of these read undocumented free-text fields off the backend, so the tests pin the
 * tolerance deliberately: if the backend later settles on one spelling, these still pass.
 */
describe('resolveScanObjectKind', () => {
  it('accepts the screaming-snake form', () => {
    expect(resolveScanObjectKind('COLOURED_CARD')).toBe('COLOURED_CARD')
    expect(resolveScanObjectKind('PRINTED_IMAGE')).toBe('PRINTED_IMAGE')
    expect(resolveScanObjectKind('THREE_D_PRINTED_OBJECT')).toBe('THREE_D_PRINTED_OBJECT')
    expect(resolveScanObjectKind('DRAFT')).toBe('DRAFT')
  })

  it('accepts pascal case, kebab case and lower case', () => {
    expect(resolveScanObjectKind('ColouredCard')).toBe('COLOURED_CARD')
    expect(resolveScanObjectKind('coloured-card')).toBe('COLOURED_CARD')
    expect(resolveScanObjectKind('printedImage')).toBe('PRINTED_IMAGE')
    expect(resolveScanObjectKind('three-d-printed-object')).toBe('THREE_D_PRINTED_OBJECT')
  })

  it('accepts the American spelling of colour', () => {
    expect(resolveScanObjectKind('COLORED_CARD')).toBe('COLOURED_CARD')
  })

  it('does not mistake the 3D kind for a printed image', () => {
    // Both names contain "PRINTED", so ordering inside the resolver matters.
    expect(resolveScanObjectKind('THREE_D_PRINTED_OBJECT')).not.toBe('PRINTED_IMAGE')
    expect(resolveScanObjectKind('3D_PRINTED')).toBe('THREE_D_PRINTED_OBJECT')
  })

  it('returns null for anything it cannot place', () => {
    expect(resolveScanObjectKind('SOMETHING_NEW')).toBeNull()
    expect(resolveScanObjectKind('')).toBeNull()
    expect(resolveScanObjectKind(null)).toBeNull()
    expect(resolveScanObjectKind(undefined)).toBeNull()
  })

  it('maps every kind to its endpoint segment', () => {
    expect(scanObjectKindSegment('COLOURED_CARD')).toBe('coloured-cards')
    expect(scanObjectKindSegment('PRINTED_IMAGE')).toBe('printed-images')
    expect(scanObjectKindSegment('THREE_D_PRINTED_OBJECT')).toBe('three-d-printed-objects')
    expect(scanObjectKindSegment('DRAFT')).toBe('drafts')
  })
})

describe('boxOnline', () => {
  it('treats only an explicit online status as online', () => {
    expect(boxOnline('ONLINE')).toBe(true)
    expect(boxOnline('online')).toBe(true)
    expect(boxOnline('Online')).toBe(true)
  })

  it('treats everything else, including nothing at all, as not online', () => {
    expect(boxOnline('OFFLINE')).toBe(false)
    expect(boxOnline('UNKNOWN')).toBe(false)
    expect(boxOnline('')).toBe(false)
    expect(boxOnline(null)).toBe(false)
    expect(boxOnline(undefined)).toBe(false)
  })
})
