import React from 'react'
import { ProgressBar } from '@/components/progress-bar'

interface HalvingProgressionProps {
  currentBlock: number
  startBlock: number
  endBlock: number
  blocksRemaining: number
  currentTarget: number
  nextTarget: number
}

const BLOCKS_PER_HALVING = 2630000

export function HalvingProgression({
  currentBlock,
  startBlock,
  endBlock,
  blocksRemaining,
  currentTarget,
  nextTarget
}: HalvingProgressionProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm">
        To regulate total supply, issuance undergoes an annual halving (every 2.63M blocks) by reducing the issuance target by half. 
        This mechanism serves to de-risk early adoption by issuing more FCT in the earlier years. With this model, effectively half of the FCT 
        that will ever exist will be issued during the first year of the protocol. Total supply will converge towards 210M FCT, with 99%+ issued by 
        the end of year 7.
      </p>
      <div className="grid gap-2 text-sm">
        <div>When the current Halving period ends, the next issuance target will halve from <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>{(currentTarget / 10000).toLocaleString()} FCT</span> to <span style={{ color: 'rgb(167, 139, 250)', fontWeight: 'bold' }}>{(nextTarget / 10000).toLocaleString()} FCT per block</span>.</div>
      </div>
      <ProgressBar
        value={currentBlock - startBlock}
        max={BLOCKS_PER_HALVING}
        height="h-8"
        label={`Start Block: ${startBlock.toLocaleString()}`}
        sublabel={`End Block: ${endBlock.toLocaleString()}`}
        indicatorColor="bg-[#2E05E6]"
      />
      <div className="grid gap-1 text-sm">
        <div><span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Block: <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>{currentBlock.toLocaleString()}</span> ({((currentBlock - startBlock) / BLOCKS_PER_HALVING * 100).toFixed(1)}%)</div>
        <div><span style={{ color: 'rgb(209, 213, 219)' }}>■</span> Remaining Blocks: {blocksRemaining.toLocaleString()} ({(blocksRemaining / BLOCKS_PER_HALVING * 100).toFixed(1)}%)</div>
      </div>
    </div>
  )
}