import { useRef, useState, useCallback, useEffect } from "react";
import { Move } from "lucide-react";

const FIELD_DEFS = [
  { key: "name",       label: "Student Name",    color: "#3b82f6", default: { x1: 25, y1: 43, x2: 83, y2: 49 } },
  { key: "course",     label: "Course / Project", color: "#10b981", default: { x1: 29, y1: 62, x2: 75, y2: 72 } },
  { key: "issue_date", label: "Issue Date",       color: "#f59e0b", default: { x1: 30, y1: 75, x2: 70, y2: 82 } },
  { key: "student_id", label: "Student ID",       color: "#8b5cf6", default: { x1: 35, y1: 83, x2: 65, y2: 88 } },
  { key: "duration",   label: "Duration",         color: "#ef4444", default: { x1: 33, y1: 89, x2: 55, y2: 93 } },
  { key: "qr",         label: "QR Code",          color: "#6366f1", default: { x1: 82, y1: 82, x2: 97, y2: 97 } },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function CertificateTemplateEditor({ imageUrl, onChange }) {
  const containerRef = useRef(null);

  const [fields, setFields] = useState(() =>
    Object.fromEntries(FIELD_DEFS.map((f) => [f.key, { ...f.default }]))
  );

  const dragRef = useRef(null);

  useEffect(() => {
    if (onChange) onChange(fields);
  }, [fields]);

  const getPct = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      px: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      py: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }, []);

  const onMouseDown = useCallback((e, key, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const { px, py } = getPct(e.clientX, e.clientY);
    dragRef.current = { key, mode, startX: px, startY: py, startField: { ...fields[key] } };

    const onMove = (ev) => {
      const { px: cx, py: cy } = getPct(ev.clientX, ev.clientY);
      const dx = cx - dragRef.current.startX;
      const dy = cy - dragRef.current.startY;
      const sf = dragRef.current.startField;
      setFields((prev) => {
        const next = { ...prev };
        if (dragRef.current.mode === "move") {
          const w = sf.x2 - sf.x1;
          const h = sf.y2 - sf.y1;
          const nx1 = clamp(sf.x1 + dx, 0, 100 - w);
          const ny1 = clamp(sf.y1 + dy, 0, 100 - h);
          next[key] = { x1: nx1, y1: ny1, x2: nx1 + w, y2: ny1 + h };
        } else {
          next[key] = {
            x1: sf.x1, y1: sf.y1,
            x2: clamp(sf.x2 + dx, sf.x1 + 2, 100),
            y2: clamp(sf.y2 + dy, sf.y1 + 2, 100),
          };
        }
        return next;
      });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [fields, getPct]);

  const resetField = (key) => {
    const def = FIELD_DEFS.find((f) => f.key === key);
    setFields((prev) => ({ ...prev, [key]: { ...def.default } }));
  };

  return (
    <div>
      <p className="mb-3 text-[11px] text-slate-500 leading-relaxed">
        Drag each colored box to position it. Drag the corner handle to resize.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {FIELD_DEFS.map((f) => (
          <button key={f.key} type="button" onClick={() => resetField(f.key)}
            title="Reset to default"
            className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold transition hover:opacity-80"
            style={{ borderColor: f.color, color: f.color, background: f.color + "18" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
            {f.label}
          </button>
        ))}
      </div>
      <div ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-xl border border-slate-200 shadow-sm"
        style={{ touchAction: "none" }}>
        <img src={imageUrl} alt="Certificate template" className="block w-full pointer-events-none" draggable={false} />
        {FIELD_DEFS.map((def) => {
          const f = fields[def.key];
          return (
            <div key={def.key} onMouseDown={(e) => onMouseDown(e, def.key, "move")}
              style={{
                position: "absolute",
                left: `${f.x1}%`, top: `${f.y1}%`,
                width: `${f.x2 - f.x1}%`, height: `${f.y2 - f.y1}%`,
                border: `2px solid ${def.color}`,
                background: def.color + "28",
                cursor: "move", boxSizing: "border-box",
              }}>
              <span className="absolute left-1 top-0.5 text-[9px] font-bold leading-none"
                style={{ color: def.color, pointerEvents: "none" }}>
                {def.label}
              </span>
              <div onMouseDown={(e) => onMouseDown(e, def.key, "resize-br")}
                style={{
                  position: "absolute", right: 0, bottom: 0,
                  width: 14, height: 14, background: def.color,
                  cursor: "se-resize", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Move size={8} color="#fff" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Positions are sent automatically when generating certificates.</p>
    </div>
  );
}
