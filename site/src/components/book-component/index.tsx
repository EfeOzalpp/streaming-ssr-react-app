import { useEffect, useState } from 'react';
import { getProjectData } from '../../utils/get-project-data';
import { useSsrData } from '../../utils/context-providers/ssr-data-context';
import { useTooltipInit } from '../../utils/tooltip/tooltipInit';
import type { ImageDemanded } from './types';
import { ClimateBookCanvas } from './ClimateBookCanvas';

export default function ClimateBookBlock() {
  const ssrData = useSsrData();

  // init global tooltip observers/handlers (same pattern as Rotary)
  useTooltipInit();

  const [raw, setRaw] = useState<ImageDemanded[] | null>(
    (ssrData?.preloaded?.climateBook as ImageDemanded[]) || null
  );

  useEffect(() => {
    if (raw) return;
    getProjectData<ImageDemanded[]>('climate-book').then(setRaw);
  }, [raw]);

  if (!raw) return null;

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <ClimateBookCanvas raw={raw} />
    </section>
  );
}
