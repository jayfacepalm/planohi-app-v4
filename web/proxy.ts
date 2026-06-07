import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const cspAllowedImageSources = process.env.CSP_ALLOWED_IMAGE_SOURCES;
const cspAllowedConnectSources = process.env.CSP_ALLOWED_CONNECT_SOURCES;

if (!cspAllowedImageSources || !cspAllowedConnectSources) {
  throw new Error('Required CSP environment variables (CSP_ALLOWED_IMAGE_SOURCES and CSP_ALLOWED_CONNECT_SOURCES) are not defined.');
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('AUTH_TOKEN')?.value;
  const { pathname } = request.nextUrl;

  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";
  const cspString = `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src ${cspAllowedImageSources}; connect-src ${cspAllowedConnectSources}; frame-ancestors 'none';`;

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
  } else if (token && (isRootPage || isAuthPage)) {
    response = NextResponse.redirect(new URL('/events', request.url));
  } else if (!token && !isRootPage && !isAuthPage) {
    response = NextResponse.redirect(new URL('/login', request.url));
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
