
export interface ProcessedImage {
  id: string;
  originalName: string;
  processedUrl: string; // The 800x800 circle PNG
  originalFile: File;   // Keep track of the original file for re-scaling
  scale: number;        // Zoom level (1.0 = fit)
  position: { x: number; y: number }; // Offset from center in pixels
  aiSuggestion?: string;
  status: 'processing' | 'ready' | 'error' | 'filling';
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
