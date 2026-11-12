'use client';

const variantMap = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  purple: 'badge-purple',
  gray: 'badge-gray',
};

const statusBadgeMap = {
  active: 'green',
  waiting: 'yellow',
  full: 'blue',
  in_progress: 'purple',
  completed: 'gray',
  disabled: 'red',
  open: 'red',
  under_review: 'yellow',
  resolved: 'green',
  dismissed: 'gray',
};

export default function Badge({ children, variant = 'gray', dot = false }) {
  const cls = variantMap[variant] || variantMap.gray;
  return (
    <span className={cls}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const variant = statusBadgeMap[status] || 'gray';
  const label = status?.replace(/_/g, ' ');
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
