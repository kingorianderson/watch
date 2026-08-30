import type { User } from '../types/auth';

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/**
 * Decodes Google JWT ID token to extract real user information
 */
export function decodeGoogleJwt(token: string): {
  sub: string;
  name: string;
  email: string;
  picture: string;
} {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding Google JWT token', error);
    throw new Error('Invalid Google credential token');
  }
}

/**
 * Initializes Google Identity Services (GIS) One-Tap / Auto-Select in the browser
 */
export function initGoogleIdentityServices(
  clientId: string,
  onSuccess: (user: User) => void
): boolean {
  if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          const payload = decodeGoogleJwt(response.credential);
          const realUser: User = {
            id: `google_${payload.sub}`,
            name: payload.name || payload.email.split('@')[0],
            email: payload.email,
            avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.name)}`,
            provider: 'google',
            joinedAt: Date.now(),
          };
          onSuccess(realUser);
        }
      },
      auto_select: true, // Automatically picks the active Google account in the browser if permitted
      cancel_on_tap_outside: false,
    });

    // Prompt the native One-Tap popup in the top-right of the browser
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        console.log('Google One Tap suppressed:', notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log('Google One Tap skipped:', notification.getSkippedReason());
      }
    });

    return true;
  } catch (err) {
    console.warn('Google Identity initialization failed:', err);
    return false;
  }
}

/**
 * Renders the official Google Sign-In button into a DOM container
 */
export function renderGoogleButton(
  containerId: string,
  clientId: string,
  onSuccess: (user: User) => void
): boolean {
  if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
    return false;
  }

  try {
    const el = document.getElementById(containerId);
    if (!el) return false;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          const payload = decodeGoogleJwt(response.credential);
          const realUser: User = {
            id: `google_${payload.sub}`,
            name: payload.name || payload.email.split('@')[0],
            email: payload.email,
            avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.name)}`,
            provider: 'google',
            joinedAt: Date.now(),
          };
          onSuccess(realUser);
        }
      },
    });

    window.google.accounts.id.renderButton(el, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: '100%',
      logo_alignment: 'left',
    });

    return true;
  } catch (err) {
    console.error('Failed to render official Google button', err);
    return false;
  }
}

