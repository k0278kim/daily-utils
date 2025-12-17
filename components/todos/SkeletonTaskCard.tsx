import React from 'react';

const SkeletonTaskCard: React.FC = () => {
    return (
        <div className="mb-3 rounded-xl border border-gray-100 p-4 bg-white shadow-sm animate-pulse">
            <div className="flex items-center justify-between gap-3">
                {/* Circle Skeleton */}
                <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0" />

                <div className="flex-1 min-w-0 space-y-2">
                    {/* Title Skeleton */}
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    {/* Description Skeleton */}
                    <div className="h-3 bg-gray-100 rounded w-full" />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Category Badge Skeleton */}
                        <div className="h-4 w-12 bg-gray-100 rounded" />
                        {/* Date Skeleton */}
                        <div className="h-4 w-16 bg-gray-100 rounded" />
                    </div>
                </div>

                {/* Avatar Skeleton */}
                <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-4 h-4 bg-gray-100 rounded" />
                </div>
            </div>

            {/* Bottom Avatar Section Skeleton */}
            <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-3">
                <div className="flex -space-x-2 py-1 pl-1">
                    <div className="w-6 h-6 rounded-full bg-gray-200 ring-1 ring-white" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonTaskCard;
