/** Resolve files from public/ under either the site root or a GitHub Pages project path. */
export function assetPath(path: string): string {
  const relativePath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${relativePath}`;
}
