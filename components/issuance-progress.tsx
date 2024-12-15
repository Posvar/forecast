import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

interface IssuanceProgressProps {
  target: number
  issued: number
  forecasted: number
  className?: string
}

export function IssuanceProgress({
  target,
  issued,
  forecasted,
  className
}: IssuanceProgressProps) {
  // Find the maximum value to scale the bars
  const maxValue = Math.max(target, forecasted)
  
  // Calculate percentages relative to the max value
  const targetPercent = (target / maxValue) * 100
  const issuedPercent = (issued / maxValue) * 100
  const forecastedPercent = (forecasted / maxValue) * 100
  
  // Calculate percentages relative to target for labels
  const issuedVsTarget = (issued / target) * 100
  const forecastedVsTarget = (forecasted / target) * 100

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Target bar */}
      <div className="space-y-1">
        <ProgressPrimitive.Root className="h-8 w-full overflow-hidden rounded-full bg-gray-200">
          <ProgressPrimitive.Indicator
            className="h-full bg-gray-400 transition-all"
            style={{ width: `${targetPercent}%` }}
          />
        </ProgressPrimitive.Root>
        <div className="text-sm">
        <span style={{ color: 'rgb(156, 163, 175)' }}>■</span> FCT Issuance Target: <span style={{ color: 'rgb(156, 163, 175)', fontWeight: 'bold' }}>{target.toLocaleString()} FCT</span> per Adjustment Period
        </div>
      </div>

      {/* Issuance and Forecast bar */}
      <div className="space-y-1">
        <div className="relative h-8 w-full overflow-hidden rounded-full bg-transparent">
          {/* Issued FCT */}
          <div 
            className="absolute h-full bg-primary transition-all"
            style={{ width: `${issuedPercent}%` }}
          />
          {/* Forecasted FCT */}
          <div 
            className="absolute h-full bg-violet-400 transition-all"
            style={{ 
              left: `${issuedPercent}%`,
              width: `${forecastedPercent - issuedPercent}%`
            }}
          />
        </div>
        <div className="space-y-1 text-sm">
          <div>
          <span style={{ color: 'rgb(46, 5, 230)' }}>■</span> FCT Issued: <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>{issued.toLocaleString()} FCT</span> ({issuedVsTarget.toFixed(1)}% of Target)
          </div>
          <div>
          <span style={{ color: 'rgb(167, 139, 250)' }}>■</span> Forecasted FCT: <span style={{ color: 'rgb(167, 139, 250)', fontWeight: 'bold' }}>{forecasted.toLocaleString()} FCT</span> ({forecastedVsTarget.toFixed(1)}% of Target)
          </div>
        </div>
      </div>
    </div>
  )
}