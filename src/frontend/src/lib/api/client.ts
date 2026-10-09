const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new Error('API khong phan hoi');
  return response.json() as Promise<T>;
}