export type DropZone = 'before' | 'after' | 'nest'

/**
 * Compute the drop zone (before / after / nest) based on where the
 * dragged item's center lands within the hovered row's bounding box.
 */
export function computeDropZone(
  activeRect: { top: number; height: number },
  overRect: { top: number; height: number }
): DropZone {
  const activeCenterY = activeRect.top + activeRect.height / 2
  const relative = (activeCenterY - overRect.top) / overRect.height
  if (relative < 0.25) return 'before'
  if (relative > 0.75) return 'after'
  return 'nest'
}
