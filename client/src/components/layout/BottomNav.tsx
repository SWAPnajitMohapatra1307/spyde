import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ScanLine, ShieldCheck, User } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface BottomNavProps {}

const bottomNavItems = [
  { to: '/home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { to: '/qr', label: 'Scan', icon: <ScanLine className="w-5 h-5" /> },
  { to: '/circle', label: 'Circle', icon: <ShieldCheck className="w-5 h-5" /> },
  { to: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

export const BottomNav: React.FC<BottomNavProps> = () => {
  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'flex flex-col items-center justify-center py-2 px-3 rounded-pill text-caption transition-colors',
      isActive ? 'text-spyde-jade' : 'text-spyde-muted hover:text-spyde-sand'
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-spyde-surface-1 border-t border-spyde-hairline flex items-center justify-around z-30 md:hidden">
      {bottomNavItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClass}>
          {item.icon}
          <span className="mt-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};