import { describe, expect, it } from 'vitest'
import { can } from './can'
import type { AuthorizationContext } from './types'

const base: AuthorizationContext = {
  subject: 'sub-1',
  platformAdmin: false,
  managedOrganisations: [],
  projectMemberships: [],
}

describe('can() — platform authorization rule', () => {
  it('allows everything for a platform admin', () => {
    const ctx = { ...base, platformAdmin: true }
    expect(can(ctx, 'read', { projectId: 'p1' })).toBe(true)
    expect(can(ctx, 'write', { orgId: 'o1' })).toBe(true)
    expect(can(ctx, 'anything')).toBe(true)
  })

  it('allows managers on their organisation', () => {
    const ctx = { ...base, managedOrganisations: ['o1'] }
    expect(can(ctx, 'create', { orgId: 'o1' })).toBe(true)
    expect(can(ctx, 'create', { orgId: 'o2' })).toBe(false)
  })

  it('allows members on their project', () => {
    const ctx = { ...base, projectMemberships: [{ projectId: 'p1', orgId: 'o1', role: 'CURATOR' }] }
    expect(can(ctx, 'read', { projectId: 'p1' })).toBe(true)
    expect(can(ctx, 'read', { projectId: 'p2' })).toBe(false)
  })

  it('denies an unrelated user and a null context', () => {
    expect(can(base, 'read', { projectId: 'p1', orgId: 'o1' })).toBe(false)
    expect(can(null, 'read', { projectId: 'p1' })).toBe(false)
    expect(can(undefined, 'read')).toBe(false)
  })
})
