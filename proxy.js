import { NextResponse } from 'next/server';

const AX_HOSTS = new Set(['axstore.in', 'www.axstore.in']);
const LAUNCH_AT_MS = Date.parse('2026-09-27T06:30:00.000Z'); // Sunday, 12:00 PM IST

function isPublicAsset(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/ax-logo')
  );
}

export function proxy(request) {
  const host = String(request.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase();

  // The Hostinger preview/staging hostname keeps showing the normal V3 storefront.
  if (!AX_HOSTS.has(host)) {
    return NextResponse.next();
  }

  // At exactly Sunday 12:00 PM IST, axstore.in automatically opens the V3 store.
  if (Date.now() >= LAUNCH_AT_MS) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Keep framework assets and the calendar reminder route reachable.
  if (
    isPublicAsset(pathname) ||
    pathname.startsWith('/coming-soon') ||
    pathname === '/api/playroom'
  ) {
    return NextResponse.next();
  }

  // Before launch, every public AX Store URL resolves to the private launch screen.
  const url = request.nextUrl.clone();
  url.pathname = '/coming-soon';
  url.search = '';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/:path*',
};
