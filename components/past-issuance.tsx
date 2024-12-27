import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAdjustmentPeriodCheck } from '../utils/adjustmentPeriodCheck';

const pulseKeyframes = `
  @keyframes pulse-border {
    0%, 100% {
      border-color: rgba(250, 204, 21, 0.7);
    }
    50% {
      border-color: rgba(250, 204, 21, 1);
    }
  }
`;

const pulseStyle = `
  <style>
    ${pulseKeyframes}
    .pulse-border {
      animation: pulse-border 2s infinite;
    }
  </style>
`;

interface AdjustmentPeriod {
  'block-ending': number;
  fctMinted: number;
  fctMintRate: number;
}

interface PastIssuanceProps {
  currentStartBlock: number;
  currentEndBlock: number;
  currentIssuanceRate: number;
  currentFctIssued: number;
}

const TARGET_FCT = 400000;
const DESKTOP_BLOCKS_PER_ROW = 10;
const MOBILE_BLOCKS_PER_ROW = 5;
const BLOCKS_PER_PERIOD = 10000;

const shouldUseWhiteText = (fctMinted: number) => {
  const ratio = Math.min(fctMinted / (TARGET_FCT * 2), 1);
  return ratio > 0.5;
};

const getColor = (fctMinted: number) => {
  const ratio = Math.min(fctMinted / (TARGET_FCT * 2), 1);
  return `rgba(46, 5, 230, ${ratio})`;
};

const WHITE = '#FFFFFF';
const PURPLE = '#2E05E6';

export function PastIssuance({
  currentStartBlock,
  currentEndBlock,
  currentIssuanceRate,
  currentFctIssued
}: PastIssuanceProps) {
  const [data, setData] = useState<AdjustmentPeriod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openTooltipIndex, setOpenTooltipIndex] = useState<number | null>(null);
  const shouldRefetch = useAdjustmentPeriodCheck(currentEndBlock);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'https://ittybits.blob.core.windows.net/ittybits-assets/adjustment_periods.json.gz',
          {
            headers: { 'Cache-Control': 'no-cache' },
            params: { _: new Date().getTime() }
          }
        );
        const sortedData = response.data.sort(
          (a: AdjustmentPeriod, b: AdjustmentPeriod) =>
            a['block-ending'] - b['block-ending']
        );
        const limitedData = sortedData.slice(-19);
        setData(limitedData);
      } catch (error) {
        setError('Failed to fetch data. Please try again.');
      }
    };

    if (shouldRefetch) {
      fetchData();
    }
  }, [currentFctIssued, shouldRefetch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.tooltip-trigger')) {
        setOpenTooltipIndex(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const renderBlock = (period: AdjustmentPeriod | 'current', index: number) => {
    let startBlock: number;
    let endBlock: number;
    let fctMinted: number;
    let issuanceRate: number;
    let isCurrent = false;

    if (period === 'current') {
      startBlock = currentStartBlock;
      endBlock = currentEndBlock;
      fctMinted = currentFctIssued;
      issuanceRate = currentIssuanceRate;
      isCurrent = true;
    } else {
      startBlock = period['block-ending'] - BLOCKS_PER_PERIOD + 1;
      endBlock = period['block-ending'];
      fctMinted = period.fctMinted;
      // Convert WEI to GWEI for past blocks
      issuanceRate = period.fctMintRate / 1e9;
    }

    return (
      <TooltipProvider key={index}>
        <Tooltip open={openTooltipIndex === index}>
          <TooltipTrigger
            className={`relative w-full rounded-lg cursor-pointer transition-colors tooltip-trigger ${
              isCurrent ? 'border-2 border-yellow-400 pulse-border' : ''
            }`}
            style={{ backgroundColor: getColor(fctMinted) }}
            onClick={(e) => {
              e.stopPropagation();
              setOpenTooltipIndex(prevIndex => prevIndex === index ? null : index);
            }}
          >
            <div className="pb-[100%] relative">
              <div className="absolute inset-0 p-2">
                <div className="flex flex-col justify-between h-full text-[0.65rem]">
                  <div className={`text-left ${shouldUseWhiteText(fctMinted) ? 'text-white' : 'text-black'}`}>
                    {startBlock.toLocaleString()}
                  </div>
                  <div className={`self-end ${shouldUseWhiteText(fctMinted) ? 'text-white' : 'text-black'}`}>
                    {endBlock.toLocaleString()}
                  </div>
                </div>
                {isCurrent && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" sideOffset={-80} className="bg-white z-50">
            <div className="space-y-1 text-center text-xs">
              <div><b>Start Block:</b> {startBlock.toLocaleString()}</div>
              <div><b>End Block:</b> {isCurrent ? 'Pending' : endBlock.toLocaleString()}</div>
              <div><b>Issuance Rate:</b> {Math.round(issuanceRate).toLocaleString()} gwei</div>
              <div><b>FCT Issued:</b> {Math.round(fctMinted).toLocaleString()} FCT</div>
              {isCurrent && <div className="font-bold text-yellow-600">Current Period</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderBlocks = (blocksPerRow: number) => {
    if (!data.length) return null;

    const allPeriods: (AdjustmentPeriod | 'current')[] = [...data, 'current'];
    const numRows = Math.ceil(allPeriods.length / blocksPerRow);

    return Array.from({ length: numRows }).map((_, rowIndex) => (
      <div key={rowIndex} className={`grid ${blocksPerRow === 10 ? 'grid-cols-10' : 'grid-cols-5'} gap-1`}>
        {allPeriods.slice(rowIndex * blocksPerRow, (rowIndex + 1) * blocksPerRow).map((period, index) => renderBlock(period, rowIndex * blocksPerRow + index))}
      </div>
    ));
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div dangerouslySetInnerHTML={{ __html: pulseStyle }} />
      <div className="flex justify-between items-center">
        <p className="text-sm w-full">
          The heatmap below shows FCT issuance for the most recent Adjustment Periods, including the <span className="pulse-border inline-block">🟡</span>current period in progress, with lighter shades indicating lower issuance and darker purple shades indicating higher issuance.
        </p>
      </div>
      <div className="space-y-1">
        <div className="hidden md:block space-y-1">{renderBlocks(DESKTOP_BLOCKS_PER_ROW)}</div>
        <div className="md:hidden space-y-1">{renderBlocks(MOBILE_BLOCKS_PER_ROW)}</div>
      </div>

      {/* Footer Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
          <div
            className="w-full md:w-auto md:flex-1 h-2 rounded border border-grey"
            style={{
              background: `linear-gradient(to right, ${WHITE}, ${PURPLE})`,
            }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded border border-grey" style={{ backgroundColor: WHITE }} />
            <span>0 FCT</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>800K+ FCT</span>
            <div className="h-4 w-4 rounded" style={{ backgroundColor: PURPLE }} />
          </div>
        </div>
      </div>
    </div>
  );
}