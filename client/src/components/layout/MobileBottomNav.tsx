// client/src/components/layout/MobileBottomNav.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Send, QrCode, History, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const navItems = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/payment/send', label: 'Pay', icon: Send },
    { to: '/qr', label: 'Scan', icon: QrCode, highlight: true },
    { to: '/history', label: 'History', icon: History },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-canvas-card border-t border-white/5 px-2 flex items-center justify-around z-40 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        if (item.highlight) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center -translate-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary text-bone flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-canvas">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-bone-muted mt-1">
                {item.label}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-12 py-1 transition-colors ${
                isActive ? 'text-primary' : 'text-bone-muted hover:text-bone'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-1">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};