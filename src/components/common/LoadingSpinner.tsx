interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
        />
        {message && (
          <p className="text-slate-500 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
