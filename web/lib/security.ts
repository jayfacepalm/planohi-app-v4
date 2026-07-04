export interface RoleClaims {
  userId: string;
  eventId: string;
  userRole: string;
}

export function decodeRoleToken(token?: string): string | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.userRole;
  } catch (e) {
    console.error("Failed to decode user role token", e);
    return null;
  }
}
