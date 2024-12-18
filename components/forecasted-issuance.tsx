import React, { useState } from 'react'
import { ProgressBar } from '@/components/progress-bar'

interface ForecastedIssuanceProps {
  forecastedRate: number
  l1Gas: number | undefined
  ethPrice: number | undefined
  changePercent: number
}

export function ForecastedIssuance({
  forecastedRate,
  l1Gas,
  ethPrice,
  changePercent
}: ForecastedIssuanceProps) {
  const [customGasPrice, setCustomGasPrice] = useState<string>(
    l1Gas !== undefined ? l1Gas.toFixed(2) : ''
  )

  const calculateMiningCost = (gasPrice: number, issuanceRate: number, ethPrice: number) => {
    const ethCostPerGas = gasPrice * 1e-9
    const fctPerGas = issuanceRate * 1e-9
    const ethCostPerFCT = ethCostPerGas / fctPerGas
    return ethCostPerFCT * ethPrice
  }

  const handleGasPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow empty string or valid numbers
    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setCustomGasPrice(value)
    }
  }

  const gasPrice = customGasPrice === '' ? 0 : parseFloat(customGasPrice)
  const forecastedMiningCostUSD = !isNaN(gasPrice) && ethPrice !== undefined
    ? calculateMiningCost(gasPrice, forecastedRate, ethPrice)
    : undefined

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Based on observed FCT Issuance during the current Adjustment Period, and assuming a similar rate of issuance for the remainder 
        of the Period, the FCT Issuance Rate is currently forecasted to <b>{changePercent >= 0 ? ' increase' : ' decrease'} by {Math.abs(changePercent).toFixed(1)}% </b> 
        for the next Adjustment Period. You can simulate the forecasted cost to mine 1 FCT by adjusting the Anticipated L1 gas value.
         {/* <i>Note: The 10M gwei max rate would only be approached if issuance remains consistently below target for prolonged periods, which is improbable under typical usage scenarios.</i> */}
      </p>
      
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 items-end gap-4">
          <div className="col-span-6">
            <div className="relative">
              <ProgressBar
                value={forecastedRate ?? 0}
                max={10000000}
                height="h-8"
                sublabel={`Max: ${(10000000).toLocaleString()} gwei`}
                indicatorColor="bg-[#A78BFA]"
              />
            </div>
            <div className="mt-2 text-sm text-left">
              <span style={{ color: 'rgb(167, 139, 250)' }}>■</span> Forecasted Rate:{' '}
              <span style={{ color: 'rgb(167, 139, 250)', fontWeight: 'bold' }}>
                {forecastedRate?.toLocaleString() ?? 'N/A'} gwei{' '}
              </span>
              per L1 calldata gas unit
            </div>
          </div>
          <div className="col-span-3">
            <div className="h-8 border border-black rounded-full flex items-center justify-center bg-white overflow-hidden">
              <input
                type="text"
                value={customGasPrice}
                onChange={handleGasPriceChange}
                className="w-16 bg-black text-white text-center focus:outline-none rounded-l-full"
                aria-label="L1 Gas Price in gwei"
              />
              <span className="text-black ml-1">gwei</span>
            </div>
            <div className="mt-2 text-sm text-left">
              <span className="text-black">■</span> Anticipated L1 Gas
            </div>
          </div>
          <div className="col-span-3">
            <div className="h-8 rounded-full bg-[#22C55E] flex items-center justify-center px-6 text-white whitespace-nowrap">
              ${forecastedMiningCostUSD !== undefined ? forecastedMiningCostUSD.toFixed(4) : 'N/A'}
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
              value={forecastedRate ?? 0}
              max={10000000}
              height="h-8"
              sublabel={`Max: ${(10000000).toLocaleString()} gwei`}
              indicatorColor="bg-[#A78BFA]"
            />
          </div>
          <div className="mt-2 text-sm text-left">
            <span style={{ color: 'rgb(167, 139, 250)' }}>■</span> Forecasted Rate:{' '}
            <span style={{ color: 'rgb(167, 139, 250)', fontWeight: 'bold' }}>
              {forecastedRate?.toLocaleString() ?? 'N/A'} gwei{' '}
            </span>
            per L1 calldata gas unit
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="h-8 border border-black rounded-full flex items-center justify-center bg-white overflow-hidden">
              <input
                type="text"
                value={customGasPrice}
                onChange={handleGasPriceChange}
                className="w-16 bg-black text-white text-center focus:outline-none rounded-l-full"
                aria-label="L1 Gas Price in gwei"
              />
              <span className="text-black ml-1">gwei</span>
            </div>
            <div className="text-sm text-left">
              <span className="text-black">■</span> Anticipated L1 Gas
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-8 rounded-full bg-[#22C55E] flex items-center justify-center px-6 text-white whitespace-nowrap">
              ${forecastedMiningCostUSD !== undefined ? forecastedMiningCostUSD.toFixed(4) : 'N/A'}
            </div>
            <div className="text-sm text-left">
              <span className="text-[#22C55E]">■</span> Cost to mine 1 FCT
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}