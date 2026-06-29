'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BANNER_ASPECT_HEIGHT,
  BANNER_ASPECT_WIDTH,
  BANNER_CROP_HEIGHT,
  BANNER_CROP_WIDTH,
} from '@/lib/banner-display';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

export type ImageCropAspectRatio = 'square' | 'banner';

interface CropPreset {
  viewportWidth: number;
  viewportHeight: number;
  outputWidth: number;
  outputHeight: number;
  hint: string;
}

interface ImageCropModalProps {
  imageSrc: string;
  open: boolean;
  title?: string;
  aspectRatio?: ImageCropAspectRatio;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

interface CropMetrics {
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const CROP_PRESETS: Record<ImageCropAspectRatio, CropPreset> = {
  square: {
    viewportWidth: 280,
    viewportHeight: 280,
    outputWidth: 512,
    outputHeight: 512,
    hint: 'Перетягніть зображення та збільште масштаб, щоб обрати область аватара.',
  },
  banner: {
    viewportWidth: 420,
    viewportHeight: Math.round(420 * (BANNER_ASPECT_HEIGHT / BANNER_ASPECT_WIDTH)),
    outputWidth: BANNER_CROP_WIDTH,
    outputHeight: BANNER_CROP_HEIGHT,
    hint: 'Перетягніть зображення та збільште масштаб, щоб обрати область банера.',
  },
};

function getInitialMetrics(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): CropMetrics {
  const baseScale = Math.max(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
  const displayWidth = naturalWidth * baseScale;
  const displayHeight = naturalHeight * baseScale;
  return {
    naturalWidth,
    naturalHeight,
    scale: baseScale,
    offsetX: (viewportWidth - displayWidth) / 2,
    offsetY: (viewportHeight - displayHeight) / 2,
  };
}

function clampMetrics(
  metrics: CropMetrics,
  viewportWidth: number,
  viewportHeight: number,
): CropMetrics {
  const displayWidth = metrics.naturalWidth * metrics.scale;
  const displayHeight = metrics.naturalHeight * metrics.scale;
  const minOffsetX = viewportWidth - displayWidth;
  const minOffsetY = viewportHeight - displayHeight;
  return {
    ...metrics,
    offsetX: Math.min(0, Math.max(minOffsetX, metrics.offsetX)),
    offsetY: Math.min(0, Math.max(minOffsetY, metrics.offsetY)),
  };
}

function renderCroppedImage(
  metrics: CropMetrics,
  image: HTMLImageElement,
  viewportWidth: number,
  viewportHeight: number,
  outputWidth: number,
  outputHeight: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) return image.src;
  const sourceX = -metrics.offsetX / metrics.scale;
  const sourceY = -metrics.offsetY / metrics.scale;
  const sourceWidth = viewportWidth / metrics.scale;
  const sourceHeight = viewportHeight / metrics.scale;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Image crop dialog with pan and zoom controls.
 */
export function ImageCropModal({
  imageSrc,
  open,
  title = 'Обрізати зображення',
  aspectRatio = 'square',
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const preset = CROP_PRESETS[aspectRatio];
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [metrics, setMetrics] = useState<CropMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const viewportWidth = preset.viewportWidth;
  const viewportHeight = preset.viewportHeight;

  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setIsVisible(true), 20);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const image = new Image();
    image.onload = () => {
      setMetrics(getInitialMetrics(image.naturalWidth, image.naturalHeight, viewportWidth, viewportHeight));
    };
    image.src = imageSrc;
  }, [imageSrc, open, viewportHeight, viewportWidth]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!metrics) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: metrics.offsetX,
      offsetY: metrics.offsetY,
    };
  }, [metrics]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || !metrics) return;
    const nextMetrics = clampMetrics({
      ...metrics,
      offsetX: dragStart.offsetX + (event.clientX - dragStart.x),
      offsetY: dragStart.offsetY + (event.clientY - dragStart.y),
    }, viewportWidth, viewportHeight);
    setMetrics(nextMetrics);
  }, [metrics, viewportHeight, viewportWidth]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleZoomChange = useCallback((zoomValue: number) => {
    setMetrics((current) => {
      if (!current) return current;
      const baseScale = Math.max(
        viewportWidth / current.naturalWidth,
        viewportHeight / current.naturalHeight,
      );
      const nextScale = baseScale * zoomValue;
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;
      const imageCenterX = (centerX - current.offsetX) / current.scale;
      const imageCenterY = (centerY - current.offsetY) / current.scale;
      return clampMetrics({
        ...current,
        scale: nextScale,
        offsetX: centerX - imageCenterX * nextScale,
        offsetY: centerY - imageCenterY * nextScale,
      }, viewportWidth, viewportHeight);
    });
  }, [viewportHeight, viewportWidth]);

  const handleConfirm = useCallback(() => {
    const image = imageRef.current;
    if (!image || !metrics) return;
    onConfirm(renderCroppedImage(
      metrics,
      image,
      viewportWidth,
      viewportHeight,
      preset.outputWidth,
      preset.outputHeight,
    ));
    onClose();
  }, [metrics, onClose, onConfirm, preset.outputHeight, preset.outputWidth, viewportHeight, viewportWidth]);

  const zoomValue = useMemo(() => {
    if (!metrics) return MIN_SCALE;
    const baseScale = Math.max(
      viewportWidth / metrics.naturalWidth,
      viewportHeight / metrics.naturalHeight,
    );
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, metrics.scale / baseScale));
  }, [metrics, viewportHeight, viewportWidth]);

  if (!open || !metrics) return null;

  const displayWidth = metrics.naturalWidth * metrics.scale;
  const displayHeight = metrics.naturalHeight * metrics.scale;
  const cardClassName = aspectRatio === 'banner'
    ? 'modal-card image-crop-card image-crop-card-wide'
    : 'modal-card image-crop-card';

  return (
    <div
      className={`modal-backdrop image-crop-backdrop${isVisible ? ' is-open' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`${cardClassName}${isVisible ? ' is-open' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost modal-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>
        <div className="image-crop-body">
          <p className="image-crop-hint">{preset.hint}</p>
          <div
            className="image-crop-viewport"
            style={{ width: viewportWidth, height: viewportHeight }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt=""
              draggable={false}
              className="image-crop-image"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `translate(${metrics.offsetX}px, ${metrics.offsetY}px)`,
              }}
            />
            <div className="image-crop-frame" aria-hidden="true" />
          </div>
          <label className="image-crop-zoom">
            <span>Масштаб</span>
            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              value={zoomValue}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Скасувати
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
}
