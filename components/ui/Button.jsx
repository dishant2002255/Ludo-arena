'use client';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  success:   'btn-success',
  ghost:     'px-4 py-2 rounded-full font-medium transition-all text-[#7a5a00] hover:bg-[#f0e6c8]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  ...props
}) {
  const base = VARIANTS[variant] || VARIANTS.primary;
  const sizeExtra = size === 'sm' ? 'px-4 py-1.5 text-xs' : size === 'lg' ? 'px-8 py-3.5 text-base' : 'text-sm';

  return (
    <button
      className={`${base} ${sizeExtra} ${fullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
