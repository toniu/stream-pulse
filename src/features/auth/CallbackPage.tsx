import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '@/api/auth';
import { setTokens } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function CallbackPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      navigate('/login', { replace: true });
      return;
    }

    exchangeCodeForToken(code)
      .then((tokens) => {
        const expiresAt = Date.now() + tokens.expires_in * 1000;
        dispatch(setTokens({ accessToken: tokens.access_token, expiresAt }));
        navigate('/', { replace: true });
      })
      .catch(() => {
        navigate('/login', { replace: true });
      });
  }, [dispatch, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#09090f]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={40} />
        <p className="text-sm text-gray-400">Connecting to Spotify…</p>
      </div>
    </div>
  );
}
