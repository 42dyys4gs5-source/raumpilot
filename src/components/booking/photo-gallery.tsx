"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Photo = { src: string; thumb: string; alt: string; width: number; height: number };
export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  if (!photos.length) return null;
  const current = photos[index];
  function open(i: number) { setIndex(i); dialog.current?.showModal(); }
  function move(delta: number) { setIndex(i => (i + delta + photos.length) % photos.length); }
  return <>
    <div className="relative">
      <button type="button" onClick={() => open(0)} className="block w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700" aria-label={`Fotogalerie öffnen, ${photos.length} ${photos.length === 1 ? "Foto" : "Fotos"}`}>
        <img src={photos[0].src} alt={photos[0].alt} width={photos[0].width} height={photos[0].height} fetchPriority="high" className="max-h-[460px] w-full object-cover" />
        <span className="absolute bottom-4 right-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink-900 shadow-soft">{photos.length === 1 ? "Foto vergrössern" : `Alle ${photos.length} Fotos ansehen`}</span>
      </button>
    </div>
    {photos.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Weitere Raumfotos">{photos.map((p, i) => <button key={`${p.src}-${i}`} type="button" onClick={() => open(i)} aria-label={`Foto ${i + 1} vergrössern`} className="shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-brand-700"><img src={p.thumb} alt={p.alt} loading="lazy" width="120" height="80" className="h-20 w-28 object-cover" /></button>)}</div>}
    <dialog ref={dialog} aria-label="Raumfotos" className="fixed inset-0 m-auto max-h-[95dvh] w-[calc(100%-2rem)] max-w-5xl overflow-auto rounded-2xl bg-white p-4 text-ink-900 shadow-xl backdrop:bg-black/80" onKeyDown={e => { if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); } if (e.key === "ArrowRight") { e.preventDefault(); move(1); } }}>
      <div className="mb-3 flex items-center justify-between gap-4"><p aria-live="polite">Foto {index + 1} von {photos.length}</p><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Galerie schliessen" className="rounded-lg p-3 hover:bg-ink-100"><X className="size-5" /></button></div>
      <img src={current.src} alt={current.alt} width={current.width} height={current.height} className="max-h-[65dvh] w-full object-contain" />
      {photos.length > 1 && <div className="mt-3 flex justify-between gap-4"><button type="button" onClick={() => move(-1)} className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-3"><ChevronLeft className="size-4" />Zurück</button><button type="button" onClick={() => move(1)} className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-3">Weiter<ChevronRight className="size-4" /></button></div>}
    </dialog>
  </>;
}
