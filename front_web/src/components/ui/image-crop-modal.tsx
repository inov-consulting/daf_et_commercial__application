'use client';

import { useRef, useState } from 'react';
import { XIcon, CheckIcon, CircleNotchIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@phosphor-icons/react';

// ── Constants ─────────────────────────────────────────────────────────────────
const VIEWPORT = 280; // px — displayed crop circle diameter
const OUTPUT   = 256; // px — output canvas size

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  src: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ImageCropModal({ src, onConfirm, onCancel }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom,      setZoom]      = useState(1);
  const [offset,    setOffset]    = useState({ x: 0, y: 0 });
  const [cropping,  setCropping]  = useState(false);

  // Natural dimensions + cover-fit scale, set once image loads
  const natural = useRef({ w: 0, h: 0, fitScale: 1 });

  // Pointer drag state (ref — no re-render on change)
  const drag = useRef({ active: false, mx: 0, my: 0, ox: 0, oy: 0 });

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Display size of the image at the current zoom level. */
  function displaySize(z = zoom) {
    const { w, h, fitScale } = natural.current;
    return { dW: w * fitScale * z, dH: h * fitScale * z };
  }

  /** Clamp offset so the image always covers the circular viewport. */
  function clampOff(x: number, y: number, z = zoom) {
    const { dW, dH } = displaySize(z);
    return {
      x: Math.min(0, Math.max(VIEWPORT - dW, x)),
      y: Math.min(0, Math.max(VIEWPORT - dH, y)),
    };
  }

  // ── Image load ────────────────────────────────────────────────────────────

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    // "Cover" scale: shorter side fills VIEWPORT exactly
    const fitScale = Math.max(VIEWPORT / w, VIEWPORT / h);
    natural.current = { w, h, fitScale };
    const dW = w * fitScale;
    const dH = h * fitScale;
    setOffset({ x: (VIEWPORT - dW) / 2, y: (VIEWPORT - dH) / 2 });
    setImgLoaded(true);
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { active: true, mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.mx;
    const dy = e.clientY - drag.current.my;
    setOffset(clampOff(drag.current.ox + dx, drag.current.oy + dy));
  }

  function onPointerUp() {
    drag.current.active = false;
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  function handleZoom(newZ: number) {
    const c = VIEWPORT / 2;
    const scale = newZ / zoom;
    // Keep viewport center stable
    const nx = c - (c - offset.x) * scale;
    const ny = c - (c - offset.y) * scale;
    setZoom(newZ);
    setOffset(clampOff(nx, ny, newZ));
  }

  // ── Crop & export ─────────────────────────────────────────────────────────

  async function handleConfirm() {
    setCropping(true);

    const { fitScale } = natural.current;
    const displayScale = fitScale * zoom; // natural → display px

    // Viewport center in natural image coordinates
    const naturalCX = (VIEWPORT / 2 - offset.x) / displayScale;
    const naturalCY = (VIEWPORT / 2 - offset.y) / displayScale;
    // Viewport radius in natural coordinates
    const naturalR = VIEWPORT / 2 / displayScale;

    const canvas = document.createElement('canvas');
    canvas.width  = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d')!;

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw the cropped region onto the canvas
    const img = new window.Image();
    img.src = src;
    await new Promise<void>(res => { img.onload = () => res(); });
    ctx.drawImage(
      img,
      naturalCX - naturalR, naturalCY - naturalR, // source x, y
      naturalR * 2, naturalR * 2,                  // source w, h
      0, 0, OUTPUT, OUTPUT,                        // dest
    );

    const result = canvas.toDataURL('image/jpeg', 0.92);
    setCropping(false);
    onConfirm(result);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const { dW, dH } = displaySize();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,33,28,0.55)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[380px]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd-def)]">
          <div>
            <h3 className="text-[14px] font-bold text-[var(--tx-1)]">Recadrer la photo</h3>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Faites glisser pour centrer · Zoomez avec le curseur</p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Crop viewport */}
        <div className="flex flex-col items-center py-6 px-5 gap-4">
          <div
            className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{
              width:  VIEWPORT,
              height: VIEWPORT,
              borderRadius: '50%',
              border: '3px solid var(--p500)',
              boxShadow: '0 0 0 6px rgba(27,107,69,0.10), 0 4px 24px rgba(0,0,0,0.12)',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position:      'absolute',
                width:         dW || '100%',
                height:        dH || 'auto',
                left:          offset.x,
                top:           offset.y,
                pointerEvents: 'none',
                userSelect:    'none',
              }}
            />

            {/* Loading overlay */}
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-sink)]">
                <CircleNotchIcon size={24} className="animate-spin text-[var(--tx-3)]" />
              </div>
            )}

            {/* Rule-of-thirds grid */}
            {imgLoaded && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={VIEWPORT}
                height={VIEWPORT}
              >
                {[1, 2].map(n => (
                  <g key={n}>
                    <line
                      x1={VIEWPORT * n / 3} y1={0}
                      x2={VIEWPORT * n / 3} y2={VIEWPORT}
                      stroke="rgba(255,255,255,0.35)" strokeWidth="1"
                    />
                    <line
                      x1={0} y1={VIEWPORT * n / 3}
                      x2={VIEWPORT} y2={VIEWPORT * n / 3}
                      stroke="rgba(255,255,255,0.35)" strokeWidth="1"
                    />
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => handleZoom(Math.max(1, zoom - 0.1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
            >
              <MagnifyingGlassMinusIcon size={15} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => handleZoom(Number(e.target.value))}
              className="flex-1 cursor-pointer"
              style={{ accentColor: 'var(--p500)' }}
              aria-label="Niveau de zoom"
            />
            <button
              onClick={() => handleZoom(Math.min(3, zoom + 0.1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
            >
              <MagnifyingGlassPlusIcon size={15} />
            </button>
            <span className="text-[11px] font-medium text-[var(--tx-3)] w-9 text-right tabular-nums flex-shrink-0">
              {zoom.toFixed(1)}×
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-[var(--bd-def)]">
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-lg border border-[var(--bd-def)] text-[13px] font-semibold text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={!imgLoaded || cropping}
            onClick={handleConfirm}
            className="h-10 px-5 rounded-lg text-[13px] font-bold text-white flex items-center gap-2 transition-opacity disabled:opacity-50 disabled:cursor-wait hover:opacity-90"
            style={{ background: 'var(--p500)' }}
          >
            {cropping
              ? <CircleNotchIcon size={14} className="animate-spin" />
              : <CheckIcon size={14} weight="bold" />}
            Recadrer &amp; appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
