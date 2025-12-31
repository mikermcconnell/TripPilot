import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  milliseconds: number;
}

export function CountdownTimer({ milliseconds }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(milliseconds);

  useEffect(() => {
    setTimeLeft(milliseconds);

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [milliseconds]);

  if (timeLeft <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border-2 border-green-200">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm font-bold text-green-600">Starting now!</span>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  // Different display based on time remaining
  if (hours > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border-2 border-blue-200">
        <span className="text-sm font-bold text-blue-600">
          in {hours}h {minutes}m
        </span>
      </div>
    );
  }

  if (minutes > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border-2 border-amber-200">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-sm font-bold text-amber-600">
          in {minutes}m {seconds}s
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border-2 border-red-200">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm font-bold text-red-600">
        in {seconds}s
      </span>
    </div>
  );
}
