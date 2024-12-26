import React from 'react'

interface TotalIssuanceProps {
  currentPeriodIssuance: number
}

export function TotalIssuance({ currentPeriodIssuance }: TotalIssuanceProps) {
  const [totalPastIssuance, setTotalPastIssuance] = React.useState<number>(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchPastIssuance = async () => {
      try {
        const response = await fetch('https://ittybits.blob.core.windows.net/ittybits-assets/adjustment_periods.json.gz')
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

    fetchPastIssuance()
  }, [])

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading total issuance data...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>
  }

  const totalIssuance = totalPastIssuance + currentPeriodIssuance
  const formattedTotal = Math.round(totalIssuance).toLocaleString()
  const pastIssuancePercentage = ((totalPastIssuance / totalIssuance) * 100).toFixed(1)
  const currentPeriodPercentage = ((currentPeriodIssuance / totalIssuance) * 100).toFixed(1)

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

