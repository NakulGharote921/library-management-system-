export default function PageSkeleton() {
  return (
    <div className="flex w-52 flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 shrink-0 rounded-full" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-28" />
        </div>
      </div>
      <div className="skeleton h-32 w-full" />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="skeleton h-16 w-16 shrink-0 rounded-full" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-28" />
        </div>
      </div>
      <div className="skeleton h-32 w-full" />
    </div>
  )
}
