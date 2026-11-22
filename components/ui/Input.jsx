'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  error,
  hint,
  icon,
  type = 'text',
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-bold" style={{ color: '#7a5a00' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a09070' }}>
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`input-field ${icon ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} ${className}`}
          style={error ? { borderColor: '#fca5a5' } : {}}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#a09070' }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: '#a09070' }}>{hint}</p>}
    </div>
  );
}
