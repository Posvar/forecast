import { useState, useEffect } from 'react';

const ADJUSTMENT_PERIOD_BLOCKS = 10000;

export function useAdjustmentPeriodCheck(currentBlock: number) {
  const [lastCheckedPeriod, setLastCheckedPeriod] = useState<number>(0);
  const [shouldRefetch, setShouldRefetch] = useState<boolean>(false);

  useEffect(() => {
    const currentPeriod = Math.floor(currentBlock / ADJUSTMENT_PERIOD_BLOCKS);
    if (currentPeriod > lastCheckedPeriod) {
      setLastCheckedPeriod(currentPeriod);
      setShouldRefetch(true);
    } else {
      setShouldRefetch(false);
    }
  }, [currentBlock, lastCheckedPeriod]);

  return shouldRefetch;
}