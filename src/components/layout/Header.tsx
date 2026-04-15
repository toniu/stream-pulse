import { LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const avatar = user?.images?.[0]?.url;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
      <div>
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-xs text-gray-400">
            {user.display_name}
          </span>
        )}
        {avatar ? (
          <img
            src={avatar}
            alt={user?.display_name ?? 'User'}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-indigo-300">
            {user?.display_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
        <button
          onClick={() => dispatch(logout())}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          title="Log out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
