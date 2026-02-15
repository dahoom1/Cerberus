import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export const CardSkeleton = () => (
  <div className="bg-card border rounded-lg p-6 space-y-3">
    <Skeleton height={24} width="60%" />
    <Skeleton height={32} width="40%" />
    <Skeleton count={2} />
  </div>
)

export const SignalSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-2">
    <div className="flex justify-between">
      <Skeleton height={20} width={120} />
      <Skeleton height={20} width={80} />
    </div>
    <Skeleton height={16} width="70%" />
    <Skeleton height={14} width="50%" />
  </div>
)
