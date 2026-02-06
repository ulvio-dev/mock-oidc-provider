/**
 * Get the base pathname from the window object.
 * This is injected by the server at runtime.
 */
export function getBasePathname(): string {
  return (window as any).__BASE_PATHNAME__ || '';
}

/**
 * Create a URL with the base pathname prepended.
 */
export function createUrl(path: string): string {
  const base = getBasePathname();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
