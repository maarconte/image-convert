
import React, { useState, useCallback, useRef } from 'react';
import UploadIcon from './icons/UploadIcon';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string; // e.g., "image/png, image/jpeg"
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, accept }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if the leave target is outside the dropzone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true); // Ensure dragging state is true
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files && files.length > 0) {
      const acceptedFiles = accept
        ? files.filter(file => accept.split(',').map(s => s.trim()).includes(file.type))
        : files;
      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles);
      }
      e.dataTransfer.clearData();
    }
  }, [onFilesAdded, accept]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        const acceptedFiles = accept
        ? files.filter(file => accept.split(',').map(s => s.trim()).includes(file.type))
        : files;
      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles);
      }
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-accent bg-secondary/50' : 'border-secondary hover:border-accent/70'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileInputChange}
        accept={accept}
      />
      <UploadIcon className={`mx-auto mb-4 h-12 w-12 ${isDragging ? 'text-accent' : 'text-secondary-foreground'}`} />
      <p className={`text-lg font-semibold ${isDragging ? 'text-accent' : 'text-primary-foreground'}`}>
        Drag & drop vos fichiers PNG ou JPEG ici
      </p>
      <p className="text-sm text-secondary-foreground">ou cliquez pour sélectionner des fichiers</p>
      {accept && <p className="text-xs text-secondary-foreground mt-2">Seuls les fichiers {accept} sont acceptés.</p>}
    </div>
  );
};

export default Dropzone;
