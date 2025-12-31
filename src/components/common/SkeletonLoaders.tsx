/**
 * Skeleton Loading Components
 *
 * Provides consistent loading states across all views
 */

interface SkeletonProps {
  className?: string;
}

/** Base skeleton pulse animation */
function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/** Skeleton for day cards in Overview */
export function DayCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton for activity cards */
export function ActivityCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for country cards */
export function CountryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for travel legs */
export function TravelLegSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Full view skeleton for itinerary */
export function ItineraryViewSkeleton() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading itinerary">
      {/* Day header skeleton */}
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Activity cards */}
      <div className="space-y-3">
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
      </div>
    </div>
  );
}

/** Full view skeleton for overview */
export function OverviewSkeleton() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading overview">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Day cards grid */}
      <div className="grid grid-cols-1 gap-3">
        <DayCardSkeleton />
        <DayCardSkeleton />
        <DayCardSkeleton />
        <DayCardSkeleton />
      </div>
    </div>
  );
}

/** Full view skeleton for country view */
export function CountryViewSkeleton() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading countries">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-16 w-24 rounded-xl" />
        <Skeleton className="h-16 w-24 rounded-xl" />
        <Skeleton className="h-16 w-24 rounded-xl" />
      </div>

      {/* Country cards */}
      <div className="space-y-4">
        <CountryCardSkeleton />
        <CountryCardSkeleton />
      </div>
    </div>
  );
}

/** Full view skeleton for travel view */
export function TravelViewSkeleton() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading journeys">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-20 w-28 rounded-xl" />
        <Skeleton className="h-20 w-28 rounded-xl" />
        <Skeleton className="h-20 w-28 rounded-xl" />
      </div>

      {/* Travel legs */}
      <div className="space-y-3">
        <TravelLegSkeleton />
        <TravelLegSkeleton />
        <TravelLegSkeleton />
      </div>
    </div>
  );
}

export { Skeleton };
