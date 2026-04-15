import { NavLink } from 'react-router-dom';
import {
  BarChart2,
  Brain,
  Home,
  Lightbulb,
  Music,
  Radio,
  User,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar } from '@/store/slices/uiSlice';

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

  return (
    <aside
      className={`flex h-screen flex-col border-r border-white/10 bg-[#0d0d14] transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <Radio size={16} className="text-white" />
        </span>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-white">
            StreamPulse
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="flex h-12 items-center justify-center border-t border-white/10 text-gray-500 hover:text-white"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <User size={14} />
      </button>
    </aside>
  );
}
