import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Loader2 } from 'lucide-react'
import { ProgressBar } from '../components/progress-bar'
import { IssuanceProgress } from '../components/issuance-progress'
import { CollapsibleSection } from '../components/collapsible-section'
import Image from 'next/image'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gray-50 pt-16">
      <header className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between p-4">
          <Image
            src="/images/logo.svg"
            alt="ForeCasT Logo"
            width={200}
            height={50}
            priority
          />
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
      <div className="mx-auto max-w-4xl space-y-6 pt-4">
        <CollapsibleSection title="About This Dashboard" defaultExpanded={false}>
          <p className="text-sm leading-relaxed">
            This dashboard provides an in-depth view of the data driving token issuance for Facet Protocol's native gas token, Facet Compute Token (FCT). Powered by Facet's innovative gas model, FCT issuance is dynamically regulated based on both Ethereum and Facet network activity, ensuring a secure and fair allocation process with deflationary properties. From target issuance rates and adjustment periods to the halving mechanism, this tool offers clear insights into how FCT is distributed over time.
          </p>
          <p className="mt-4 text-sm">
            Learn more about Facet's gas mechanism in{' '}
            <Link href="https://docs.facet.org/3.-technical-details/facets-gas-mechanism" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Facet Docs
            </Link>
            .
          </p>
        </CollapsibleSection>
        <div className="space-y-6">
          <CollapsibleSection title="FCT Issuance Halving Progression">
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
          </CollapsibleSection>

          <CollapsibleSection title="Adjustment Period Block Progression">
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
          </CollapsibleSection>

          <CollapsibleSection title="FCT Issuance Rate">
            <ProgressBar
              value={data.issuance.current}
              max={MAX_MINT_RATE}
              height="h-8"
              sublabel={`Max: ${MAX_MINT_RATE.toLocaleString()} gwei`}
            />
            <div className="mt-2 grid gap-1 text-sm">
              <div><span style={{ color: 'rgb(46, 5, 230)' }}>■</span> Current FCT Issuance Rate: {data.issuance.current.toLocaleString()} gwei per Calldata Gas Unit</div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="FCT Issuance (Current Adjustment Period)">
            <IssuanceProgress
              target={data.issuance.target}
              issued={data.issuance.issued}
              forecasted={data.issuance.forecasted}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Predictions for Next Adjustment Period">
            <div className="space-y-4">
              <p className="text-sm">
                The FCT Issuance Rate dynamically adjusts every 10K blocks (Adjustment Period) based on Actual FCT Issuance relative 
                to Target FCT Issuance. Based on observed FCT Issuance during the current Adjustment Period, the FCT Issuance Rate is 
                currently forecasted to <b>{data.issuance.changePercent >= 0 ? ' increase' : ' decrease'} by {Math.abs(data.issuance.changePercent).toFixed(1)}% </b> 
                for the next Adjustment Period. <i>Note: The 10M gwei max rate would only be approached if issuance remains consistently below target for prolonged periods, which is improbable under typical usage scenarios.</i>
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
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}