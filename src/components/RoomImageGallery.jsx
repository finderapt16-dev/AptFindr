import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getImageUrl } from "@/utils/images";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
export function RoomImageGallery({ images = [], roomName = "Unit", compact = false, unitCard = false }) {
    const sources = useMemo(() => [...new Set(images.filter((image) => typeof image === "string" && image.trim()).map(getImageUrl))], [images]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [fullScreen, setFullScreen] = useState(false);
    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(0, sources.length - 1)));
    }, [sources.length]);
    useEffect(() => {
        if (!fullScreen || compact)
            return;
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setFullScreen(false);
            if (event.key === "ArrowLeft")
                setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
            if (event.key === "ArrowRight")
                setActiveIndex((current) => (current + 1) % sources.length);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [fullScreen, sources.length, compact]);
    if (sources.length === 0) {
        return <div className="room-image-gallery-style-1"><div className="room-image-gallery-empty-content"><ImageIcon className="room-image-gallery-style-2"/><p className="room-image-gallery-style-3">No unit photos uploaded</p></div></div>;
    }
    const previous = () => setActiveIndex((current) => (current - 1 + sources.length) % sources.length);
    const next = () => setActiveIndex((current) => (current + 1) % sources.length);
    const controls = sources.length > 1 && <>
    <button type="button" aria-label="Previous unit image" onClick={(event) => { event.stopPropagation(); previous(); }} className="room-image-gallery-style-4 room-image-gallery-centered-y"><ChevronLeft className="room-image-gallery-style-5"/></button>
    <button type="button" aria-label="Next unit image" onClick={(event) => { event.stopPropagation(); next(); }} className="room-image-gallery-style-6 room-image-gallery-centered-y"><ChevronRight className="room-image-gallery-style-7"/></button>
  </>;
    return <>
    <div className={`room-image-gallery-style-8 ${unitCard ? "unit-card-room-gallery" : ""}`}>
      <div className="room-image-gallery-style-9">
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1}`} className="room-image-gallery-style-10"/>
        {unitCard && <div className="unit-card-gallery-layer"><button type="button" className="unit-card-gallery-expand" onClick={() => setFullScreen(true)} aria-label="View unit photos full screen" title="View full screen"><Maximize/></button>{sources.length > 1 && <><button type="button" className="unit-card-gallery-arrow unit-card-gallery-arrow-left" onClick={previous} aria-label="Previous unit photo"><ChevronLeft/></button><button type="button" className="unit-card-gallery-arrow unit-card-gallery-arrow-right" onClick={next} aria-label="Next unit photo"><ChevronRight/></button><div className="unit-card-gallery-dots">{sources.map((source, index) => <button key={source} type="button" aria-label={`Show unit photo ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)} />)}</div></>}</div>}
        {controls}
        {compact && sources.length > 1 && <div className="tenant-room-photo-dots">{sources.map((source, index) => <button key={source} type="button" aria-label={`Show unit photo ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)} />)}</div>}
        <span className="room-image-gallery-style-11">{activeIndex === 0 ? "Cover · " : ""}{activeIndex + 1} / {sources.length}</span>
        <button type="button" aria-label="View unit photos full screen" title="View full screen" onClick={() => setFullScreen(true)} className="room-image-gallery-style-12"><Maximize className="room-image-gallery-style-13"/></button>
      </div>
      {sources.length > 1 && <div className="room-image-gallery-style-14" aria-label={`${roomName} image thumbnails`}>
        {sources.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => setActiveIndex(index)} className={`room-image-gallery-dynamic-1 ${index === activeIndex ? "room-image-gallery-thumb-active" : "room-image-gallery-thumb-idle"}`}><img src={source} alt={`${roomName} thumbnail ${index + 1}`} className="room-image-gallery-style-15"/></button>)}
      </div>}
    </div>

    {fullScreen && compact && <Dialog open onOpenChange={setFullScreen}><DialogContent className="tenant-room-fullscreen" aria-describedby={undefined} onKeyDown={event => { if (event.key === "ArrowLeft") previous(); if (event.key === "ArrowRight") next(); }}><DialogTitle className="ui-sr-only">{roomName} full-screen photos</DialogTitle><img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1} full screen`} />{controls}<span className="tenant-room-fullscreen-count">{activeIndex + 1} / {sources.length}</span></DialogContent></Dialog>}
    {fullScreen && !compact && <div className="room-image-gallery-style-16" role="dialog" aria-modal="true" aria-label={`${roomName} full-screen photos`} onClick={(event) => { event.stopPropagation(); setFullScreen(false); }}>
      <button type="button" aria-label="Close full-screen preview" onClick={() => setFullScreen(false)} className="room-image-gallery-style-17"><X className="room-image-gallery-style-18"/></button>
      <div className="room-image-gallery-style-19" onClick={(event) => event.stopPropagation()}>
        <img src={sources[activeIndex]} alt={`${roomName} photo ${activeIndex + 1} full screen`} className="room-image-gallery-style-20"/>
        {controls}
        <span className="room-image-gallery-style-21 room-image-gallery-centered-x">{activeIndex + 1} / {sources.length}</span>
      </div>
    </div>}
  </>;
}
