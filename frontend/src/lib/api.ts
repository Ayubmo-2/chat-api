const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init);
}

export function authHeader(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` };
}
