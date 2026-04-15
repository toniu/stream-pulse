// ─── Spotify OAuth 2.0 PKCE Flow ─────────────────────────────────────────────
// We use PKCE (no client secret needed in the browser — secure for SPAs)

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string;
const SCOPES = (import.meta.env.VITE_SPOTIFY_SCOPES as string)
  .split(' ')
  .join(' ');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function initiateSpotifyLogin(): Promise<void> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem('sp_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem('sp_code_verifier');
  if (!verifier) {
    throw new Error('Missing PKCE code verifier. Please login again.');
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error_description?: string }).error_description ??
        'Token exchange failed'
    );
  }

  sessionStorage.removeItem('sp_code_verifier');
  return response.json() as Promise<TokenResponse>;
}

export function isTokenExpired(expiresAt: number): boolean {
  // 60-second buffer
  return Date.now() > expiresAt - 60_000;
}
