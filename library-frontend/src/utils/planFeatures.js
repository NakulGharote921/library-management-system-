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

function classifyFeatureType(text) {
  const f = text.toLowerCase()
  if (/books? (at a time|allowed|can borrow|borrow limit)|max(imum)?\s*books/.test(f)) return 'maxBooks'
  if (/loan|borrow (period|days|duration)|return period/.test(f)) return 'maxLoanDays'
  if (/renewal/.test(f)) return 'maxRenewals'
  if (/priority reservation/.test(f)) return 'priorityReservation'
  if (/reservation/.test(f)) return 'maxReservations'
  if (/fine (exemption|waiver|free)|no (late fee|fine)/.test(f)) return 'fineExempt'
  return null
}

export function buildPlanFeatureList(plan) {
  if (!plan) return []

  const generated = []
  if (Number(plan.maxBooks) > 0) generated.push({ text: `${plan.maxBooks} books at a time`, type: 'maxBooks' })
  if (Number(plan.maxLoanDays) > 0) generated.push({ text: `${plan.maxLoanDays}-day loan period`, type: 'maxLoanDays' })
  if (Number(plan.maxRenewals) > 0) generated.push({ text: `${plan.maxRenewals} renewals`, type: 'maxRenewals' })
  if (Number(plan.maxReservations) > 0) generated.push({ text: `${plan.maxReservations} reservations`, type: 'maxReservations' })
  if (Boolean(plan.priorityReservation)) generated.push({ text: 'Priority reservations', type: 'priorityReservation' })
  if (Boolean(plan.fineExempt)) generated.push({ text: 'Fine exemption', type: 'fineExempt' })

  const result = [...generated]
  const usedTypes = new Set(generated.map((g) => g.type))
  const usedTexts = new Set(result.map((r) => r.text.trim().toLowerCase()))

  for (const feature of parsePlanFeatures(plan.features)) {
    const text = feature.trim()
    if (!text) continue
    const lower = text.toLowerCase()
    if (usedTexts.has(lower)) continue
    const type = classifyFeatureType(text)
    if (type && usedTypes.has(type)) continue
    result.push({ text, type })
    usedTexts.add(lower)
    if (type) usedTypes.add(type)
  }

  return result
}
