import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardPlus,
  Eraser,
  FileText,
  Info,
  RotateCcw,
  SmilePlus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  OdontogramData,
  SurfaceCondition,
  ToothRecord,
  ToothSurface,
  WholeToothCondition,
} from "@/lib/types";

/* ─────────────── CONSTANTES CLINICAS FDI / MINSA ─────────────── */

export const ADULT_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"] as const;
export const ADULT_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"] as const;
export const ADULT_LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"] as const;
export const ADULT_LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"] as const;

export const CHILD_UPPER_RIGHT = ["55", "54", "53", "52", "51"] as const;
export const CHILD_UPPER_LEFT = ["61", "62", "63", "64", "65"] as const;
export const CHILD_LOWER_RIGHT = ["85", "84", "83", "82", "81"] as const;
export const CHILD_LOWER_LEFT = ["71", "72", "73", "74", "75"] as const;

export interface SurfaceToolDef {
  id: SurfaceCondition;
  label: string;
  short: string;
  color: string;
  fill: string;
  stroke: string;
  tone: "red" | "blue" | "neutral";
  sigla?: string;
}

export const SURFACE_TOOLS: SurfaceToolDef[] = [
  {
    id: "caries",
    label: "Caries dental",
    short: "Caries",
    color: "#dc2626",
    fill: "#ef4444",
    stroke: "#b91c1c",
    tone: "red",
  },
  {
    id: "resina_buena",
    label: "Obturacion / Resina (Buen estado)",
    short: "Resina (OK)",
    color: "#2563eb",
    fill: "#3b82f6",
    stroke: "#1d4ed8",
    tone: "blue",
  },
  {
    id: "resina_mala",
    label: "Obturacion filtrada / Defectuosa",
    short: "Obt. Filtrada",
    color: "#dc2626",
    fill: "#fca5a5",
    stroke: "#dc2626",
    tone: "red",
  },
  {
    id: "amalgama",
    label: "Amalgama (Buen estado)",
    short: "Amalgama",
    color: "#1e40af",
    fill: "#1d4ed8",
    stroke: "#1e3a8a",
    tone: "blue",
    sigla: "AM",
  },
  {
    id: "sellante_bueno",
    label: "Sellante de fosas y fisuras (Buen estado)",
    short: "Sellante (S)",
    color: "#2563eb",
    fill: "#dbeafe",
    stroke: "#2563eb",
    tone: "blue",
    sigla: "S",
  },
  {
    id: "sellante_malo",
    label: "Sellante parcial / Defectuoso",
    short: "Sellante Def.",
    color: "#dc2626",
    fill: "#fee2e2",
    stroke: "#dc2626",
    tone: "red",
    sigla: "S",
  },
  {
    id: "sano",
    label: "Limpiar cara (Sano)",
    short: "Borrar cara",
    color: "#64748b",
    fill: "#ffffff",
    stroke: "#94a3b8",
    tone: "neutral",
  },
];

export interface WholeToothToolDef {
  id: WholeToothCondition;
  label: string;
  short: string;
  sigla: string;
  tone: "red" | "blue" | "neutral";
  color: string;
}

export const WHOLE_TOOTH_TOOLS: WholeToothToolDef[] = [
  {
    id: "corona_buena",
    label: "Corona definitiva (Buen estado)",
    short: "Corona (CC)",
    sigla: "CC",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "corona_mala",
    label: "Corona temporal / Mal estado",
    short: "Corona Temp (CT)",
    sigla: "CT",
    tone: "red",
    color: "#dc2626",
  },
  {
    id: "endodoncia_buena",
    label: "Tratamiento de conducto / Endodoncia",
    short: "Endodoncia (TC)",
    sigla: "TC",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "endodoncia_mala",
    label: "Endodoncia / Pulpotomia indicada",
    short: "Endo Indicada (PC)",
    sigla: "PC",
    tone: "red",
    color: "#dc2626",
  },
  {
    id: "ausente",
    label: "Diente ausente / Extraido",
    short: "Ausente (X)",
    sigla: "AUS",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "extraccion_indicada",
    label: "Extraccion indicada (Exodoncia)",
    short: "Exodoncia (X)",
    sigla: "EXO",
    tone: "red",
    color: "#dc2626",
  },
  {
    id: "implante",
    label: "Implante dental endo-oseo",
    short: "Implante (IMP)",
    sigla: "IMP",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "fractura",
    label: "Fractura coronaria / radicular",
    short: "Fractura (FR)",
    sigla: "FR",
    tone: "red",
    color: "#dc2626",
  },
  {
    id: "protesis",
    label: "Protesis fija / Pilar",
    short: "Protesis (PF)",
    sigla: "PF",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "ortodoncia",
    label: "Aparato ortodontico fijo (Bracket)",
    short: "Ortodoncia (ORT)",
    sigla: "ORT",
    tone: "blue",
    color: "#2563eb",
  },
  {
    id: "none",
    label: "Quitar marca de pieza completa",
    short: "Sin marca",
    sigla: "",
    tone: "neutral",
    color: "#64748b",
  },
];

