import { useEffect, useState } from "react";

// A calendar-boundary timer updates display statuses without polling Supabase.
export function useManilaDate() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        let timer;
        const refresh = () => {
            const date = new Date();
            setNow(date);
            const shifted = new Date(date.getTime() + 8 * 3600000);
            const nextMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1) - 8 * 3600000;
            clearTimeout(timer);
            timer = setTimeout(refresh, nextMidnight - date.getTime() + 50);
        };
        refresh();
        window.addEventListener("focus", refresh);
        return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); };
    }, []);
    return now;
}
