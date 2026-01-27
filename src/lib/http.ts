type JsonResponse<T> = {
  data?: T;
  error?: string;
  details?: unknown;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  let json: JsonResponse<T> | null = null;
  try {
    json = (await res.json()) as JsonResponse<T>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(json?.error || res.statusText || "Request failed");
  }

  return (json?.data as T) ?? (undefined as T);
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};
