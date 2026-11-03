const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;

export async function serverFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(path, INTERNAL_API_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Request to ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
