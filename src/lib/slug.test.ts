import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('National Museum of Antiquities')).toBe('national-museum-of-antiquities')
  })

  it('strips diacritics', () => {
    expect(slugify('Musée du Café')).toBe('musee-du-cafe')
  })

  it('collapses runs of separators and trims edges', () => {
    expect(slugify('  Bronze --- Age!! ')).toBe('bronze-age')
  })

  it('drops disallowed characters entirely', () => {
    expect(slugify('A/B & C')).toBe('a-b-c')
  })

  it('caps length at 63 characters', () => {
    expect(slugify('x'.repeat(100))).toHaveLength(63)
  })
})
