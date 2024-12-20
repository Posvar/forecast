import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

interface ProgressBarProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number
  max?: number
  indicatorColor?: string
  height?: string
  label?: React.ReactNode
  sublabel?: React.ReactNode
  showPercentage?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  indicatorColor = "bg-[#2E05E6]", // Set default to the original purple color
  height = "h-2",
  label,
  sublabel,
  showPercentage = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100)

  return (
    <div className="space-y-2">
      {(label || sublabel) && (
        <div className="flex justify-between text-sm">
          <div className="text-xs text-gray-400">{label}</div> {/* Change text size for label */}
          <div className="text-xs text-gray-400">{sublabel}</div> {/* Change text size for sublabel */}
        </div>
      )}
      <div className="relative">
        <ProgressPrimitive.Root
          className={`overflow-hidden rounded-full bg-gray-200 ${height} ${className}`}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={`h-full transition-all ${indicatorColor}`}
            style={{ width: `${percentage}%` }}
          />
        </ProgressPrimitive.Root>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            <span className="text-xs font-medium text-white">
              {percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}