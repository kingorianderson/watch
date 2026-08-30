import type { User } from '../types/auth';

declare global {
  interface Window {
    google?: any;
    FB?: any;
  }
}

/**
 * Decodes Google JWT ID token
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
 * Launches the real Google Account Chooser popup (accounts.google.com/v3/signin/accountchooser)
 */
export function launchGooglePopup(
  clientId: string,
  onSuccess: (user: User) => void,
  onError?: (err: any) => void
) {
  // If official Google GIS SDK is loaded and client ID exists
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && clientId) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              // Fetch the real Google User Profile from Google's API
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const data = await res.json();
              const realUser: User = {
                id: `google_${data.sub}`,
                name: data.name || data.email.split('@')[0],
                email: data.email,
                avatar: data.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
                provider: 'google',
                joinedAt: Date.now(),
              };
              onSuccess(realUser);
            } catch (fetchErr) {
              console.error('Failed to fetch userinfo from Google', fetchErr);
              if (onError) onError(fetchErr);
            }
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
      return;
    } catch (err) {
      console.warn('Google Token client error, falling back to popup window', err);
    }
  }

  // Fallback direct OAuth popup window url
  const redirectUri = window.location.origin;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
    clientId || '717762328687-ilu3sk15ng0e0vdqrhv40i879e977vb6.apps.googleusercontent.com'
  }&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token&scope=openid%20profile%20email&prompt=select_account`;

  const width = 500;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    authUrl,
    'GoogleSignIn',
    `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
  );
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
      auto_select: true,
      cancel_on_tap_outside: false,
    });

    // Prompt the native One-Tap popup in the top-right of the browser
    window.google.accounts.id.prompt();
    return true;
  } catch (err) {
    console.warn('Google Identity initialization failed:', err);
    return false;
  }
}
