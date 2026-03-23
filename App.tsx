
import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { ProcessedFile, ConversionStatus } from './types';
import Dropzone from './components/Dropzone';
import FileItem from './components/FileItem';
import Button from './components/Button';

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);

  const convertToWebP = useCallback(async (file: File, quality: number = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('File is not a PNG or JPEG.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context.'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas toBlob failed to create WebP.'));
              }
            },
            'image/webp',
            quality
          );
        };
        img.onerror = (e) => {
          reject(new Error('Failed to load image for conversion.'));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        } else {
          reject(new Error('File reading resulted in null.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const processFile = useCallback(async (fileId: string) => {
    setFiles(prevFiles =>
      prevFiles.map(f => f.id === fileId ? { ...f, status: ConversionStatus.CONVERTING } : f)
    );

    const fileToProcess = files.find(f => f.id === fileId);
    if (!fileToProcess || fileToProcess.status !== ConversionStatus.PENDING) {
        // Find the file again from the latest state if it was updated by setFiles
        const currentFileToProcess = files.find(f => f.id === fileId && f.status === ConversionStatus.PENDING);
        if(!currentFileToProcess) {
             console.warn(`File ${fileId} not found or not pending for processing.`);
             return;
        }
    }

    // Use the file from the current state iteration to avoid stale closures
    const currentFile = files.find(f => f.id === fileId);
    if (!currentFile) return;


    try {
      const webpBlob = await convertToWebP(currentFile.originalFile);
      const webpName = currentFile.originalFile.name.replace(/\.(png|jpe?g)$/i, '.webp');
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === fileId
            ? { ...f, status: ConversionStatus.SUCCESS, webpBlob, webpName, convertedSize: webpBlob.size }
            : f
        )
      );
    } catch (error) {
      console.error('Conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === fileId ? { ...f, status: ConversionStatus.ERROR, errorMessage } : f
        )
      );
    }
  }, [convertToWebP, files]); // Added files to dependency array for processFile


  useEffect(() => {
    const pendingFile = files.find(f => f.status === ConversionStatus.PENDING);
    if (pendingFile) {
      processFile(pendingFile.id);
    }
  }, [files, processFile]);


  const handleFilesAdded = useCallback((incomingFiles: File[]) => {
    const newProcessedFiles: ProcessedFile[] = incomingFiles
      .filter(file => ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) // Ensure only valid images are added
      .filter(file => !files.some(existingFile => existingFile.originalFile.name === file.name && existingFile.originalFile.size === file.size)) // Avoid duplicates
      .map(file => {
        const previewUrl = URL.createObjectURL(file); // Create preview URL
        return {
          id: crypto.randomUUID(),
          originalFile: file,
          status: ConversionStatus.PENDING,
          originalSize: file.size,
          previewUrl: previewUrl,
        };
      });

    setFiles(prevFiles => [...prevFiles, ...newProcessedFiles]);
  }, [files]); // files dependency is important here

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prevFiles => {
        const fileToRemove = prevFiles.find(f => f.id === fileId);
        if (fileToRemove && fileToRemove.previewUrl) {
            URL.revokeObjectURL(fileToRemove.previewUrl); // Clean up preview URL
        }
        return prevFiles.filter(f => f.id !== fileId);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    files.forEach(file => {
        if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl);
        }
    });
    setFiles([]);
  }, [files]);

  const handleDownloadAll = useCallback(async () => {
    const successfulFiles = files.filter(f => f.status === ConversionStatus.SUCCESS && f.webpBlob && f.webpName);
    if (successfulFiles.length === 0) return;

    const zip = new JSZip();
    successfulFiles.forEach(file => {
      zip.file(file.webpName!, file.webpBlob!);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate zip:', error);
      alert('Failed to generate ZIP file.');
    }
  }, [files]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-3xl mb-8 text-center">
        <h1 className="text-4xl font-bold font-heading text-accent">Image to WebP Converter</h1>
        <p className="text-secondary-foreground mt-2">
          Drag and drop your PNG or JPEG files below to convert them to WebP format instantly.
        </p>
      </header>

      <main className="w-full max-w-3xl">
        <Dropzone onFilesAdded={handleFilesAdded} accept="image/png, image/jpeg, image/jpg" />

        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold font-heading text-primary-foreground">
                Conversion Queue ({files.filter(f=> f.status !== ConversionStatus.SUCCESS && f.status !== ConversionStatus.ERROR).length})
                 / Completed ({files.filter(f=> f.status === ConversionStatus.SUCCESS || f.status === ConversionStatus.ERROR).length})
              </h2>
              <div className="flex gap-2">
                {files.some(f => f.status === ConversionStatus.SUCCESS) && (
                  <Button variant="accent" size="sm" onClick={handleDownloadAll}>
                    Download All
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              </div>
            </div>
            {files.map(file => (
              <FileItem key={file.id} file={file} onRemove={handleRemoveFile} />
            ))}
          </div>
        )}
      </main>
      <footer className="w-full max-w-3xl mt-12 text-center text-sm text-secondary-foreground">
        <p>&copy; {new Date().getFullYear()} Image to WebP Converter. All conversions are done client-side in your browser.</p>
      </footer>
    </div>
  );
};

export default App;
