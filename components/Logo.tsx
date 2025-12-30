
import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', variant = 'default', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 40,
    xl: 64
  };

  const isWhite = variant === 'white';

  return (
    <div className={`flex items-center gap-2 select-none group ${className}`}>
      <div className="relative">
        {/* Stylized Racetrack/Wheel Icon */}
        <svg 
          width={iconSizes[size]} 
          height={iconSizes[size]} 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-500 group-hover:rotate-12"
        >
          <circle cx="20" cy="20" r="18" stroke={isWhite ? 'white' : '#4F46E5'} strokeWidth="4" />
          <path d="M10 20C10 14.4772 14.4772 10 20 10V10C25.5228 10 30 14.4772 30 20V20C30 25.5228 25.5228 30 20 30V30C14.4772 30 10 25.5228 10 20V20Z" stroke={isWhite ? 'white' : '#4F46E5'} strokeWidth="4" strokeLinecap="round"/>
          <path d="M20 10V30" stroke={isWhite ? 'white' : '#4F46E5'} strokeWidth="4" strokeLinecap="round"/>
          <path d="M10 20L30 20" stroke={isWhite ? 'white' : '#4F46E5'} strokeWidth="4" strokeLinecap="round"/>
          <circle cx="20" cy="20" r="4" fill={isWhite ? 'white' : '#4F46E5'} />
        </svg>
        {/* Glow effect */}
        {!isWhite && <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full -z-10 group-hover:bg-indigo-500/40 transition-all"></div>}
      </div>

      <h1 className={`${sizeClasses[size]} font-black tracking-tighter flex items-baseline transition-all`}>
        <span className={isWhite ? 'text-white' : 'text-gray-900 group-hover:text-indigo-600'}>M</span>
        <span className={isWhite ? 'text-white/90' : 'text-indigo-600'}>Ɔ̆</span>
        <span className={isWhite ? 'text-white' : 'text-gray-900 group-hover:text-indigo-600'}>TTO</span>
      </h1>
    </div>
  );
};

export default Logo;
