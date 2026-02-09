// src/components/general-iu/tooltip/tooltipInit.ts
import { useEffect } from 'react';
import { initGlobalTooltip } from '.';
import { useRealMobileViewport } from '../../../behaviors/useRealMobile';

export const useTooltipInit = () => {
  const isRealMobile = useRealMobileViewport();

  useEffect(() => {
    const dispose = initGlobalTooltip(isRealMobile);
    return () => dispose?.();
  }, [isRealMobile]);
};
