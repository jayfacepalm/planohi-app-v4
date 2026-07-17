import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const cspAllowedImageSources = process.env.CSP_ALLOWED_IMAGE_SOURCES;
const cspAllowedConnectSources = process.env.CSP_ALLOWED_CONNECT_SOURCES;

if (!cspAllowedImageSources || !cspAllowedConnectSources) {
  throw new Error('Required CSP environment variables (CSP_ALLOWED_IMAGE_SOURCES and CSP_ALLOWED_CONNECT_SOURCES) are not defined.');
}

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    
    // Add padding if missing
    let base64 = payloadBase64.replaceAll('-', '+').replaceAll('_', '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decoded = atob(base64);
    const claims = JSON.parse(decoded);
    if (claims.exp) {
      return Date.now() >= claims.exp * 1000;
    }
    return false;
  } catch (e) {
    console.error('Failed to parse or check token expiration:', e);
    return true; // Treat invalid tokens as expired
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('AUTH_TOKEN')?.value;
  const hasValidToken = token ? !isTokenExpired(token) : false;
  const { pathname } = request.nextUrl;

  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd 
    ? "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client https://pagead2.googlesyndication.com https://adservice.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google.com https://*.gstatic.com" 
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com/gsi/client https://pagead2.googlesyndication.com https://adservice.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google.com https://*.gstatic.com";
  const styleSrc = "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style";
  const connectSrc = `connect-src ${cspAllowedConnectSources} https://accounts.google.com https://*.adtrafficquality.google https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com`;
  const frameSrc = "frame-src https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google";
  const cspString = `default-src 'self'; ${scriptSrc}; ${styleSrc}; font-src 'self' https://fonts.gstatic.com; img-src ${cspAllowedImageSources} https://*.adtrafficquality.google https://*.google.com https://*.gstatic.com; ${connectSrc}; ${frameSrc}; frame-ancestors 'none';`;

  let response: NextResponse;

  // Check path categories
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isRsvpPage = pathname.startsWith('/rsvp');
  const isRootPage = pathname === '/';
  
  // Static resources and design system showcase should remain open
  const isStaticResource = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/design-system');

  if (isStaticResource || isRsvpPage) {
    response = NextResponse.next();
  } else if (hasValidToken && (isRootPage || isAuthPage)) {
    response = NextResponse.redirect(new URL('/events', request.url));
  } else if (!hasValidToken && !isRootPage && !isAuthPage) {
    response = NextResponse.redirect(new URL('/login', request.url));
    if (token) {
      response.cookies.delete('AUTH_TOKEN');
    }
  } else {
    response = NextResponse.next();
  }

  // Inject Content-Security-Policy header
  response.headers.set('Content-Security-Policy', cspString);
  return response;
}

export const config = {
  // Run proxy on all paths except static assets and standard API proxy routes
  matcher: ['/((?!api/proxy|_next/static|_next/image|favicon.ico).*)'],
};
