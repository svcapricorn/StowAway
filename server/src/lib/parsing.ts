// Pure parsing helpers shared by inventory routes, extracted for unit testing

/** Safely parse a JSON string into an array, returning [] on any failure. */
export const safeParse = (str: string | null | undefined): string[] => {
  if (!str) return [];
  if (str === '[]') return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Safely parse a date-like value, returning null if missing or invalid. */
export const safeDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? null : parsed;
};
