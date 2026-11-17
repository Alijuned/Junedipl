import React, { useState } from 'react';

interface FlutonTokenIconProps {
  size?: number;
  className?: string;
}

export const FlutonTokenIcon: React.FC<FlutonTokenIconProps> = ({
  size = 28,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full border-2 border-purple-400 bg-black overflow-hidden shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.55)] ${className}`}
    >
      {!failed ? (
        <img
          src="/assets/aistudio/fluton_logo_b582d1e3.jpg"
          alt="Fluton Token"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5" fill="none">
          <path
            d="M22 48L50 20L78 48"
            stroke="#ffffff"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M50 42L30 62L50 82"
            stroke="#ffffff"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="62" r="8" stroke="#ffffff" strokeWidth="5" />
        </svg>
      )}
    </span>
  );
};