export const SURFACE_NAMES: Record<ToothSurface, string> = {
  V: "Vestibular",
  L: "Palatino / Lingual",
  M: "Mesial",
  D: "Distal",
  O: "Oclusal / Incisal",
};

/** Devuelve el nombre anatomico completo segun el codigo FDI de 2 digitos */
export function getToothAnatomicalName(fdi: string): string {
  const q = Number(fdi[0]);
  const pos = Number(fdi[1]);
  const isChild = q >= 5;

  const arch =
    q === 1 || q === 2 || q === 5 || q === 6 ? "Superior" : "Inferior";
  const side =
    q === 1 || q === 4 || q === 5 || q === 8 ? "Derecho" : "Izquierdo";

  if (isChild) {
    const childNames: Record<number, string> = {
      1: "Incisivo Central Temporal",
      2: "Incisivo Lateral Temporal",
      3: "Canino Temporal",
      4: "Primer Molar Temporal",
      5: "Segundo Molar Temporal",
    };
    return `${childNames[pos] ?? "Pieza Temporal"} ${arch} ${side}`;
  }

  const adultNames: Record<number, string> = {
    1: "Incisivo Central",
    2: "Incisivo Lateral",
    3: "Canino",
    4: "Primer Premolar",
    5: "Segundo Premolar",
    6: "Primer Molar",
    7: "Segundo Molar",
    8: "Tercer Molar (Cordal)",
  };
  return `${adultNames[pos] ?? "Pieza"} ${arch} ${side}`;
}

export function isToothModified(rec?: ToothRecord | undefined): boolean {
  if (!rec) return false;
  if (rec.whole && rec.whole !== "none") return true;
  if (rec.notes && rec.notes.trim().length > 0) return true;
  if (rec.surfaces) {
    return Object.values(rec.surfaces).some((v) => v && v !== "sano");
  }
  return false;
}

export function formatOdontogramSummaryText(data: OdontogramData): string {
  const teeth = data.teeth ?? {};
  const entries = Object.entries(teeth)
    .filter(([, rec]) => isToothModified(rec))
    .sort(([a], [b]) => Number(a) - Number(b));

  if (entries.length === 0 && !data.observaciones?.trim()) {
    return "Odontograma sin hallazgos patologicos registrados.";
  }

  const lines: string[] = ["--- ODONTOGRAMA CLINICO (FDI / MINSA) ---"];
  for (const [fdi, rec] of entries) {
    const parts: string[] = [];
    if (rec.whole && rec.whole !== "none") {
      const wt = WHOLE_TOOTH_TOOLS.find((w) => w.id === rec.whole);
      if (wt) parts.push(`${wt.label} [${wt.sigla}]`);
    }
    if (rec.surfaces) {
      const surfList = (Object.entries(rec.surfaces) as [ToothSurface, SurfaceCondition][])
        .filter(([, cond]) => cond && cond !== "sano")
        .map(([surf, cond]) => {
          const st = SURFACE_TOOLS.find((s) => s.id === cond);
          return `${surf}: ${st?.short ?? cond}`;
        });
      if (surfList.length > 0) {
        parts.push(`Caras (${surfList.join(", ")})`);
      }
    }
    if (rec.notes?.trim()) {
      parts.push(`Nota: ${rec.notes.trim()}`);
    }
    lines.push(
      `• Pieza ${fdi[0]}.${fdi[1]} (${getToothAnatomicalName(fdi)}): ${parts.join(" | ")}`,
    );
  }
  if (data.observaciones?.trim()) {
    lines.push(`Observaciones odontologicas: ${data.observaciones.trim()}`);
  }
  return lines.join("\n");
}

