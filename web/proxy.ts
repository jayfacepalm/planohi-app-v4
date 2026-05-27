import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('AUTH_TOKEN')?.value;
  const { pathname } = request.nextUrl;

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
    return NextResponse.next();
  }

  // Redirect to /events if accessing root page or auth pages with a token
  if (token && (isRootPage || isAuthPage)) {
    return NextResponse.redirect(new URL('/events', request.url));
  }

  // Redirect to /login if trying to access protected page (not root, not auth pages) without token
  if (!token && !isRootPage && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run proxy on all paths except static assets and standard API proxy routes
  matcher: ['/((?!api/proxy|_next/static|_next/image|favicon.ico).*)'],
};
