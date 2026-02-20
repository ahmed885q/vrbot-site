export function getRange(page: number, size: number) {
  const from = (page - 1) * size
  const to = from + size - 1
  return { from, to }
}
