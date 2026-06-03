import { useState } from 'react';
import { HelpCircle, LogOut, Menu, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { toggleMobileSidebar } from '@/store/slices/uiSlice';
import { HelpModal } from '@/components/common/HelpModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [helpOpen, setHelpOpen] = useState(false);
  const avatar = user?.images?.[0]?.url;

  return (
    <>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => dispatch(toggleMobileSidebar())}
          className="flex md:hidden items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white md:text-base">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {user && (
          <span className="hidden text-xs text-gray-400 sm:inline">
            {user.display_name}
          </span>
        )}
        {avatar ? (
          <img
            src={avatar}
            alt={user?.display_name ?? 'User'}
            className="h-7 w-7 rounded-full object-cover ring-2 ring-white/10 md:h-8 md:w-8"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00ffba]/15 text-[#00ffba] md:h-8 md:w-8">
            <User size={14} />
          </span>
        )}
        <button
          onClick={() => setHelpOpen(true)}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          title="Help"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={() => dispatch(logout())}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}
