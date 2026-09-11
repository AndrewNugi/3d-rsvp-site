import { useEffect, useRef, type CSSProperties } from "react";

export const PHOTOS = [
    { id: "p1", src: "/photos/IMG_7806.JPG", caption: "Venue: Langata Botanical Gardens" },
    { id: "p2", src: "/photos/IMG_7835.JPG", caption: "Date: 19th September" },
    // { id: "p3", src: "/photos/IMG_7828.JPG", caption: "Theme: Burgundy" },
];

export default function Polaroids() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const target = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const MAX = 14;   // max tilt in degrees

        const onMove = (e: MouseEvent) => {
            const r = wrap.getBoundingClientRect();
            const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
            const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
            target.current = {
                x: Math.max(-1, Math.min(1, px)) * MAX,
                y: Math.max(-1, Math.min(1, py)) * -MAX,
            };
        };

        const onLeave = () => { target.current = { x: 0, y: 0 }; };

        wrap.addEventListener("mousemove", onMove);
        wrap.addEventListener("mouseleave", onLeave);

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        const tick = () => {
            current.current.x = lerp(current.current.x, target.current.x, 0.06);
            current.current.y = lerp(current.current.y, target.current.y, 0.06);
            wrap.style.setProperty("--rotateY", `${current.current.x}deg`);
            wrap.style.setProperty("--rotateX", `${current.current.y}deg`);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            wrap.removeEventListener("mousemove", onMove);
            wrap.removeEventListener("mouseleave", onLeave);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <div
            ref={wrapRef}
            className="polaroids"
            style={{ "--rotateX": "0deg", "--rotateY": "0deg" } as CSSProperties}
        >
            {PHOTOS.map((p, i) => (
                <div
                    key={p.id}
                    className="polaroid"
                    style={{ "--delay": `${i * 0.4}s` } as CSSProperties}
                >
                    <div className="polaroid-inner">
                        <div className="polaroid-image">
                            <img src={p.src} alt="" decoding="async"/>
                        </div>
                        <span className="polaroid-caption">{p.caption}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}