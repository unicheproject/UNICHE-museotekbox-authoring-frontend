/**
 * The Dashboard's "Get started" guide for a manager: the steps in the order the app really works,
 * each ticked from what the organisation already has. Framework-free so it can be tested.
 *
 * A start card is a card type, and nothing can be published without one, so step 1 only counts a
 * scan object that has a card type.
 */

export interface GetStartedFacts {
  /** Scan objects that have a card type. */
  typedScanObjects: number
  /** Whether the organisation has an Exit card type (for the tip under step 1). */
  hasExitType: boolean
  experiences: number
  /** Experiences with a published version. */
  published: number
  boxes: number
  /** Boxes with at least one experience on them. */
  boxesWithExperience: number
}

export type StepId = 'scan' | 'experience' | 'publish' | 'box' | 'install'

export interface GetStartedStep {
  id: StepId
  title: string
  text: string
  done: boolean
}

export interface GetStartedState {
  steps: GetStartedStep[]
  doneCount: number
  /** The first step not done yet; null when all are. */
  next: StepId | null
  allDone: boolean
  /** "Tip: also create an Exit type…", only while there is none. */
  showExitTip: boolean
}

export function getStarted(f: GetStartedFacts): GetStartedState {
  const steps: GetStartedStep[] = [
    { id: 'scan', title: 'Add your scan objects', text: 'The cards and objects visitors place on the Box.', done: f.typedScanObjects > 0 },
    { id: 'experience', title: 'Create an experience', text: 'What visitors see and hear.', done: f.experiences > 0 },
    { id: 'publish', title: 'Publish it', text: 'Boxes play the published version.', done: f.published > 0 },
    { id: 'box', title: 'Add a Box', text: 'The device in the room.', done: f.boxes > 0 },
    {
      id: 'install',
      title: 'Put the experience on the Box',
      text: 'Then open its display on the screen next to it.',
      done: f.boxesWithExperience > 0,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  return {
    steps,
    doneCount,
    next: steps.find((s) => !s.done)?.id ?? null,
    allDone: doneCount === steps.length,
    showExitTip: !f.hasExitType,
  }
}
