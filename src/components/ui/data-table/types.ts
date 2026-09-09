export interface DataTableColumn<T = unknown> {
  /** Matches the sort key handed to `useDataList`, and names the `cell-<key>` slot. */
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  /** Text for the default cell renderer. Ignored when a `cell-<key>` slot is provided. */
  value?: (row: T) => string | number | null | undefined
  /** Extra classes for the body cells of this column. */
  class?: string
  /** Extra classes for this column's header cell — e.g. a fixed width. */
  headClass?: string
}
