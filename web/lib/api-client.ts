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

let activeRoleToken: string | null = null;

export function setRoleToken(token: string | null) {
  activeRoleToken = token;
}

export function getRoleToken(): string | null {
  return activeRoleToken;
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

  // Automatically inject X-Event-Role-Token for write/mutate requests
  const method = config.method?.toUpperCase();
  if (activeRoleToken && method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    headers.set('X-Event-Role-Token', activeRoleToken);
  }

  // Inject API Key for authenticity check if called from server-side (SSR / API endpoints)
  if (isServer) {
    const apiKey = process.env.SECURITY_API_KEY || 'default-local-api-key';
    headers.set('X-API-Key', apiKey);

    let correlationId = '';
    try {
      const { headers: getHeaders } = require('next/headers');
      correlationId = getHeaders().get('X-Correlation-Id') || '';
    } catch (e) {
      // Ignore if called outside request context (e.g., build time)
    }

    if (!correlationId) {
      correlationId = generateCorrelationId();
    }
    headers.set('X-Correlation-Id', correlationId);
  }

  const res = await fetch(urlString, {
    cache: 'no-store',
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

export function generateCorrelationId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    try {
      const crypto = require('crypto');
      crypto.randomFillSync(array);
    } catch (e) {
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
  }
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

