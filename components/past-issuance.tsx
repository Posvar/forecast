'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AdjustmentPeriod {
  'block-ending': number
  fctMinted: number
  fctMintRate: number
}

const TARGET_FCT = 400000
const DESKTOP_BLOCKS_PER_ROW = 10
const MOBILE_BLOCKS_PER_ROW = 5
const PURPLE = '#2E05E6'
const WHITE = '#FFFFFF'

const shouldUseWhiteText = (fctMinted: number) => {
  const ratio = Math.min(fctMinted / (TARGET_FCT * 2), 1)
  return ratio > 0.5
}

const getColor = (fctMinted: number) => {
  const ratio = Math.min(fctMinted / (TARGET_FCT * 2), 1)
  return `rgba(46, 5, 230, ${ratio})`
}

const BlockTooltip = ({ period }: { period: AdjustmentPeriod }) => {
  const startBlock = period['block-ending'] - 9999
  const mintRateGwei = Math.round(period.fctMintRate / 1e9)
  
  return (
    <div className="space-y-1 p-2">
      <div>Start Block: {startBlock.toLocaleString()}</div>
      <div>End Block: {period['block-ending'].toLocaleString()}</div>
      <div>Issuance Rate: {mintRateGwei.toLocaleString()} gwei</div>
      <div>FCT Issued: {Math.round(period.fctMinted).toLocaleString()} FCT</div>
    </div>
  )
}

export function PastIssuance() {
  const [data, setData] = useState<AdjustmentPeriod[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://ittybits.blob.core.windows.net/ittybits-assets/adjustment_periods.json.gz')
        const sortedData = response.data.sort((a: AdjustmentPeriod, b: AdjustmentPeriod) => 
          a['block-ending'] - b['block-ending']
        )
        const limitedData = sortedData.slice(-20)
        setData(limitedData)
      } catch (error) {
        setError('Failed to fetch data. Please try again.')
      }
    }

    fetchData()
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  const renderBlocks = (blocksPerRow: number) => {
    const numRows = Math.ceil(data.length / blocksPerRow);
    const gridClass = blocksPerRow === 10 ? 'grid-cols-10' : 'grid-cols-5';
  
    return Array.from({ length: numRows }).map((_, rowIndex) => (
      <div key={rowIndex} className={`grid ${gridClass} gap-1`}>
        {data.slice(rowIndex * blocksPerRow, (rowIndex + 1) * blocksPerRow).map((period, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative aspect-square w-full rounded-lg cursor-pointer transition-colors p-2 flex flex-col justify-between text-[0.65rem]"
                  style={{ backgroundColor: getColor(period.fctMinted) }}
                >
                  <div className={shouldUseWhiteText(period.fctMinted) ? 'text-white' : 'text-black'}>
                    {(period['block-ending'] - 9999).toLocaleString()}
                  </div>
                  <div className={`text-right ${shouldUseWhiteText(period.fctMinted) ? 'text-white' : 'text-black'}`}>
                    {period['block-ending'].toLocaleString()}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-white">
                <BlockTooltip period={period} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    ));
  };  

  return (
    <div className="space-y-6">
      <p className="text-sm">
        The heatmap below shows FCT issuance for past Adjustment Periods, with lighter shades indicating lower issuance
        and darker purple shades indicating higher issuance relative to the target of {TARGET_FCT.toLocaleString()} FCT.
        Hover over (or tap on mobile) any block to see detailed information.
      </p>
  
      <div className="space-y-1">
        {/* Desktop view: Up to 10 columns */}
        <div className="hidden md:block space-y-1">
          {renderBlocks(10)}
        </div>
        {/* Mobile view: Up to 5 columns */}
        <div className="md:hidden space-y-1">
          {renderBlocks(5)}
        </div>
      </div>
  
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div
            className="w-full md:w-auto md:flex-1 h-2 rounded border border-black"
            style={{
              background: `linear-gradient(to right, ${WHITE}, ${PURPLE})`,
            }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded border border-black" style={{ backgroundColor: WHITE }} />
            <span>Issuance: 0 FCT</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: PURPLE }} />
            <span>Issuance: 800K+ FCT</span>
          </div>
        </div>
      </div>
    </div>
  );
}