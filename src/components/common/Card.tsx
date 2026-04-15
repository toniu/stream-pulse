import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = { sm: 'p-3', md: 'p-5', lg: 'p-7' };

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
