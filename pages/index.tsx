import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Loader2 } from 'lucide-react'
import { ProgressBar } from '../components/progress-bar'
import { IssuanceProgress } from '../components/issuance-progress'

// Constants
const API_URL_BLOCKS = 'https://explorer.facet.org/api/v2/main-page/blocks'
const CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000015'
const RPC_URL = 'https://mainnet.facet.org/'
const MAX_MINT_RATE = 10000000
const INITIAL_TARGET_FCT = 400000
const BLOCKS_PER_HALVING = 2630000

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

// Define the interface for the data structure
interface ForecastData {
  halving: {
    currentBlock: number
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
  }
  issuance: {
    current: number
    target: number
    issued: number
    forecasted: number
    forecastedRate: number
    changePercent: number
  }
}

export default function Home() {
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
      
      const totalBlocks = await fetchLatestBlockHeight()
      const targetFCT = calculateTargetFCT(totalBlocks)
      const contractData = await fetchContractData()
      const { fctMintedSoFar, currentMintRate } = contractData

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

      setData({
        halving: {
          currentBlock: totalBlocks,
          endBlock: (halvingPeriod + 1) * BLOCKS_PER_HALVING,
          blocksRemaining: ((halvingPeriod + 1) * BLOCKS_PER_HALVING) - totalBlocks,
          currentTarget: targetFCT,
          nextTarget: targetFCT / 2
        },
        adjustmentPeriod: {
          current: currentPeriod,
          startBlock: periodStartBlock,
          endBlock: periodEndBlock,
          blocksElapsed: blocksElapsedInPeriod,
          blocksRemaining,
          currentBlock: totalBlocks,
        },
        issuance: {
          current: currentMintRate,
          target: targetFCT,
          issued: fctMintedSoFar,
          forecasted: forecastedIssuance,
          forecastedRate: forecastedMintRate,
          changePercent: changeInMintRatePercent
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
          <h1 className="text-2xl font-bold">
            <span className="text-primary">F</span>
            <span className="text-gray-400">ore</span>
            <span className="text-primary">C</span>
            <span className="text-gray-400">as</span>
            <span className="text-primary">T</span>
          </h1>
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
        </header>

        <div className="space-y-6">
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">FCT Issuance Halving Progression:</h2>
            <div className="space-y-6">
              <div className="grid gap-2 text-sm">
                <div>Current FCT Issuance Target: <span className="text-primary">{data.halving.currentTarget.toLocaleString()} FCT</span> per Adjustment Period</div>
                <div>Next Issuance Target: <span className="text-primary">{data.halving.nextTarget.toLocaleString()} FCT</span> per Adjustment Period</div>
              </div>
              <ProgressBar
                value={data.halving.currentBlock}
                max={data.halving.endBlock}
                height="h-8"
                label={`Start Block: 0`}
                sublabel={`End Block: ${data.halving.endBlock.toLocaleString()}`}
              />
              <div className="grid gap-1 text-sm">
                <div><span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Block: <span className="text-primary">{data.halving.currentBlock.toLocaleString()}</span> ({((data.halving.currentBlock / data.halving.endBlock) * 100).toFixed(1)}%)</div>
                <div><span style={{ color: 'rgb(209, 213, 219)' }}>■</span> Remaining Blocks: {data.halving.blocksRemaining.toLocaleString()} ({((data.halving.blocksRemaining / data.halving.endBlock) * 100).toFixed(1)}%)</div>
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">Adjustment Period Block Progression:</h2>
            <ProgressBar
              value={data.adjustmentPeriod.blocksElapsed}
              max={10000}
              height="h-8"
              label={`Start Block: ${data.adjustmentPeriod.startBlock.toLocaleString()}`}
              sublabel={`End Block: ${data.adjustmentPeriod.endBlock.toLocaleString()}`}
            />
            <div className="mt-2 grid gap-1 text-sm">
              <div><span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current Block: <span className="text-primary">{data.adjustmentPeriod.currentBlock.toLocaleString()}</span> ({((data.adjustmentPeriod.blocksElapsed / 10000) * 100).toFixed(1)}%)</div>
              <div><span style={{ color: 'rgb(209, 213, 219)' }}>■</span> Remaining Blocks: {data.adjustmentPeriod.blocksRemaining.toLocaleString()} ({((data.adjustmentPeriod.blocksRemaining / 10000) * 100).toFixed(1)}%)</div>
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">FCT Issuance Rate:</h2>
            <ProgressBar
              value={data.issuance.current}
              max={MAX_MINT_RATE}
              height="h-8"
              sublabel={`Max: ${MAX_MINT_RATE.toLocaleString()} gwei`}
            />
            <div className="mt-2 grid gap-1 text-sm">
              <div><span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current FCT Issuance Rate: {data.issuance.current.toLocaleString()} gwei per Calldata Gas Unit</div>
            </div>
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">FCT Issuance (Current Adjustment Period):</h2>
            <IssuanceProgress
              target={data.issuance.target}
              issued={data.issuance.issued}
              forecasted={data.issuance.forecasted}
            />
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold">Predictions for Next Adjustment Period:</h2>
            <div className="space-y-4">
              <p className="text-sm">
                The FCT Issuance Rate dynamically adjusts every 10K blocks (Adjustment Period) based on
                Actual FCT Issuance relative to Target FCT Issuance. Based on observed FCT Issuance during the current Adjustment Period, the FCT Issuance Rate is currently forecasted to
                {data.issuance.changePercent >= 0 ? ' increase' : ' decrease'} by {Math.abs(data.issuance.changePercent).toFixed(1)}% 
                for the next Adjustment Period.
              </p>
              <ProgressBar
                value={data.issuance.forecastedRate}
                max={MAX_MINT_RATE}
                height="h-8"
                sublabel={`Max: ${MAX_MINT_RATE.toLocaleString()} gwei`}
                indicatorColor="bg-violet-400"
              />
            </div>
            <div className="mt-2 grid gap-1 text-sm">
              <div><span style={{ color: 'rgb(167, 139, 250)' }}>■</span> Forecasted FCT Issuance Rate: {data.issuance.forecastedRate.toLocaleString()} gwei per Calldata Gas Unit</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}