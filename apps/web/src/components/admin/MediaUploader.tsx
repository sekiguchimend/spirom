'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface MediaUploaderProps {
  onUploadComplete: (urls: string[]) => void;
  existingUrls?: string[];
  maxFiles?: number;
  acceptedTypes?: string[];
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
  url?: string;
}

export default function MediaUploader({
  onUploadComplete,
  existingUrls = [],
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'],
}: MediaUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingUrls);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // existingUrlsが変更された時に同期
  useEffect(() => {
    setUploadedUrls(existingUrls);
  }, [existingUrls]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'アップロードに失敗しました');
    }

    const data = await response.json();
    return data.url;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        console.warn(`Invalid file type: ${file.type}`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        console.warn(`File too large: ${file.name}`);
        return false;
      }
      return true;
    });

    if (uploadedUrls.length + validFiles.length > maxFiles) {
      alert(`最大${maxFiles}ファイルまでアップロードできます`);
      return;
    }

    // 初期状態を設定
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
    }));
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // 各ファイルをアップロード
    const results: string[] = [];
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        // プログレスを更新（簡易的に50%）
        setUploadingFiles(prev =>
          prev.map((uf, idx) =>
            idx === uploadingFiles.length + i ? { ...uf, progress: 50 } : uf
          )
        );

        const url = await uploadFile(file);
        results.push(url);

        // 完了を更新
        setUploadingFiles(prev =>
          prev.map((uf, idx) =>
            idx === uploadingFiles.length + i ? { ...uf, progress: 100, url } : uf
          )
        );
      } catch (error) {
        setUploadingFiles(prev =>
          prev.map((uf, idx) =>
            idx === uploadingFiles.length + i
              ? { ...uf, error: error instanceof Error ? error.message : 'Upload failed' }
              : uf
          )
        );
      }
    }

    // 成功したURLを追加
    if (results.length > 0) {
      const newUrls = [...uploadedUrls, ...results];
      setUploadedUrls(newUrls);
      onUploadComplete(newUrls);
    }

    // アップロード中のファイルをクリア（成功分）
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(uf => uf.error));
    }, 1000);
  }, [uploadedUrls, maxFiles, acceptedTypes, onUploadComplete, uploadingFiles.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeUrl = (index: number) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    setUploadedUrls(newUrls);
    onUploadComplete(newUrls);
  };

  const isVideo = (url: string) => {
    return /\.(mp4|webm|mov|ogg)($|\?)/i.test(url);
  };

  return (
    <div className="space-y-4">
      {/* ドロップゾーン */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-black bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-400"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-gray-600 font-medium">
            ドラッグ＆ドロップ または クリックしてファイルを選択
          </p>
          <p className="text-sm text-gray-400">
            JPG, PNG, WebP, GIF, MP4, WebM (最大10MB)
          </p>
        </div>
      </div>

      {/* アップロード中のファイル */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uf, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">{uf.file.name}</p>
                {uf.error ? (
                  <p className="text-xs text-red-500">{uf.error}</p>
                ) : (
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {uf.progress === 100 && (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* アップロード済みメディア */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {uploadedUrls.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
              {isVideo(url) ? (
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                  {index + 1}
                </span>
              </div>
              {isVideo(url) && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded">動画</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {uploadedUrls.length} / {maxFiles} ファイル
      </p>
    </div>
  );
}
