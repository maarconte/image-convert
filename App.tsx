
import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { ProcessedFile, ConversionStatus } from './types';
import Dropzone from './components/Dropzone';
import FileItem from './components/FileItem';
import Button from './components/Button';
import AppleIcon from './components/icons/AppleIcon';
import WindowsIcon from './components/icons/WindowsIcon';
import LogoTHATMUCH from './assets/img/LogoTHATMUCH_Footer.webp';
import LogoFormatFlip from './assets/img/icon.png';

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [targetFormat, setTargetFormat] = useState<'webp' | 'avif'>('webp');

  const convertToFormat = useCallback(async (file: File, format: 'webp' | 'avif', quality: number = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        reject(new Error("Le fichier n'est ni un PNG ni un JPEG."));
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
                reject(new Error(`Canvas toBlob failed to create ${format.toUpperCase()}.`));
              }
            },
            `image/${format}`,
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
      const outputBlob = await convertToFormat(currentFile.originalFile, targetFormat);
      const outputName = currentFile.originalFile.name.replace(/\.(png|jpe?g)$/i, `.${targetFormat}`);
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === fileId
            ? { ...f, status: ConversionStatus.SUCCESS, outputBlob, outputName, convertedSize: outputBlob.size }
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
  }, [convertToFormat, files, targetFormat]); // Added dependencies


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
    const successfulFiles = files.filter(f => f.status === ConversionStatus.SUCCESS && f.outputBlob && f.outputName);
    if (successfulFiles.length === 0) return;

    const zip = new JSZip();
    successfulFiles.forEach(file => {
      zip.file(file.outputName!, file.outputBlob!);
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

  const handleDownloadApp = useCallback((os: 'mac' | 'windows') => {
    const url = os === 'mac' ? '/downloads/ImageConverter-Mac.dmg' : '/downloads/ImageConverter-Windows.exe';
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-3xl mb-8 text-center">
        <div className="flex items-center justify-center space-x-8 mb-8">
          <img src={LogoFormatFlip} alt="FormatFlip" className="w-20" />
          <h1 className="text-6xl font-bold font-heading text-white leading-tight">Format<span className="text-accent">Flip</span></h1>
        </div>
        <p className="text-secondary-foreground mt-2">
          Glissez-déposez vos fichiers PNG ou JPEG ci-dessous pour les convertir instantanément.
        </p>
      </header>

      <main className="w-full max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setTargetFormat('webp')}
            className={`text-left bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all hover:bg-white/10 group ${
              targetFormat === 'webp' 
                ? 'border-accent ring-1 ring-accent shadow-[0_0_20px_rgba(15,199,210,0.15)]' 
                : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors ${
                  targetFormat === 'webp' ? 'bg-accent text-primary' : 'bg-accent/20 text-accent'
                }`}>W</div>
                <h3 className="text-xl font-bold font-heading text-white">WebP</h3>
              </div>
              {targetFormat === 'webp' && (
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-secondary-foreground text-sm leading-relaxed">
              Le format de Google. Compression supérieure (<strong>jusqu'à 30%</strong> v. JPEG) sans perte de qualité visible. Supporte la transparence.
            </p>
          </button>

          <button 
            onClick={() => setTargetFormat('avif')}
            className={`text-left bg-white/5 backdrop-blur-sm border rounded-2xl p-6 transition-all hover:bg-white/10 group ${
              targetFormat === 'avif' 
                ? 'border-pink-500 ring-1 ring-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors ${
                  targetFormat === 'avif' ? 'bg-pink-500 text-white' : 'bg-pink-500/20 text-pink-500'
                }`}>A</div>
                <h3 className="text-xl font-bold font-heading text-white">AVIF</h3>
              </div>
              {targetFormat === 'avif' && (
                <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-secondary-foreground text-sm leading-relaxed">
              La nouvelle génération. Basé sur AV1, il est encore plus performant (<strong>jusqu'à 50%</strong> v. JPEG). Le choix du futur.
            </p>
          </button>
        </div>

        <Dropzone onFilesAdded={handleFilesAdded} accept="image/png, image/jpeg, image/jpg" />

        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold font-heading text-primary-foreground">
                File d'attente ({files.filter(f=> f.status !== ConversionStatus.SUCCESS && f.status !== ConversionStatus.ERROR).length})
                 / Terminés ({files.filter(f=> f.status === ConversionStatus.SUCCESS || f.status === ConversionStatus.ERROR).length})
              </h2>
              <div className="flex gap-2">
                {files.some(f => f.status === ConversionStatus.SUCCESS) && (
                  <Button variant="accent" size="sm" onClick={handleDownloadAll}>
                    Tout télécharger
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleClearAll}>
                  Tout effacer
                </Button>
              </div>
            </div>
            {files.map(file => (
              <FileItem key={file.id} file={file} onRemove={handleRemoveFile} />
            ))}
          </div>
        )}
  {/*
        <div className="mt-16 w-full text-center bg-secondary/30 rounded-xl p-8 border border-secondary shadow-sm">
          <h2 className="text-2xl font-bold font-heading text-primary-foreground mb-3">Téléchargez l'Application Bureau</h2>
          <p className="text-secondary-foreground mb-6">Le top pour des conversions illimitées, hors ligne et encore plus rapides directement depuis votre ordinateur.</p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2" onClick={() => handleDownloadApp('mac')}>
              <AppleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Version macOS</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2" onClick={() => handleDownloadApp('windows')}>
              <WindowsIcon className="w-5 h-5 flex-shrink-0" />
              <span>Version Windows</span>
            </Button>
          </div>
        </div>
        */}
      </main>
      <footer className="w-full max-w-3xl mt-12 text-center text-sm text-secondary-foreground">
        <p className="text-xs opacity-50">&copy; {new Date().getFullYear()} THATMUCH. FormatFlip. Toutes les conversions sont effectuées localement dans votre navigateur.</p>
       <a href="https://thatmuch.fr" target="_blank" rel="noopener noreferrer"><img src={LogoTHATMUCH} alt="THATMUCH" className="w-32" /></a>
      </footer>
    </div>
  );
};

export default App;
