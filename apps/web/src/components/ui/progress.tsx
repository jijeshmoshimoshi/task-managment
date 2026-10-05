'use client';

import * as React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value = 0, indicatorClassName = 'bg-primary', ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value || 0));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedValue}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary/50 ${className}`}
        {...props}
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${indicatorClassName}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  },
);

Progress.displayName = 'Progress';

export { Progress };
