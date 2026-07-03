import { ChevronLeft, ChevronRight, Expand, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getImageUrl } from "@/app/utils/images";

interface RoomImageGalleryProps {
  images?: string[];
  roomName?: string;
}

export function RoomImageGallery({ images = [], roomName = "Room" }: RoomImageGalleryProps) {
  const sources = useMemo(
    () => [...new Set(images.filter((image) => typeof image === "string" && image.trim()).map(getImageUrl))],
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, sources.length - 1)));
  }, [sources.length]);

  useEffect(() => {
    if (!fullScreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullScreen(false);
      if (event.key === "ArrowLeft") setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
      if (event.key === "ArrowRight") setActiveIndex((current) => (current + 1) % sources.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullScreen, sources.length]);

  if (sources.length === 0) {
    return <div className="grid min-h-64 place-items-center rounded-lg bg-slate-100"><div className="text-center"><ImageIcon className="mx-auto h-11 w-11 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-400">No room photos uploaded</p></div></div>;
  }

  const previous = () => setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
  const next = () => setActiveIndex((current) => (current + 1) % sources.length);
  const controls = sources.length > 1 && <>
    <button type="button" aria-label="Previous room image" onClick={(event) => { event.stopPropagation(); previous(); }} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
    <button type="button" aria-label="Next room image" onClick={(event) => { event.stopPropagation(); next(); }} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
  </>;

  return <>
    <div className="space-y-3">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-950">
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1}`} className="h-full w-full object-cover" />
        {controls}
        <span className="absolute left-3 top-3 rounded-md bg-slate-950/75 px-2.5 py-1 text-[11px] font-bold text-white">{activeIndex === 0 ? "Cover · " : ""}{activeIndex + 1} / {sources.length}</span>
        <button type="button" onClick={() => setFullScreen(true)} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-slate-950/75 px-3 py-2 text-xs font-bold text-white hover:bg-slate-950"><Expand className="h-3.5 w-3.5" />Full screen</button>
      </div>
      {sources.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label={`${roomName} image thumbnails`}>
        {sources.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => setActiveIndex(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${index === activeIndex ? "border-orange-500" : "border-transparent opacity-75 hover:opacity-100"}`}><img src={source} alt={`${roomName} thumbnail ${index + 1}`} className="h-full w-full object-cover" /></button>)}
      </div>}
    </div>

    {fullScreen && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/95 p-4" role="dialog" aria-modal="true" aria-label={`${roomName} full-screen photos`} onClick={(event) => { event.stopPropagation(); setFullScreen(false); }}>
      <button type="button" aria-label="Close full-screen preview" onClick={() => setFullScreen(false)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
      <div className="relative flex h-full w-full max-w-6xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1} full screen`} className="max-h-[88vh] max-w-full object-contain" />
        {controls}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white">{activeIndex + 1} / {sources.length}</span>
      </div>
    </div>}
  </>;
}
