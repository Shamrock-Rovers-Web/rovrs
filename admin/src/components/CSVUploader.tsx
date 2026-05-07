import React, { useState, useRef, useCallback, DragEvent } from 'react';

interface CSVUploaderProps {
  onUpload: (file: File, progress: number) => void;
  onError: (error: string) => void;
  maxSize?: number;
  requiredHeaders?: string[];
}

const CSVUploader: React.FC<CSVUploaderProps> = ({
  onUpload,
  onError,
  maxSize = 10 * 1024 * 1024, // 10MB default
  requiredHeaders = []
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        resolve('File must be a CSV file');
        return;
      }

      // Check file size
      if (file.size > maxSize) {
        resolve(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim() !== '');

          // Check if CSV is empty
          if (lines.length === 0) {
            resolve('CSV file is empty');
            return;
          }

          // Parse headers
          const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));

          // Check for required headers
          if (requiredHeaders.length > 0) {
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
            if (missingHeaders.length > 0) {
              resolve(`Required headers not found: ${missingHeaders.join(', ')}`);
              return;
            }
          }

          // Validate CSV structure
          for (let i = 1; i < Math.min(lines.length, 100); i++) {
            const columns = lines[i].split(',');
            // Basic validation - check if number of columns matches header
            if (columns.length !== headers.length) {
              resolve(`Row ${i + 1} has ${columns.length} columns, expected ${headers.length}`);
              return;
            }
          }

          resolve(null); // Valid CSV
        } catch (error) {
          resolve('Malformed CSV file');
        }
      };

      reader.onerror = () => {
        resolve('Error reading file');
      };

      reader.readAsText(file);
    });
  }, [maxSize, requiredHeaders]);

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setProgress(0);

    // Validate the file
    const validationError = await validateFile(selectedFile);
    if (validationError) {
      setFile(null);
      onError(validationError);
      return;
    }

    setIsUploading(true);

    // Simulate upload progress
    try {
      const uploadPromise = new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsUploading(false);
              resolve();
              return 100;
            }
            return prev + 10;
          });
        }, 200);
      });

      await uploadPromise;
      onUpload(selectedFile, 100);
    } catch (error) {
      onError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onUpload, onError]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      handleFile(selectedFile);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isUploading]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : file && !isUploading
            ? 'border-green-500 bg-green-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        data-drag-disabled={isUploading}
      >
        {file && !isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-medium text-gray-900">{file.name}</span>
            </div>
            <p className="text-sm text-gray-600">
              {Math.round(file.size / 1024)} KB • Ready to upload
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Remove File
            </button>
          </div>
        ) : isUploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg font-medium text-gray-900">Uploading...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{progress}%</p>
          </div>
        ) : (
          <div className="space-y-4">
            <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drag and drop CSV file here
              </p>
              <p className="text-sm text-gray-600 mt-1">
                or click to browse
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Browse Files
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv"
              className="hidden"
            />
          </div>
        )}
      </div>

      {requiredHeaders.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Required CSV headers:</strong> {requiredHeaders.join(', ')}
          </p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB</p>
        <p>Expected format: CSV with headers and rows of data</p>
      </div>
    </div>
  );
};

export default CSVUploader;