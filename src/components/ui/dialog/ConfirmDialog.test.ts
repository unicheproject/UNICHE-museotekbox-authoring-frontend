import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

// Stub <Teleport> so the dialog body renders inline and is queryable.
const opts = { global: { stubs: { teleport: true } } }

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(ConfirmDialog, { props: { open: false, title: 'Delete this?' }, ...opts })
    expect(wrapper.text()).not.toContain('Delete this?')
  })

  it('shows the title/description and emits confirm and cancel', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: 'Delete this?',
        description: 'It can be restored by an admin.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
      ...opts,
    })
    expect(wrapper.text()).toContain('Delete this?')
    expect(wrapper.text()).toContain('It can be restored by an admin.')

    const buttons = wrapper.findAll('button')
    // Order matches the template: Cancel first, then the confirm action.
    await buttons[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()

    await buttons[0].trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('does not cancel while busy', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { open: true, title: 'Delete this?', busy: true },
      ...opts,
    })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('cancel')).toBeFalsy()
  })
})
