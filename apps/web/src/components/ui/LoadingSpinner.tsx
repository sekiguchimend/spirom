'use client';

interface LoadingSpinnerProps {
  /** サイズ（デフォルト: 'md'） */
  size?: 'sm' | 'md' | 'lg';
  /** カラー（デフォルト: primary） */
  color?: 'primary' | 'white' | 'black';
  /** 中央配置するか */
  centered?: boolean;
  /** ラベルテキスト */
  label?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 border-2',
  md: 'w-12 h-12 border-4',
  lg: 'w-16 h-16 border-4',
};

const colorClasses = {
  primary: 'border-primary border-t-transparent',
  white: 'border-white border-t-transparent',
  black: 'border-black border-t-transparent',
};

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  centered = false,
  label,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin`}
      role="status"
      aria-label={label || 'Loading'}
    />
  );

  if (centered) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        {spinner}
        {label && (
          <p className="text-sm text-text-dark/70">{label}</p>
        )}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
