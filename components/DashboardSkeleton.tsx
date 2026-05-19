import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="bg-[#f3f4f6] min-h-full px-4 pt-3 pb-6 animate-fade-in-up">
      {/* WelcomeCard skeleton */}
      <div className="bg-white rounded-xl shadow-md px-4 py-3 md:px-6 md:py-4 flex flex-wrap items-center justify-between gap-3 mb-4">
        <Skeleton className="h-6 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-22 rounded-lg" />
        </div>
      </div>

      {/* BalanceCards skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row mb-4">
        {/* Total Balance */}
        <Skeleton className="h-36 rounded-xl sm:w-1/3" />

        {/* 2x2 grid */}
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-2/3">
          <div className="flex flex-col gap-4 flex-1">
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
          </div>
          <div className="flex flex-col gap-4 flex-1">
            <Skeleton className="h-18 rounded-xl" />
            <Skeleton className="h-18 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-full rounded-lg" />
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
