import { NavLink } from 'react-router-dom';
import {
  BarChart2,
  Brain,
  ChevronLeft,
  ChevronRight,
  Home,
  Lightbulb,
  Music,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, setMobileSidebarOpen } from '@/store/slices/uiSlice';
import logoTransparent from '@/assets/stream-pulse-logo-transparent.png';

const navItems = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/listening', label: 'Listening', icon: BarChart2 },
  { to: '/mood', label: 'Mood & Energy', icon: Brain },
  { to: '/artists', label: 'Artists', icon: Music },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];

export function Sidebar() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileSidebarOpen);

  const closeMobile = () => dispatch(setMobileSidebarOpen(false));

  const sidebarContent = (isMobile: boolean) => (
    <aside
      className={`flex h-full flex-col border-r border-[#00ffba]/10 bg-[#070e0b] transition-all duration-200 ${
        isMobile ? 'w-64' : collapsed ? 'w-16' : 'w-52'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-[#00ffba]/10 ${
          !isMobile && collapsed ? 'justify-center px-2' : 'justify-between px-3'
        }`}
      >
        {!isMobile && collapsed ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00ffba]/15 text-[#00ffba]">
            <Music size={15} />
          </span>
        ) : (
          <>
            <img
              src={logoTransparent}
              alt="StreamPulse"
              className="h-9 w-auto object-contain"
              draggable={false}
            />
            {/* Close button — mobile only */}
            {isMobile && (
              <button
                onClick={closeMobile}
                className="flex items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={isMobile ? closeMobile : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#00ffba]/10 text-[#00ffba]'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
              } ${!isMobile && collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon size={16} className="shrink-0" />
            {(isMobile || !collapsed) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex h-11 shrink-0 items-center justify-center border-t border-[#00ffba]/10 text-gray-600 transition-colors hover:text-[#00ffba]"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen shrink-0">
        {sidebarContent(false)}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative flex h-full">
            {sidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
