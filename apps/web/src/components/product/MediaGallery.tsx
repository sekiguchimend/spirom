'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaGalleryProps {
  media: string[];
  productName: string;
  isNew?: boolean;
}

function getMediaType(url: string): 'image' | 'video' {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowerUrl = url.toLowerCase();

  // YouTube/Vimeo埋め込みURL
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('vimeo.com')) {
    return 'video';
  }

  // ファイル拡張子でチェック
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'video';
  }

  return 'image';
}

function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function getVimeoId(url: string): string | null {
  const regExp = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function MediaGallery({ media, productName, isNew }: MediaGalleryProps) {
  const { t } = useTranslation('products');
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaItems: MediaItem[] = media.map(url => ({
    url,
    type: getMediaType(url),
  }));

  const activeItem = mediaItems[activeIndex];

  const renderMainMedia = () => {
    if (!activeItem) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
          {t('media.noMedia')}
        </div>
      );
    }

    if (activeItem.type === 'video') {
      const youtubeId = getYouTubeId(activeItem.url);
      const vimeoId = getVimeoId(activeItem.url);

      if (youtubeId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
            title={productName}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }

      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={productName}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }

      // 通常の動画ファイル
      return (
        <video
          ref={videoRef}
          src={activeItem.url}
          className="absolute inset-0 w-full h-full object-contain"
          controls
          playsInline
        >
          <track kind="captions" />
        </video>
      );
    }

    return (
      <Image
        src={activeItem.url}
        alt={productName}
        fill
        className="object-contain"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    );
  };

  const renderThumbnail = (item: MediaItem, index: number) => {
    const isActive = index === activeIndex;

    if (item.type === 'video') {
      const youtubeId = getYouTubeId(item.url);

      return (
        <button
          key={index}
          type="button"
          onClick={() => setActiveIndex(index)}
          className={`w-14 h-14 relative bg-white rounded-lg overflow-hidden transition-all ${
            isActive ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
          }`}
        >
          {youtubeId ? (
            <Image
              src={`https://img.youtube.com/vi/${youtubeId}/default.jpg`}
              alt={`${productName} - ${t('media.video')} ${index + 1}`}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-500"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="white"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </button>
      );
    }

    return (
      <button
        key={index}
        type="button"
        onClick={() => setActiveIndex(index)}
        className={`w-14 h-14 relative bg-white rounded-lg overflow-hidden transition-all ${
          isActive ? 'ring-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
        }`}
      >
        <Image
          src={item.url}
          alt={`${productName} - ${t('media.image')} ${index + 1}`}
          fill
          className="object-contain p-1"
          sizes="56px"
        />
      </button>
    );
  };

  return (
    <div className="relative w-full max-w-lg">
      {isNew && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-white text-text-dark text-xs font-black px-3 py-1.5 rounded-full transform rotate-12 shadow-lg border border-text-dark/10">
            NEW
          </div>
        </div>
      )}

      {/* メインメディア */}
      <div className="aspect-square relative">
        {renderMainMedia()}
      </div>

      {/* ナビゲーション矢印 */}
      {mediaItems.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            aria-label={t('media.previousMedia')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
            aria-label={t('media.nextMedia')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* サムネイル */}
      {mediaItems.length > 1 && (
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          {mediaItems.map((item, index) => renderThumbnail(item, index))}
        </div>
      )}

      {/* メディアカウンター */}
      {mediaItems.length > 1 && (
        <div className="text-center mt-4 text-sm text-gray-500 font-medium">
          {activeIndex + 1} / {mediaItems.length}
        </div>
      )}
    </div>
  );
}
