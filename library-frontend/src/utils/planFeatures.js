export function parsePlanFeatures(features) {
  if (Array.isArray(features)) {
    return features.map((f) => String(f).trim()).filter(Boolean)
  }
  if (typeof features === 'string') {
    const trimmed = features.trim()
    if (!trimmed) return []
    const lines = trimmed.split(/\r?\n/).map((f) => f.trim()).filter(Boolean)
    if (lines.length > 1) return lines
    return lines[0].split(',').map((f) => f.trim()).filter(Boolean)
  }
  return []
}
