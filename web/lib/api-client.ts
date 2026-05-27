export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(data?.msg || data?.detail || "An API error occurred");
    this.status = status;
    this.data = data;
  }
}

type RequestConfig = RequestInit & {
  params?: Record<string, string>;
};

interface BackendResponse<T> {
  status: string; // "SUCCESS" | "FAILED"
  msg: string;
  result: T;
}

export async function fetchApi<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  
  // 1. Resolve base url (Server calls backend container; client calls local Next.js proxy)
  const rawBase = isServer 
    ? (process.env.BACKEND_API_URL || 'http://localhost:8080') 
    : (process.env.NEXT_PUBLIC_API_URL || '/api/proxy');
  
  const baseUrl = isServer && !rawBase.endsWith('/api') ? `${rawBase}/api` : rawBase;

  let urlString = `${baseUrl}${path}`;
  
  // 2. Append query parameters
  if (config.params) {
    const searchParams = new URLSearchParams();
    Object.entries(config.params).forEach(([key, val]) => searchParams.append(key, val));
    urlString += `?${searchParams.toString()}`;
  }

  const headers = new Headers(config.headers);
  if (!headers.has('Content-Type') && !(config.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(urlString, {
    ...config,
    headers,
  });

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch {
      errorData = { msg: res.statusText };
    }
    throw new ApiError(res.status, errorData);
  }

  // 204 No Content handling
  if (res.status === 204) {
    return {} as T;
  }

  const envelope = (await res.json()) as BackendResponse<T>;

  if (envelope.status === "FAILED") {
    throw new ApiError(res.status, envelope);
  }

  return envelope.result;
}
