import React from 'react';

interface Props {
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'outline' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.954 1.18-.175.201-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.087-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.201-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.678-1.634-.929-2.237-.245-.588-.493-.508-.678-.517-.175-.01-.376-.01-.577-.01-.201 0-.527.075-.803.376-.276.301-1.054 1.03-1.054 2.511 0 1.481 1.079 2.91 1.23 3.111.15.201 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.722.23 1.379.197 1.9.119.58-.088 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.351zM12.042 21.87c-1.782 0-3.528-.479-5.062-1.385l-.363-.215-3.764.987 1.005-3.67-.236-.375a9.815 9.815 0 0 1-1.508-5.244c0-5.433 4.42-9.853 9.857-9.853 2.632 0 5.107 1.026 6.969 2.888a9.805 9.805 0 0 1 2.887 6.967c0 5.435-4.42 9.855-9.857 9.855l.072-.005zm0-17.87c-4.411 0-8 3.589-8 8 0 1.41.369 2.775 1.066 3.978l.169.29-.708 2.585 2.648-.694.281.167a7.95 7.95 0 0 0 4.544 1.474c4.411 0 8-3.589 8-8s-3.589-8-8-8z"/>
  </svg>
);

export const WhatsAppButton: React.FC<Props> = ({
  onClick,
  label = 'Kirim WhatsApp',
  variant = 'primary',
  size = 'md',
  className = '',
  title = 'Kirim pesan via WhatsApp',
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px] gap-1',
    md: 'px-3.5 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  }[size];

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`p-1.5 rounded-xl text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 transition active:scale-95 shadow-xs ${className}`}
      >
        <WhatsAppIcon className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'outline') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`inline-flex items-center justify-center font-bold rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 active:scale-95 transition shadow-xs ${sizeClasses} ${className}`}
      >
        <WhatsAppIcon className={iconSizes} />
        <span>{label}</span>
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition ${className}`}
      >
        <WhatsAppIcon className="w-3 h-3 text-emerald-700" />
        <span>{label}</span>
      </button>
    );
  }

  // Primary variant
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition ${sizeClasses} ${className}`}
    >
      <WhatsAppIcon className={iconSizes} />
      <span>{label}</span>
    </button>
  );
};
