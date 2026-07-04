import { NextRequest, NextResponse } from 'next/server';
import { generateCorrelationId } from '../../../../lib/api-client';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

export async function handleProxy(req: NextRequest) {
  const url = new URL(req.url);
  const backendPath = url.pathname.replace('/api/proxy', '/api');
  const searchParams = url.search;

  // Extract AUTH_TOKEN cookie from request
  const token = req.cookies.get('AUTH_TOKEN')?.value;

  const headers = new Headers(req.headers);
  headers.set('Host', new URL(BACKEND_URL).host);
  
  // Forward the cookie directly so backend extracts it
  if (token) {
    headers.set('Cookie', `AUTH_TOKEN=${token}`);
  }

  // Handle Correlation ID propagation
  let correlationId = req.headers.get('X-Correlation-Id');
  if (!correlationId) {
    correlationId = generateCorrelationId();
  }
  headers.set('X-Correlation-Id', correlationId);

  // Inject API Key for authenticity check
  const apiKey = process.env.SECURITY_API_KEY || 'default-local-api-key';
  headers.set('X-API-Key', apiKey);

  // Next.js fetch cache disable
  headers.set('Cache-Control', 'no-store');

  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}${searchParams}`, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
      cache: 'no-store',
    });

    const data = await res.blob();
    
    // Copy all response headers (specifically Set-Cookie)
    const responseHeaders = new Headers();
    res.headers.forEach((val, key) => {
      // Forward the cookie setting headers back to the browser
      responseHeaders.append(key, val);
    });
    // Ensure X-Correlation-Id is returned to the client
    responseHeaders.set('X-Correlation-Id', correlationId);
    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return NextResponse.json({
      status: 'FAILED',
      msg: 'Backend service unavailable',
      result: null
    }, { status: 502 });
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
