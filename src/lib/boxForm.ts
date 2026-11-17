/** The backend's rules for a Box: a name and a serial number, each at most 255 characters. */
export const BOX_MAX = 255

export interface BoxFormModel {
  name: string
  serialNumber: string
}

export const emptyBoxForm = (): BoxFormModel => ({ name: '', serialNumber: '' })

/** What is wrong with the form, per field. */
export function boxFormErrors(form: BoxFormModel): Record<string, string> {
  const errors: Record<string, string> = {}
  const limit = `At most ${BOX_MAX} characters`
  if (!form.name.trim()) errors.name = 'Give it a name'
  else if (form.name.trim().length > BOX_MAX) errors.name = limit
  if (!form.serialNumber.trim()) errors.serialNumber = 'The serial number is printed on the device'
  else if (form.serialNumber.trim().length > BOX_MAX) errors.serialNumber = limit
  return errors
}

export const boxFormComplete = (form: BoxFormModel) => Object.keys(boxFormErrors(form)).length === 0

/** The request body: trimmed. */
export const toBoxRequest = (form: BoxFormModel) => ({ name: form.name.trim(), serialNumber: form.serialNumber.trim() })
