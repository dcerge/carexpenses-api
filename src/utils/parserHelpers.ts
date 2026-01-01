// ./src/utils/parserHelpers.ts
/**
 * Helper to parse JSON options safely with soft merge.
 * Merges parsed values with defaults so missing fields use default values.
 * This ensures backward compatibility when new config fields are added.
 */
export const parseOptions = <T extends Record<string, any>>(options: string | undefined, defaultValue: T): T => {
  if (!options) return defaultValue;

  try {
    const parsed = JSON.parse(options);

    // If parsed is not an object, return it directly (for simple string/number cases)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return parsed;
    }

    // Shallow merge: defaults first, then parsed values override
    return { ...defaultValue, ...parsed };
  } catch {
    return defaultValue;
  }
};
