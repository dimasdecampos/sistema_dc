import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crop, X } from 'lucide-react';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const MIN_SIZE = 48;

const RATIOS: { label: string; value: number | null }[] = [
  { label: 'Livre', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
];

interface ImageCropperProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  /** Mantém a foto como está, sem recortar */
  onSkip?: () => void;
  onCancel: () => void;
}

function fullRect(W: number, H: number, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, w: W, h: H };
  let w = W;
  let h = w / ratio;
  if (h > H) {
    h = H;
    w = h * ratio;
  }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ src, onConfirm, onSkip, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [ratio, setRatio] = useState<number | null>(null);
  const [error, setError] = useState('');
  const drag = useRef<{ mode: DragMode; px: number; py: number; start: Rect } | null>(null);

  const handleLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const s = { w: img.clientWidth, h: img.clientHeight };
    setSize(s);
    setRect(fullRect(s.w, s.h, null));
  };

  // Mantém o recorte coerente se a janela for redimensionada
  useEffect(() => {
    const onResize = () => {
      const img = imgRef.current;
      if (!img) return;
      setSize({ w: img.clientWidth, h: img.clientHeight });
      setRect(fullRect(img.clientWidth, img.clientHeight, ratio));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ratio]);

  const chooseRatio = (value: number | null) => {
    setRatio(value);
    if (size) setRect(fullRect(size.w, size.h, value));
  };

  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, start: rect };
  };

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || !size) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      const s = d.start;

      if (d.mode === 'move') {
        setRect({
          ...s,
          x: Math.min(Math.max(0, s.x + dx), size.w - s.w),
          y: Math.min(Math.max(0, s.y + dy), size.h - s.h),
        });
        return;
      }

      // Redimensionar: o canto oposto fica fixo
      const left = d.mode === 'nw' || d.mode === 'sw';
      const top = d.mode === 'nw' || d.mode === 'ne';
      const ax = left ? s.x + s.w : s.x;
      const ay = top ? s.y + s.h : s.y;
      const px = Math.min(Math.max(0, (left ? s.x : s.x + s.w) + dx), size.w);
      const py = Math.min(Math.max(0, (top ? s.y : s.y + s.h) + dy), size.h);

      const availW = left ? ax : size.w - ax;
      const availH = top ? ay : size.h - ay;
      let w = Math.min(Math.max(Math.abs(px - ax), MIN_SIZE), availW);
      let h = Math.min(Math.max(Math.abs(py - ay), MIN_SIZE), availH);

      if (ratio) {
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        if (h > availH) {
          h = availH;
          w = h * ratio;
        }
        if (w > availW) {
          w = availW;
          h = w / ratio;
        }
      }

      setRect({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
    },
    [size, ratio]
  );

  const endDrag = () => {
    drag.current = null;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !size) return;
    const scaleX = img.naturalWidth / size.w;
    const scaleY = img.naturalHeight / size.h;
    const sw = Math.max(1, Math.round(rect.w * scaleX));
    const sh = Math.max(1, Math.round(rect.h * scaleY));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Não foi possível processar a imagem.');
      return;
    }
    try {
      ctx.drawImage(img, Math.round(rect.x * scaleX), Math.round(rect.y * scaleY), sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (blob) onConfirm(blob);
          else setError('Não foi possível gerar o recorte.');
        },
        'image/jpeg',
        0.92
      );
    } catch {
      setError('Esta foto não pode ser recortada (bloqueio de acesso à imagem).');
    }
  };

  const handleCls =
    'absolute w-6 h-6 bg-white border-2 border-amber-500 rounded-full shadow-md touch-none';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Crop className="w-4 h-4 text-amber-600" />
            Recortar foto
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-900 flex items-center justify-center p-4">
          <div className="relative inline-block select-none" style={{ touchAction: 'none' }}>
            <img
              ref={imgRef}
              src={src}
              alt="Foto para recortar"
              crossOrigin="anonymous"
              onLoad={handleLoad}
              draggable={false}
              className="block max-w-full max-h-[55vh] w-auto h-auto"
            />
            {size && (
              <div
                className="absolute inset-0"
                onPointerMove={onMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <div
                  onPointerDown={startDrag('move')}
                  className="absolute border-2 border-white cursor-move touch-none"
                  style={{
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    boxShadow: '0 0 0 9999px rgba(2,6,23,0.6)',
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/25" />
                    ))}
                  </div>
                  <span onPointerDown={startDrag('nw')} className={`${handleCls} -left-3 -top-3 cursor-nwse-resize`} />
                  <span onPointerDown={startDrag('ne')} className={`${handleCls} -right-3 -top-3 cursor-nesw-resize`} />
                  <span onPointerDown={startDrag('sw')} className={`${handleCls} -left-3 -bottom-3 cursor-nesw-resize`} />
                  <span onPointerDown={startDrag('se')} className={`${handleCls} -right-3 -bottom-3 cursor-nwse-resize`} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => chooseRatio(r.value)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                  ratio === r.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-rose-700">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Usar sem recortar
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!size}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Aplicar recorte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type CropResult = { status: 'cropped'; blob: Blob } | { status: 'skipped' } | { status: 'cancelled' };

/**
 * Hook que abre o recortador sob demanda.
 * `requestCrop(file)` resolve com o recorte, "skipped" (usar original) ou "cancelled".
 */
export function useImageCropper() {
  const [src, setSrc] = useState<string | null>(null);
  const resolver = useRef<((r: CropResult) => void) | null>(null);
  const objectUrl = useRef<string | null>(null);

  const close = (result: CropResult) => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setSrc(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  const requestCrop = (source: File | Blob | string, allowSkip = true) =>
    new Promise<CropResult>((resolve) => {
      resolver.current = resolve;
      if (typeof source === 'string') {
        setSrc(source);
      } else {
        objectUrl.current = URL.createObjectURL(source);
        setSrc(objectUrl.current);
      }
      skipAllowed.current = allowSkip;
    });

  const skipAllowed = useRef(true);

  const cropperElement = src ? (
    <ImageCropper
      src={src}
      onConfirm={(blob) => close({ status: 'cropped', blob })}
      onSkip={skipAllowed.current ? () => close({ status: 'skipped' }) : undefined}
      onCancel={() => close({ status: 'cancelled' })}
    />
  ) : null;

  return { requestCrop, cropperElement };
}
