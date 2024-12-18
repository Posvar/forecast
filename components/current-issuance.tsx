import React from 'react'
import { ProgressBar } from '@/components/progress-bar'

interface CurrentIssuanceProps {
  current: number
  l1Gas: number | undefined
  miningCostUSD: number | undefined
}

export function CurrentIssuance({
  current,
  l1Gas,
  miningCostUSD
}: CurrentIssuanceProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Facet transactions are sent as regular Ethereum transactions. The amount of FCT issued to the sender is based on the size of the 
        L1 transaction's calldata. For every calldata gas unit burned on L1, Facet issues an amount of FCT per the current issuance rate below:
      </p>
      
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 items-end gap-4">
          <div className="col-span-6">
            <div className="relative">
              <ProgressBar
                value={current ?? 0}
                max={10000000}
                height="h-8"
                sublabel={`Max: ${(10000000).toLocaleString()} gwei`}
                indicatorColor="bg-[#2E05E6]"
              />
            </div>
            <div className="mt-2 text-sm text-left">
              <span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Rate:{' '}
              <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>
                {current?.toLocaleString() ?? 'N/A'} gwei{' '}
              </span>
              per L1 calldata gas unit
            </div>
          </div>
          <div className="col-span-3">
            <div className="h-8 rounded-full bg-black flex items-center px-6 justify-center text-white whitespace-nowrap">
              {l1Gas !== undefined ? l1Gas.toFixed(2) : 'N/A'} gwei
            </div>
            <div className="mt-2 text-sm text-left">
              <span className="text-black">■</span> Current L1 Gas
            </div>
          </div>
          <div className="col-span-3">
            <div className="h-8 rounded-full bg-[#22C55E] flex items-center justify-center px-6 text-white whitespace-nowrap">
              ${miningCostUSD !== undefined ? miningCostUSD.toFixed(4) : 'N/A'}
            </div>
            <div className="mt-2 text-sm text-left">
              <span className="text-[#22C55E]">■</span> Cost to mine 1 FCT
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-4">
        <div>
          <div className="relative">
            <ProgressBar
              value={current ?? 0}
              max={10000000}
              height="h-8"
              sublabel={`Max: ${(10000000).toLocaleString()} gwei`}
              indicatorColor="bg-[#2E05E6]"
            />
          </div>
          <div className="mt-2 text-sm text-left">
            <span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Rate:{' '}
            <span style={{ color: 'rgb(46, 5, 230)', fontWeight: 'bold' }}>
              {current?.toLocaleString() ?? 'N/A'} gwei{' '}
            </span>
            per L1 calldata gas unit
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="h-8 rounded-full bg-black flex items-center justify-center px-6 text-white whitespace-nowrap">
              {l1Gas !== undefined ? l1Gas.toFixed(2) : 'N/A'} gwei
            </div>
            <div className="mt-2 text-sm text-left">
              <span className="text-black">■</span> Current L1 Gas
            </div>
          </div>
          <div>
            <div className="h-8 rounded-full bg-[#22C55E] flex items-center justify-center px-6 text-white whitespace-nowrap">
              ${miningCostUSD !== undefined ? miningCostUSD.toFixed(4) : 'N/A'}
            </div>
            <div className="mt-2 text-sm text-left">
              <span className="text-[#22C55E]">■</span> Cost to mine 1 FCT
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}