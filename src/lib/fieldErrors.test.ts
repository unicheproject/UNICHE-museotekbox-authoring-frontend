import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { parseError } from './fieldErrors'

/** Build the axios error shape the backend's error envelope arrives in. */
function backendError(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST')
  error.response = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('parseError', () => {
  it('routes "field: message" details to that field', () => {
    const parsed = parseError(
      backendError(400, { details: ['name: must not be blank', 'slug: already taken'] }),
    )
    expect(parsed.fields).toEqual({ name: 'Must not be blank', slug: 'Already taken' })
  })

  it('recognises the verb form without a colon', () => {
    const parsed = parseError(backendError(400, { details: ['slug must match [a-z0-9-]+'] }))
    expect(parsed.fields.slug).toBe('Must match [a-z0-9-]+')
  })

  it('reduces a qualified field path to the leaf the form knows', () => {
    const parsed = parseError(
      backendError(400, { details: ['createProjectRequest.name: must not be blank'] }),
    )
    expect(parsed.fields).toEqual({ name: 'Must not be blank' })
  })

  it('keeps the first message when a field is reported twice', () => {
    const parsed = parseError(
      backendError(400, { details: ['name: must not be blank', 'name: too short'] }),
    )
    expect(parsed.fields.name).toBe('Must not be blank')
  })

  it('surfaces details it cannot attribute as the form-level message', () => {
    const parsed = parseError(
      backendError(409, { message: 'Conflict', details: ['That slug is in use in this organisation'] }),
    )
    expect(parsed.fields).toEqual({})
    expect(parsed.message).toBe('That slug is in use in this organisation')
  })

  it('accepts object-shaped details', () => {
    const parsed = parseError(
      backendError(400, { details: [{ field: 'slug', message: 'invalid format' }] }),
    )
    expect(parsed.fields.slug).toBe('Invalid format')
  })

  it('falls back to a readable message when there are no details', () => {
    const parsed = parseError(backendError(403, {}))
    expect(parsed.message).toBe('You are not allowed to do that.')
    expect(parsed.fields).toEqual({})
  })

  it('handles plain errors that never reached the backend', () => {
    const parsed = parseError(new Error('Network down'))
    expect(parsed).toEqual({ message: 'Network down', fields: {} })
  })
})
