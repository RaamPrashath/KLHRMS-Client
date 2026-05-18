const WORD_MULTIPLIERS: Array<[RegExp, number]> = [
  [/\b(?:crore|crores|cr)\b/g, 10000000],
  [/\b(?:lakh|lakhs|lac|lacs|l)\b/g, 100000],
  [/\b(?:thousand|thousands|k)\b/g, 1000],
];

export function parseAnnualSalaryInput(value: string): number | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/[₹]/g, '')
    .replace(/\s+/g, ' ');

  if (!normalized) return null;

  const tokenPattern = /(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lakh|lac|l|thousands?|k)?/g;
  let total = 0;
  let matched = false;
  let consumed = '';

  for (const match of normalized.matchAll(tokenPattern)) {
    const amount = Number(match[1]);
    if (Number.isNaN(amount)) continue;

    matched = true;
    consumed += match[0];
    const unit = match[2] ?? '';
    const multiplier = WORD_MULTIPLIERS.find(([pattern]) => {
      pattern.lastIndex = 0;
      return pattern.test(unit);
    })?.[1] ?? 1;

    total += amount * multiplier;
  }

  const leftover = normalized
    .replace(/\s+/g, '')
    .replace(consumed.replace(/\s+/g, ''), '');

  if (!matched || leftover.length > 0 || total < 0) return null;
  return Math.round(total * 100) / 100;
}

export function formatInrSalary(value: number | null | undefined): string {
  if (value == null) return '';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
}
