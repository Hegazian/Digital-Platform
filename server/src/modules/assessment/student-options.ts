/** Student delivery never serializes arbitrary authoring metadata from optionsJson. */
export function studentOptions(value: unknown): Array<string | Record<string, string | number>> {
  if (!Array.isArray(value)) return [];
  return value.map((option) => {
    if (typeof option === 'string') return option;
    if (!option || typeof option !== 'object') return {};
    return Object.fromEntries(['id', 'text', 'textEn', 'textAr', 'label', 'labelEn', 'labelAr', 'value']
      .filter((key) => typeof option[key] === 'string' || typeof option[key] === 'number')
      .map((key) => [key, option[key]]));
  });
}
