
import React from 'react';
import { ProcessedFile, ConversionStatus } from '../types';
import Button from './Button';
import Spinner from './Spinner';
import FileIcon from './icons/FileIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import DownloadIcon from './icons/DownloadIcon';

interface FileItemProps {
  file: ProcessedFile;
  onRemove: (fileId: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileItem: React.FC<FileItemProps> = ({ file, onRemove }) => {
  const handleDownload = () => {
    if (file.outputBlob && file.outputName) {
      const url = URL.createObjectURL(file.outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.outputName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 my-2 bg-secondary rounded-lg shadow">
      <div className="flex items-center space-x-3 flex-grow min-w-0">
        {file.previewUrl ? (
            <img src={file.previewUrl} alt={file.originalFile.name} className="w-10 h-10 object-cover rounded"/>
        ) : (
            <FileIcon className="w-8 h-8 text-secondary-foreground flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary-foreground truncate" title={file.originalFile.name}>
            {file.originalFile.name}
          </p>
          <p className="text-xs text-secondary-foreground">
            {formatBytes(file.originalFile.size)}
            {file.status === ConversionStatus.SUCCESS && file.convertedSize !== undefined && (
              <span className="text-green-400"> → {formatBytes(file.convertedSize)}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        {file.status === ConversionStatus.PENDING && (
          <p className="text-xs text-yellow-400">En attente...</p>
        )}
        {file.status === ConversionStatus.CONVERTING && (
          <Spinner size="sm" className="text-accent" />
        )}
        {file.status === ConversionStatus.SUCCESS && (
          <>
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <Button size="sm" variant="ghost" onClick={handleDownload} aria-label="Télécharger le fichier">
              <DownloadIcon className="w-4 h-4" />
            </Button>
          </>
        )}
        {file.status === ConversionStatus.ERROR && (
          <>
            <XCircleIcon className="w-5 h-5 text-red-500" />
            <p className="text-xs text-red-500 truncate max-w-xs" title={file.errorMessage}>
              {file.errorMessage || 'La conversion a échoué'}
            </p>
          </>
        )}
        <Button size="sm" variant="destructive" onClick={() => onRemove(file.id)} className="p-1.5">
            <XCircleIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default FileItem;
