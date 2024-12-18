import React from 'react'
import { ProgressBar } from '@/components/progress-bar'

interface PeriodProgressionProps {
  blocksElapsed: number
  startBlock: number
  endBlock: number
  currentBlock: number
  blocksRemaining: number
  currentTarget: number // Add this line
}

export function PeriodProgression({
  blocksElapsed,
  startBlock,
  endBlock,
  currentBlock,
  currentTarget, // Add this line
  blocksRemaining
}: PeriodProgressionProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm">
      Facet currently targets an average issuance of <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>{(currentTarget / 10000).toLocaleString()} FCT  
        per block</span> during each Adjustment Period (10K blocks, or ~1.4 days), e.g., 400K FCT per Period. To maintain this target issuance, 
        Facet employs a dynamic issuance rate that updates with each new Period. This approach, inspired by Bitcoin's adaptive difficulty model, ensures 
        that issuance remains predictable and aligned with network demand. At the end of the current Adjustment Period, a new FCT issuance rate (see Forecast above) will be applied to the next Adjustment Period.
      </p>
      <ProgressBar
        value={blocksElapsed}
        max={10000}
        height="h-8"
        label={`Start Block: ${startBlock.toLocaleString()}`}
        sublabel={`End Block: ${endBlock.toLocaleString()}`}
        indicatorColor="bg-[#2E05E6]"
      />
      <div className="mt-2 grid gap-1 text-sm">
        <div>
          <span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Block:{' '}
          <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>
            {currentBlock.toLocaleString()}
          </span>{' '}
          ({((blocksElapsed / 10000) * 100).toFixed(1)}%)
        </div>
        <div>
          <span style={{ color: 'rgb(209, 213, 219)' }}>■</span> Remaining Blocks:{' '}
          {blocksRemaining.toLocaleString()} ({((blocksRemaining / 10000) * 100).toFixed(1)}%)
        </div>
      </div>
    </div>
  )
}