import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width = '100%',
  height = '1rem',
  style,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-muted rounded animate-pulse',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={clsx('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? '80%' : '100%'}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('p-6 space-y-4 card-elevated', className)}>
    <Skeleton height="2rem" width="70%" />
    <SkeletonText lines={2} />
    <div className="flex gap-2 pt-4">
      <Skeleton height="2.5rem" width="100px" />
      <Skeleton height="2.5rem" width="100px" />
    </div>
  </div>
);
