import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export function NotificationActionsMenu({ children, open: controlledOpen, onOpenChange, triggerClassName = "", menuClassName = "" }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const setOpen = onOpenChange ?? setLocalOpen;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!anchor || !menu) return;
      const top = anchor.bottom + 6 + menu.height <= window.innerHeight - 8
        ? anchor.bottom + 6 : Math.max(8, anchor.top - menu.height - 6);
      setPosition({ top, left: Math.max(8, Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 8)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, [open, setOpen]);

  return <>
    <button ref={triggerRef} type="button" className={triggerClassName} aria-label="Notification actions" aria-haspopup="menu" aria-expanded={open} onClick={(event) => { event.stopPropagation(); setOpen(!open); }}><MoreVertical size={18} aria-hidden="true" /></button>
    {open && createPortal(<div ref={menuRef} role="menu" className={menuClassName} style={{ position: "fixed", top: position.top, left: position.left, right: "auto", zIndex: 10000, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)", overflowY: "auto" }} onClick={(event) => { event.stopPropagation(); if (event.target.closest("button") && !event.target.closest("button").disabled) setOpen(false); }}>{children}</div>, document.body)}
  </>;
}
