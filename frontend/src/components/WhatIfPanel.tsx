import React from 'react';
import { TimeEstimationPanel } from './TimeEstimationPanel';

interface WhatIfPanelProps {
  taskId?: number;
  initialData?: any;
}

export function WhatIfPanel({ taskId, initialData }: WhatIfPanelProps) {
  return <TimeEstimationPanel initialSection="simulator" />;
}
