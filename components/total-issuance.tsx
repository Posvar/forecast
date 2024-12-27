import React from 'react'
import { useAdjustmentPeriodCheck } from '../utils/adjustmentPeriodCheck';

interface TotalIssuanceProps {
  currentPeriodIssuance: number
  currentEndBlock: number
}

export function TotalIssuance({ currentPeriodIssuance, currentEndBlock }: TotalIssuanceProps) {
  const [totalPastIssuance, setTotalPastIssuance] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const shouldRefetch = useAdjustmentPeriodCheck(currentEndBlock);
  const initialFetchRef = React.useRef(false);

  React.useEffect(() => {
    const fetchPastIssuance = async () => {
      try {
        const response = await fetch('https://ittybits.blob.core.windows.net/ittybits-assets/adjustment_periods.json.gz', {
          headers: { 'Cache-Control': 'no-cache' },
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('Failed to fetch data')
        const data = await response.json()
        
        // Calculate total issuance from all past periods
        const total = data.reduce((sum: number, period: { fctMinted: number }) => sum + period.fctMinted, 0)
        setTotalPastIssuance(total)
        setIsLoading(false)
      } catch (error) {
        setError('Failed to fetch historical issuance data')
        setIsLoading(false)
      }
    }

    // Fetch on initial mount or when shouldRefetch is true
    if (!initialFetchRef.current || shouldRefetch) {
      initialFetchRef.current = true;
      fetchPastIssuance();
    }
  }, [shouldRefetch])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading total issuance data...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  const totalIssuance = totalPastIssuance + currentPeriodIssuance
  const formattedTotal = Math.round(totalIssuance).toLocaleString()

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <p className="text-sm">
          The total amount of FCT issued since launch, combining completed Adjustment Periods and the current Period's issuance.
        </p>
      </div>

      <div className="rounded-lg border-2 border-[#2E05E6] p-6 bg-white">
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold">{formattedTotal}</span>
            <span className="text-sm text-gray-500">Total FCT</span>
          </div>
        </div>
      </div>
    </div>
  )
}