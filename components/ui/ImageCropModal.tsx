'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CROP_VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 512;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

interface ImageCropModalProps {
  imageSrc: string;
  open: boolean;
  title?: string;
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

function getInitialMetrics(naturalWidth: number, naturalHeight: number): CropMetrics {
  const baseScale = Math.max(CROP_VIEWPORT_SIZE / naturalWidth, CROP_VIEWPORT_SIZE / naturalHeight);
  const displayWidth = naturalWidth * baseScale;
  const displayHeight = naturalHeight * baseScale;
  return {
    naturalWidth,
    naturalHeight,
    scale: baseScale,
    offsetX: (CROP_VIEWPORT_SIZE - displayWidth) / 2,
    offsetY: (CROP_VIEWPORT_SIZE - displayHeight) / 2,
  };
}

function clampMetrics(metrics: CropMetrics): CropMetrics {
  const displayWidth = metrics.naturalWidth * metrics.scale;
  const displayHeight = metrics.naturalHeight * metrics.scale;
  const minOffsetX = CROP_VIEWPORT_SIZE - displayWidth;
  const minOffsetY = CROP_VIEWPORT_SIZE - displayHeight;
  return {
    ...metrics,
    offsetX: Math.min(0, Math.max(minOffsetX, metrics.offsetX)),
    offsetY: Math.min(0, Math.max(minOffsetY, metrics.offsetY)),
  };
}

function renderCroppedImage(metrics: CropMetrics, image: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return image.src;
  const sourceX = -metrics.offsetX / metrics.scale;
  const sourceY = -metrics.offsetY / metrics.scale;
  const sourceSize = CROP_VIEWPORT_SIZE / metrics.scale;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Square image crop dialog with pan and zoom controls.
 */
export function ImageCropModal({
  imageSrc,
  open,
  title = 'Обрізати зображення',
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [metrics, setMetrics] = useState<CropMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
      setMetrics(getInitialMetrics(image.naturalWidth, image.naturalHeight));
    };
    image.src = imageSrc;
  }, [imageSrc, open]);

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
    });
    setMetrics(nextMetrics);
  }, [metrics]);

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
        CROP_VIEWPORT_SIZE / current.naturalWidth,
        CROP_VIEWPORT_SIZE / current.naturalHeight,
      );
      const nextScale = baseScale * zoomValue;
      const centerX = CROP_VIEWPORT_SIZE / 2;
      const centerY = CROP_VIEWPORT_SIZE / 2;
      const imageCenterX = (centerX - current.offsetX) / current.scale;
      const imageCenterY = (centerY - current.offsetY) / current.scale;
      return clampMetrics({
        ...current,
        scale: nextScale,
        offsetX: centerX - imageCenterX * nextScale,
        offsetY: centerY - imageCenterY * nextScale,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const image = imageRef.current;
    if (!image || !metrics) return;
    onConfirm(renderCroppedImage(metrics, image));
    onClose();
  }, [metrics, onClose, onConfirm]);

  if (!open || !metrics) return null;

  const baseScale = Math.max(
    CROP_VIEWPORT_SIZE / metrics.naturalWidth,
    CROP_VIEWPORT_SIZE / metrics.naturalHeight,
  );
  const zoomValue = Math.min(MAX_SCALE, Math.max(MIN_SCALE, metrics.scale / baseScale));
  const displayWidth = metrics.naturalWidth * metrics.scale;
  const displayHeight = metrics.naturalHeight * metrics.scale;

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
        className={`modal-card image-crop-card${isVisible ? ' is-open' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost modal-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>
        <div className="image-crop-body">
          <p className="image-crop-hint">Перетягніть зображення та збільште масштаб, щоб обрати область аватара.</p>
          <div
            className="image-crop-viewport"
            style={{ width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE }}
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