/* ─────────────── COMPONENTE DE PIEZA DENTAL SVG (5 CARAS + RAIZ) ─────────────── */

interface ToothSvgProps {
  fdi: string;
  record?: ToothRecord | undefined;
  selected: boolean;
  readOnly?: boolean | undefined;
  onSelectTooth: (fdi: string) => void;
  onClickSurface: (fdi: string, surface: ToothSurface) => void;
}

function ToothUnit({
  fdi,
  record,
  selected,
  readOnly,
  onSelectTooth,
  onClickSurface,
}: ToothSvgProps) {
  const q = Number(fdi[0]);
  const pos = Number(fdi[1]);
  const isUpper = q === 1 || q === 2 || q === 5 || q === 6;
  const isRightQuadrant = q === 1 || q === 4 || q === 5 || q === 8;
  const isMolar = (q <= 4 && pos >= 6) || (q >= 5 && pos >= 4);
  const isPremolar = q <= 4 && (pos === 4 || pos === 5);

  // Mapeo anatomico de las 4 caras perifericas segun cuadrante FDI:
  // En arcada superior: Arriba = Vestibular (V), Abajo = Palatino (L)
  // En arcada inferior: Arriba = Lingual (L), Abajo = Vestibular (V)
  // En cuadrantes derechos (1, 4, 5, 8): Derecha (hacia linea media) = Mesial (M), Izquierda = Distal (D)
  // En cuadrantes izquierdos (2, 3, 6, 7): Izquierda (hacia linea media) = Mesial (M), Derecha = Distal (D)
  const topSurface: ToothSurface = isUpper ? "V" : "L";
  const bottomSurface: ToothSurface = isUpper ? "L" : "V";
  const leftSurface: ToothSurface = isRightQuadrant ? "D" : "M";
  const rightSurface: ToothSurface = isRightQuadrant ? "M" : "D";

  const getSurfDef = (s: ToothSurface): SurfaceToolDef | undefined => {
    const cond = record?.surfaces?.[s];
    if (!cond || cond === "sano") return undefined;
    return SURFACE_TOOLS.find((t) => t.id === cond);
  };

  const whole = record?.whole ?? "none";
  const wholeDef =
    whole !== "none"
      ? WHOLE_TOOTH_TOOLS.find((w) => w.id === whole)
      : undefined;
  const hasNotes = Boolean(record?.notes && record.notes.trim().length > 0);
  const modified = isToothModified(record);

  const renderRootPaths = () => {
    const rootFill = "#f8fafc";
    const rootStroke = selected ? "#2563eb" : "#94a3b8";
    if (isUpper) {
      if (isMolar) {
        return (
          <g fill={rootFill} stroke={rootStroke} strokeWidth="1.4">
            <path d="M 10 24 L 14 4 L 20 24 Z" />
            <path d="M 21 24 L 25 2 L 29 24 Z" />
            <path d="M 30 24 L 36 4 L 40 24 Z" />
          </g>
        );
      }
      if (isPremolar) {
        return (
          <g fill={rootFill} stroke={rootStroke} strokeWidth="1.4">
            <path d="M 13 24 L 19 4 L 24 24 Z" />
            <path d="M 26 24 L 31 4 L 37 24 Z" />
          </g>
        );
      }
      return (
        <path
          d="M 16 24 L 25 3 L 34 24 Z"
          fill={rootFill}
          stroke={rootStroke}
          strokeWidth="1.4"
        />
      );
    } else {
      // Arcada inferior (raices hacia abajo, de y=60 a y=82)
      if (isMolar) {
        return (
          <g fill={rootFill} stroke={rootStroke} strokeWidth="1.4">
            <path d="M 11 60 L 17 81 L 24 60 Z" />
            <path d="M 26 60 L 33 81 L 39 60 Z" />
          </g>
        );
      }
      return (
        <path
          d="M 16 60 L 25 81 L 34 60 Z"
          fill={rootFill}
          stroke={rootStroke}
          strokeWidth="1.4"
        />
      );
    }
  };

  // Coordenadas de la corona (centrada en x: 7..43, y: 24..60 -> 36x36)
  // Cuadro central Oclusal/Incisal: x: 17..33, y: 34..50 (16x16)
  const polygons: { surface: ToothSurface; points: string }[] = [
    { surface: topSurface, points: "7,24 43,24 33,34 17,34" },
    { surface: bottomSurface, points: "17,50 33,50 43,60 7,60" },
    { surface: leftSurface, points: "7,24 17,34 17,50 7,60" },
    { surface: rightSurface, points: "33,34 43,24 43,60 33,50" },
    { surface: "O", points: "17,34 33,34 33,50 17,50" },
  ];

  const oDef = getSurfDef("O");

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center rounded-xl border p-1 transition-all select-none",
        selected
          ? "border-primary bg-primary-soft/50 ring-2 ring-primary/30 shadow-sm"
          : modified
            ? "border-primary/40 bg-card hover:border-primary"
            : "border-transparent bg-card/60 hover:border-border hover:bg-card",
      )}
    >
      {/* Numero FDI arriba para arcada superior */}
      {isUpper && (
        <button
          type="button"
          onClick={() => onSelectTooth(fdi)}
          className={cn(
            "mb-0.5 flex items-center gap-0.5 rounded px-1.5 py-0.5 font-display text-[11px] font-extrabold leading-none transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : modified
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
          )}
          title={`Seleccionar pieza ${fdi[0]}.${fdi[1]} (${getToothAnatomicalName(fdi)})`}
        >
          {fdi[0]}.{fdi[1]}
          {hasNotes && (
            <span className="size-1.5 rounded-full bg-warning" title="Tiene nota clinica" />
          )}
        </button>
      )}

      {/* Sigla de condicion de pieza completa */}
      <div className="h-3.5 text-center">
        {wholeDef && wholeDef.sigla && (
          <span
            className="inline-block rounded px-1 text-[9px] font-extrabold leading-tight text-white"
            style={{ backgroundColor: wholeDef.color }}
          >
            {wholeDef.sigla}
          </span>
        )}
      </div>

      {/* SVG de Raiz + Corona de 5 caras */}
      <svg
        viewBox="0 0 50 84"
        className="h-[72px] w-[42px] overflow-visible"
        role="img"
        aria-label={`Pieza dental ${fdi}`}
      >
        {/* Raices */}
        <g
          className="cursor-pointer"
          onClick={() => onSelectTooth(fdi)}
        >
          {renderRootPaths()}
        </g>

        {/* Endodoncia / Tratamiento de conducto en la raiz */}
        {(whole === "endodoncia_buena" || whole === "endodoncia_mala") && (
          <line
            x1="25"
            y1={isUpper ? "5" : "60"}
            x2="25"
            y2={isUpper ? "24" : "79"}
            stroke={whole === "endodoncia_buena" ? "#2563eb" : "#dc2626"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Implante en la raiz */}
        {whole === "implante" && (
          <g
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line
              x1="25"
              y1={isUpper ? "5" : "61"}
              x2="25"
              y2={isUpper ? "23" : "79"}
            />
            <line
              x1="19"
              y1={isUpper ? "9" : "65"}
              x2="31"
              y2={isUpper ? "9" : "65"}
            />
            <line
              x1="20"
              y1={isUpper ? "14" : "70"}
              x2="30"
              y2={isUpper ? "14" : "70"}
            />
            <line
              x1="21"
              y1={isUpper ? "19" : "75"}
              x2="29"
              y2={isUpper ? "19" : "75"}
            />
          </g>
        )}

        {/* Las 5 caras de la corona */}
        {polygons.map(({ surface, points }) => {
          const def = getSurfDef(surface);
          return (
            <polygon
              key={surface}
              points={points}
              fill={def ? def.fill : "#ffffff"}
              stroke={def ? def.stroke : selected ? "#3b82f6" : "#475569"}
              strokeWidth={def ? "1.6" : "1.2"}
              className={cn(
                "transition-opacity",
                !readOnly && "cursor-pointer hover:opacity-80",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTooth(fdi);
                if (!readOnly) {
                  onClickSurface(fdi, surface);
                }
              }}
            >
              <title>{`Pieza ${fdi[0]}.${fdi[1]} — Cara ${SURFACE_NAMES[surface]}${def ? ` (${def.label})` : ""}`}</title>
            </polygon>
          );
        })}

        {/* Sigla S o AM en cara Oclusal */}
        {oDef?.sigla && (
          <text
            x="25"
            y="45.5"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={oDef.color}
            className="pointer-events-none select-none"
          >
            {oDef.sigla}
          </text>
        )}

        {/* Corona completa (Anillo circular azul o rojo alrededor de la corona) */}
        {(whole === "corona_buena" || whole === "corona_mala") && (
          <rect
            x="4.5"
            y="21.5"
            width="41"
            height="41"
            rx="7"
            fill="none"
            stroke={whole === "corona_buena" ? "#2563eb" : "#dc2626"}
            strokeWidth="2.8"
            className="pointer-events-none"
          />
        )}

        {/* Ausente o Extraccion Indicada (X grande sobre toda la pieza) */}
        {(whole === "ausente" || whole === "extraccion_indicada") && (
          <g
            stroke={whole === "ausente" ? "#2563eb" : "#dc2626"}
            strokeWidth="3.2"
            strokeLinecap="round"
            className="pointer-events-none"
          >
            <line x1="6" y1="20" x2="44" y2="64" />
            <line x1="44" y1="20" x2="6" y2="64" />
          </g>
        )}

        {/* Fractura (Linea en zigzag roja) */}
        {whole === "fractura" && (
          <polyline
            points="9,26 23,36 17,45 32,52 41,59"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}

        {/* Protesis fija (Doble linea horizontal azul) */}
        {whole === "protesis" && (
          <g
            stroke="#2563eb"
            strokeWidth="2.5"
            className="pointer-events-none"
          >
            <line x1="3" y1="19" x2="47" y2="19" />
            <line x1="3" y1="65" x2="47" y2="65" />
          </g>
        )}

        {/* Aparato ortodontico / Bracket */}
        {whole === "ortodoncia" && (
          <g
            stroke="#2563eb"
            strokeWidth="1.8"
            fill="#dbeafe"
            className="pointer-events-none"
          >
            <line x1="2" y1="42" x2="48" y2="42" />
            <rect x="20" y="37" width="10" height="10" rx="1.5" />
          </g>
        )}
      </svg>

      {/* Numero FDI abajo para arcada inferior */}
      {!isUpper && (
        <button
          type="button"
          onClick={() => onSelectTooth(fdi)}
          className={cn(
            "mt-0.5 flex items-center gap-0.5 rounded px-1.5 py-0.5 font-display text-[11px] font-extrabold leading-none transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : modified
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
          )}
          title={`Seleccionar pieza ${fdi[0]}.${fdi[1]} (${getToothAnatomicalName(fdi)})`}
        >
          {fdi[0]}.{fdi[1]}
          {hasNotes && (
            <span className="size-1.5 rounded-full bg-warning" title="Tiene nota clinica" />
          )}
        </button>
      )}
    </div>
  );
}

/* ─────────────── COMPONENTE PRINCIPAL DE ODONTOGRAMA ─────────────── */

interface OdontogramProps {
  value?: OdontogramData | undefined;
  onChange?: ((next: OdontogramData) => void) | undefined;
  onInsertSummaryToNotes?: ((summaryText: string) => void) | undefined;
  readOnly?: boolean | undefined;
}

export function Odontogram({
  value,
  onChange,
  onInsertSummaryToNotes,
  readOnly = false,
}: OdontogramProps) {
  const data: OdontogramData = useMemo(
    () => ({
      denticion: value?.denticion ?? "adult",
      teeth: value?.teeth ?? {},
      observaciones: value?.observaciones ?? "",
    }),
    [value],
  );

  const [toolKind, setToolKind] = useState<"surface" | "whole">("surface");
  const [activeSurfaceTool, setActiveSurfaceTool] =
    useState<SurfaceCondition>("caries");
  const [activeWholeTool, setActiveWholeTool] =
    useState<WholeToothCondition>("corona_buena");
  const [selectedTooth, setSelectedTooth] = useState<string>("36");

  const denticion = data.denticion ?? "adult";
  const teethMap = data.teeth ?? {};
  const currentToothRecord: ToothRecord = teethMap[selectedTooth] ?? {};

  const emitChange = (next: OdontogramData) => {
    if (readOnly || !onChange) return;
    onChange(next);
  };

  const setDenticion = (nextDenticion: "adult" | "child" | "mixed") => {
    emitChange({ ...data, denticion: nextDenticion });
    if (nextDenticion === "child" && Number(selectedTooth[0]) <= 4) {
      setSelectedTooth("55");
    } else if (nextDenticion === "adult" && Number(selectedTooth[0]) >= 5) {
      setSelectedTooth("16");
    }
  };

  const applySurfaceCondition = (
    fdi: string,
    surface: ToothSurface,
    cond: SurfaceCondition,
  ) => {
    const prevTooth = teethMap[fdi] ?? {};
    const prevSurfaces = { ...(prevTooth.surfaces ?? {}) };
    if (cond === "sano") {
      delete prevSurfaces[surface];
    } else {
      prevSurfaces[surface] = cond;
    }
    const nextTooth: ToothRecord = {
      ...prevTooth,
      surfaces: prevSurfaces,
    };
    emitChange({
      ...data,
      teeth: {
        ...teethMap,
        [fdi]: nextTooth,
      },
    });
  };

  const applyWholeCondition = (fdi: string, cond: WholeToothCondition) => {
    const prevTooth = teethMap[fdi] ?? {};
    const nextTooth: ToothRecord = {
      ...prevTooth,
      whole: cond,
    };
    emitChange({
      ...data,
      teeth: {
        ...teethMap,
        [fdi]: nextTooth,
      },
    });
  };

  const handleSurfaceClick = (fdi: string, surface: ToothSurface) => {
    if (readOnly) return;
    if (toolKind === "whole") {
      const currentWhole = teethMap[fdi]?.whole ?? "none";
      const nextWhole =
        currentWhole === activeWholeTool ? "none" : activeWholeTool;
      applyWholeCondition(fdi, nextWhole);
    } else {
      const currentSurf = teethMap[fdi]?.surfaces?.[surface] ?? "sano";
      const nextSurf =
        currentSurf === activeSurfaceTool ? "sano" : activeSurfaceTool;
      applySurfaceCondition(fdi, surface, nextSurf);
    }
  };

  const updateToothNotes = (fdi: string, notes: string) => {
    const prevTooth = teethMap[fdi] ?? {};
    emitChange({
      ...data,
      teeth: {
        ...teethMap,
        [fdi]: {
          ...prevTooth,
          notes,
        },
      },
    });
  };

  const clearTooth = (fdi: string) => {
    const nextTeeth = { ...teethMap };
    delete nextTeeth[fdi];
    emitChange({
      ...data,
      teeth: nextTeeth,
    });
  };

  const clearAll = () => {
    emitChange({
      denticion,
      teeth: {},
      observaciones: "",
    });
  };

  const modifiedTeeth = useMemo(
    () =>
      Object.entries(teethMap)
        .filter(([, rec]) => isToothModified(rec))
        .sort(([a], [b]) => Number(a) - Number(b)),
    [teethMap],
  );

  const renderQuadrantRow = (
    leftQuadrant: readonly string[],
    rightQuadrant: readonly string[],
    leftLabel: string,
    rightLabel: string,
  ) => (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <div className="rounded-xl border bg-muted/25 p-2.5">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {leftLabel}
        </p>
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-1">
          {leftQuadrant.map((fdi) => (
            <ToothUnit
              key={fdi}
              fdi={fdi}
              record={teethMap[fdi]}
              selected={selectedTooth === fdi}
              readOnly={readOnly}
              onSelectTooth={setSelectedTooth}
              onClickSurface={handleSurfaceClick}
            />
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-muted/25 p-2.5">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {rightLabel}
        </p>
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-1">
          {rightQuadrant.map((fdi) => (
            <ToothUnit
              key={fdi}
              fdi={fdi}
              record={teethMap[fdi]}
              selected={selectedTooth === fdi}
              readOnly={readOnly}
              onSelectTooth={setSelectedTooth}
              onClickSurface={handleSurfaceClick}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Encabezado y selector de denticion */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <SmilePlus className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">
                Odontograma Clinico Digital (Norma FDI / MINSA)
              </h3>
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                5 Caras Interactivas
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Rojo: patologias o hallazgos en mal estado · Azul: restauraciones y tratamientos en buen estado
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "adult", label: "Adulto (32 piezas)" },
              { id: "child", label: "Pediatrico (20 piezas)" },
              { id: "mixed", label: "Mixto (52 piezas)" },
            ] as const
          ).map((d) => (
            <Button
              key={d.id}
              type="button"
              size="sm"
              variant={denticion === d.id ? "default" : "outline"}
              onClick={() => setDenticion(d.id)}
              disabled={readOnly && denticion !== d.id}
            >
              {d.label}
            </Button>
          ))}
          {!readOnly && modifiedTeeth.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={clearAll}
              title="Limpiar todo el odontograma"
            >
              <RotateCcw className="size-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Paleta de herramientas clinicas (solo cuando no es readOnly) */}
      {!readOnly && (
        <div className="rounded-2xl border bg-card p-4 shadow-soft space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={toolKind === "surface" ? "default" : "outline"}
                onClick={() => setToolKind("surface")}
              >
                Por Cara Dental (V, L/P, M, D, O)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={toolKind === "whole" ? "default" : "outline"}
                onClick={() => setToolKind("whole")}
              >
                Por Pieza Completa / Raiz
              </Button>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3.5 text-primary" />
              Selecciona una herramienta y haz clic directamente sobre la cara o pieza dental
            </span>
          </div>

          {toolKind === "surface" ? (
            <div className="flex flex-wrap gap-2">
              {SURFACE_TOOLS.map((t) => {
                const active = activeSurfaceTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveSurfaceTool(t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                      active
                        ? "border-primary bg-primary-soft text-primary ring-2 ring-primary/25"
                        : "bg-background hover:border-primary/50",
                    )}
                  >
                    <span
                      className="size-3.5 rounded-sm border"
                      style={{
                        backgroundColor: t.fill,
                        borderColor: t.stroke,
                      }}
                    />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {WHOLE_TOOTH_TOOLS.map((t) => {
                const active = activeWholeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveWholeTool(t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                      active
                        ? "border-primary bg-primary-soft text-primary ring-2 ring-primary/25"
                        : "bg-background hover:border-primary/50",
                    )}
                  >
                    {t.sigla ? (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.sigla}
                      </span>
                    ) : (
                      <Eraser className="size-3.5 text-muted-foreground" />
                    )}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mapa de Arcadas Dentales */}
      <div className="rounded-2xl border bg-card p-4 shadow-soft space-y-4">
        {(denticion === "adult" || denticion === "mixed") && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Arcada Superior Permanente
            </p>
            {renderQuadrantRow(
              ADULT_UPPER_RIGHT,
              ADULT_UPPER_LEFT,
              "Cuadrante 1 · Superior Derecho (1.8 – 1.1)",
              "Cuadrante 2 · Superior Izquierdo (2.1 – 2.8)",
            )}
          </div>
        )}

        {(denticion === "child" || denticion === "mixed") && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Arcada Superior Temporal / Pediatrica
            </p>
            {renderQuadrantRow(
              CHILD_UPPER_RIGHT,
              CHILD_UPPER_LEFT,
              "Cuadrante 5 · Temporal Sup. Derecho (5.5 – 5.1)",
              "Cuadrante 6 · Temporal Sup. Izquierdo (6.1 – 6.5)",
            )}
          </div>
        )}

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Plano Oclusal · Linea Media
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {(denticion === "child" || denticion === "mixed") && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Arcada Inferior Temporal / Pediatrica
            </p>
            {renderQuadrantRow(
              CHILD_LOWER_RIGHT,
              CHILD_LOWER_LEFT,
              "Cuadrante 8 · Temporal Inf. Derecho (8.5 – 8.1)",
              "Cuadrante 7 · Temporal Inf. Izquierdo (7.1 – 7.5)",
            )}
          </div>
        )}

        {(denticion === "adult" || denticion === "mixed") && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Arcada Inferior Permanente
            </p>
            {renderQuadrantRow(
              ADULT_LOWER_RIGHT,
              ADULT_LOWER_LEFT,
              "Cuadrante 4 · Inferior Derecho (4.8 – 4.1)",
              "Cuadrante 3 · Inferior Izquierdo (3.1 – 3.8)",
            )}
          </div>
        )}
      </div>

      {/* Inspector de Pieza Seleccionada + Resumen de Hallazgos */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Inspector de la pieza dental seleccionada */}
        <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
                Pieza {selectedTooth[0]}.{selectedTooth[1]}
              </span>
              <h4 className="mt-1 font-bold text-base">
                {getToothAnatomicalName(selectedTooth)}
              </h4>
            </div>
            {!readOnly && isToothModified(currentToothRecord) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearTooth(selectedTooth)}
              >
                <Eraser className="size-3.5" /> Limpiar pieza
              </Button>
            )}
          </div>

          {/* Estado por cara de la pieza seleccionada */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estado por superficie de la pieza {selectedTooth[0]}.{selectedTooth[1]}
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {(["V", "L", "M", "D", "O"] as ToothSurface[]).map((surf) => {
                const currentCond =
                  currentToothRecord.surfaces?.[surf] ?? "sano";
                return (
                  <div
                    key={surf}
                    className="rounded-xl border bg-muted/30 p-2 text-xs"
                  >
                    <p className="font-bold text-foreground">
                      {surf} · {SURFACE_NAMES[surf].split(" ")[0]}
                    </p>
                    <select
                      disabled={readOnly}
                      value={currentCond}
                      onChange={(e) =>
                        applySurfaceCondition(
                          selectedTooth,
                          surf,
                          e.target.value as SurfaceCondition,
                        )
                      }
                      className="mt-1 w-full rounded-lg border bg-card px-1.5 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="sano">Sano</option>
                      {SURFACE_TOOLS.filter((t) => t.id !== "sano").map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.short}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Condicion de pieza completa + Notas especificas del diente */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Condicion de pieza completa / raiz
              </Label>
              <select
                disabled={readOnly}
                value={currentToothRecord.whole ?? "none"}
                onChange={(e) =>
                  applyWholeCondition(
                    selectedTooth,
                    e.target.value as WholeToothCondition,
                  )
                }
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="none">Ninguna (Pieza presente normal)</option>
                {WHOLE_TOOTH_TOOLS.filter((w) => w.id !== "none").map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Anotacion especifica de la pieza {selectedTooth[0]}.{selectedTooth[1]}
              </Label>
              <Input
                disabled={readOnly}
                value={currentToothRecord.notes ?? ""}
                onChange={(e) =>
                  updateToothNotes(selectedTooth, e.target.value)
                }
                placeholder="Ej: Resina A2 en O-M, anestesia infiltrativa..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Observaciones generales del odontograma / Plan de tratamiento dental
            </Label>
            <Textarea
              disabled={readOnly}
              value={data.observaciones ?? ""}
              onChange={(e) =>
                emitChange({ ...data, observaciones: e.target.value })
              }
              placeholder="Ej: Profilaxis ultrasonica realizada, se indica control en 6 meses..."
              className="min-h-16 text-xs"
            />
          </div>
        </div>

        {/* Resumen de piezas con hallazgos o tratamientos */}
        <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Piezas con Hallazgos ({modifiedTeeth.length})
              </h4>
              {onInsertSummaryToNotes && !readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onInsertSummaryToNotes(formatOdontogramSummaryText(data))
                  }
                >
                  <ClipboardPlus className="size-3.5" /> Pasar resumen a notas
                </Button>
              )}
            </div>

            {modifiedTeeth.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                Haz clic en cualquier diente o superficie del odontograma para registrar caries, resinas, coronas, endodoncias, extracciones o notas por pieza.
              </div>
            ) : (
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {modifiedTeeth.map(([fdi, rec]) => {
                  const wholeDef =
                    rec.whole && rec.whole !== "none"
                      ? WHOLE_TOOTH_TOOLS.find((w) => w.id === rec.whole)
                      : undefined;
                  const surfEntries = (
                    Object.entries(rec.surfaces ?? {}) as [
                      ToothSurface,
                      SurfaceCondition,
                    ][]
                  ).filter(([, c]) => c && c !== "sano");

                  return (
                    <button
                      key={fdi}
                      type="button"
                      onClick={() => setSelectedTooth(fdi)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left text-xs transition-all",
                        selectedTooth === fdi
                          ? "border-primary bg-primary-soft/40"
                          : "bg-muted/30 hover:border-primary/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          Pieza {fdi[0]}.{fdi[1]} · {getToothAnatomicalName(fdi)}
                        </span>
                        {wholeDef && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: wholeDef.color }}
                          >
                            {wholeDef.short}
                          </span>
                        )}
                      </div>
                      {surfEntries.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {surfEntries.map(([s, cond]) => {
                            const st = SURFACE_TOOLS.find((x) => x.id === cond);
                            return (
                              <span
                                key={s}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                  st?.tone === "red"
                                    ? "bg-destructive-soft text-destructive"
                                    : "bg-primary-soft text-primary",
                                )}
                              >
                                {s}: {st?.short ?? cond}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {rec.notes?.trim() && (
                        <p className="mt-1 text-muted-foreground">
                          Nota: {rec.notes.trim()}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-success" />
              Guardado automatico en el expediente clinico
            </span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Sparkles className="size-3.5" /> NTS N° 188-MINSA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
