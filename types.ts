
export enum ConversionStatus {
  PENDING = 'pending',
  CONVERTING = 'converting',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ProcessedFile {
  id: string;
  originalFile: File;
  status: ConversionStatus;
  webpBlob?: Blob;
  webpName?: string;
  originalSize: number;
  convertedSize?: number;
  errorMessage?: string;
  previewUrl?: string; // For original image preview
}
