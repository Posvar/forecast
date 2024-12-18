import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Loader2 } from 'lucide-react'
import { ProgressBar } from '@/components/progress-bar'
import { IssuanceProgress } from '@/components/issuance-progress'
import { CollapsibleSection } from '@/components/collapsible-section'
import { AboutTooltip } from '@/components/about-tooltip'
import { HalvingProgression } from '@/components/halving-progression'
import { PeriodProgression } from '@/components/period-progression'
import { CurrentIssuance } from '@/components/current-issuance'
import { ForecastedIssuance } from '@/components/forecasted-issuance'
import Image from 'next/image'

// Constants
const API_URL_BLOCKS = 'https://explorer.facet.org/api/v2/main-page/blocks'
const CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000015'
const RPC_URL = 'https://mainnet.facet.org/'
const MAX_MINT_RATE = 10000000
const INITIAL_TARGET_FCT = 400000
const BLOCKS_PER_HALVING = 2630000
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY

// ABI
const ABI = [
  {
    "inputs": [],
    "name": "fctMintPeriodL1DataGas",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "fctMintRate",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

interface ForecastData {
  halving: {
    currentBlock: number
    startBlock: number
    endBlock: number
    blocksRemaining: number
    currentTarget: number
    nextTarget: number
  }
  adjustmentPeriod: {
    current: number
    startBlock: number
    endBlock: number
    blocksElapsed: number
    blocksRemaining: number
    currentBlock: number
    currentTarget: number // Add this line
  }
  issuance: {
    current: number
    target: number
    issued: number
    forecasted: number
    forecastedRate: number
    changePercent: number
    l1Gas: number | undefined
    miningCostUSD: number | undefined
    ethPrice: number | undefined
  }
}

export default function Component() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calculateTargetFCT = (blockHeight: number) => {
    const halvingPeriod = Math.floor(blockHeight / BLOCKS_PER_HALVING)
    return Math.floor(INITIAL_TARGET_FCT / Math.pow(2, halvingPeriod))
  }

  const fetchLatestBlockHeight = async () => {
    const response = await fetch(API_URL_BLOCKS)
    const data = await response.json()
    const latestBlockHeight = parseInt(data[0]?.height, 10)
    if (isNaN(latestBlockHeight)) throw new Error('Invalid block height')
    return latestBlockHeight
  }

  const fetchL1GasPrice = async () => {
    const response = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`)
    const data = await response.json()
    if (data.status !== '1') throw new Error('Failed to fetch gas price')
    return parseFloat(data.result.SafeGasPrice)
  }

  const fetchEthPrice = async () => {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const data = await response.json()
    return data.ethereum.usd
  }

  const calculateMiningCost = (l1Gas: number, issuanceRate: number, ethPrice: number) => {
    // Convert L1 gas price from gwei to ETH
    const ethCostPerGas = l1Gas * 1e-9
    
    // Convert issuance rate from gwei to FCT
    const fctPerGas = issuanceRate * 1e-9
    
    // Calculate ETH cost per FCT
    const ethCostPerFCT = ethCostPerGas / fctPerGas
    
    // Convert to USD
    return ethCostPerFCT * ethPrice
  }

  const fetchContractData = async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)

    const fctMintPeriodL1DataGas = await contract.fctMintPeriodL1DataGas()
    const fctMintRate = await contract.fctMintRate()

    const fctMintRateGwei = ethers.formatUnits(fctMintRate, 'gwei')
    const fctMined = fctMintPeriodL1DataGas * BigInt(Math.floor(Number(fctMintRateGwei) * 1e9))
    const fctMinedEther = parseFloat(ethers.formatEther(fctMined))

    return {
      fctMintedSoFar: Math.round(fctMinedEther),
      currentMintRate: Math.round(parseFloat(fctMintRateGwei))
    }
  }

  const calculateAdjustmentPrediction = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [totalBlocks, contractData] = await Promise.all([
        fetchLatestBlockHeight(),
        fetchContractData()
      ])

      let l1Gas, ethPrice
      try {
        [l1Gas, ethPrice] = await Promise.all([
          fetchL1GasPrice(),
          fetchEthPrice()
        ])
      } catch (error) {
        console.error('Error fetching L1 gas price or ETH price:', error)
        l1Gas = undefined
        ethPrice = undefined
      }

      const targetFCT = calculateTargetFCT(totalBlocks)
      const { fctMintedSoFar, currentMintRate } = contractData

      // Calculate mining cost
      const miningCostUSD = l1Gas !== undefined && ethPrice !== undefined
        ? calculateMiningCost(l1Gas, currentMintRate, ethPrice)
        : undefined

      // Calculate current adjustment period
      const currentPeriod = Math.floor(totalBlocks / 10000) + 1
      const periodStartBlock = (currentPeriod - 1) * 10000
      const periodEndBlock = periodStartBlock + 9999
      const blocksElapsedInPeriod = totalBlocks - periodStartBlock + 1
      const blocksRemaining = 10000 - blocksElapsedInPeriod

      const forecastedIssuance = Math.round((fctMintedSoFar / blocksElapsedInPeriod) * 10000)

      // Forecasted mint rate
      let forecastedMintRate = Math.round(
        currentMintRate * (targetFCT / forecastedIssuance)
      )

      // Apply bounds
      forecastedMintRate = Math.min(
        Math.max(forecastedMintRate, Math.round(currentMintRate * 0.5)),
        Math.min(MAX_MINT_RATE, currentMintRate * 2)
      )

      const changeInMintRatePercent = ((forecastedMintRate - currentMintRate) / currentMintRate) * 100
      const halvingPeriod = Math.floor(totalBlocks / BLOCKS_PER_HALVING)
      const halvingStartBlock = halvingPeriod * BLOCKS_PER_HALVING
      const halvingEndBlock = (halvingPeriod + 1) * BLOCKS_PER_HALVING - 1

      setData({
        halving: {
          currentBlock: totalBlocks,
          startBlock: halvingStartBlock,
          endBlock: halvingEndBlock,
          blocksRemaining: halvingEndBlock - totalBlocks + 1,
          currentTarget: targetFCT,
          nextTarget: targetFCT / 2
        },
        adjustmentPeriod: {
          current: currentPeriod,
          startBlock: periodStartBlock,
          endBlock: periodEndBlock,
          blocksElapsed: blocksElapsedInPeriod,
          currentTarget: targetFCT, // Add this line
          blocksRemaining,
          currentBlock: totalBlocks,
        },
        issuance: {
          current: currentMintRate,
          target: targetFCT,
          issued: fctMintedSoFar,
          forecasted: forecastedIssuance,
          forecastedRate: forecastedMintRate,
          changePercent: changeInMintRatePercent,
          l1Gas,
          miningCostUSD,
          ethPrice
        }
      })
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to fetch data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    calculateAdjustmentPrediction()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="rounded-lg bg-red-50 p-4 text-red-500">{error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <header className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between p-4">
          <div className="flex items-center">
            <Image
              src="/images/logo.svg"
              alt="ForeCasT Logo"
              width={200}
              height={39}
              priority
            />
            <AboutTooltip />
          </div>
          <button
            onClick={calculateAdjustmentPrediction}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-4xl space-y-2 pt-4">
        {data && (
          <div className="space-y-2">
            <CollapsibleSection title="Current FCT Issuance">
              <div className="space-y-4">
                <CurrentIssuance
                  current={data.issuance.current}
                  l1Gas={data.issuance.l1Gas}
                  miningCostUSD={data.issuance.miningCostUSD}
                />
                <p className="text-sm">
                  The issuance rate above remains constant from block-to-block within an Adjustment Period (10k blocks, or ~1.4 days), dynamically updating
                  at the onset of the next Adjustment Period. If total FCT issuance exceeds the Adjustment Period's target, the issuance rate will 
                  decrease in the next Adjustment Period. If issuance falls short of target, the issuance rate will increase. You can track the current 
                  Adjustment Period's issuance trend below and a forecast for the next Adjustment Period in the next section.
                </p>
                <IssuanceProgress
                  target={data.issuance.target}
                  issued={data.issuance.issued}
                  forecasted={data.issuance.forecasted}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Forecasted FCT Issuance">
              <ForecastedIssuance
                forecastedRate={data.issuance.forecastedRate}
                l1Gas={data.issuance.l1Gas}
                ethPrice={data.issuance.ethPrice}
                changePercent={data.issuance.changePercent}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Adjustment Period Progression">
              <PeriodProgression {...data.adjustmentPeriod} />
            </CollapsibleSection>

            <CollapsibleSection title="Issuance Halving Progression">
              <HalvingProgression {...data.halving} />
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  )
}