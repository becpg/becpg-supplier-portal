'use client';

/**
 * Where the signature and the initials will land — **a hint, never a control**
 * (spec §9.2).
 *
 * beCPG has already decided the geometry before the supplier ever opens the
 * document: `SignatureService.prepareForSignature(document, recipients, params)`
 * positions the signature and the initials (page, keyword anchoring, ratios,
 * direction) and `PDFBoxServiceImpl.signDocument()` stamps them. The portal
 * therefore has nothing to place and nothing to compute — it only *shows* the
 * result so the supplier is not signing blind.
 *
 * That is why this component is `pointer-events-none` and `aria-hidden`: it is
 * decoration over the page canvas, not an input. Dragging a frame here would
 * change nothing server-side and would be a lie.
 *
 * ## Degrading gracefully
 *
 * The coordinates come from the API. If they are absent — and today
 * `GET /api/v1/signature/{taskId}` does not return them, because the signature
 * module owns them — `normalizeZones()` returns `[]` and **nothing is drawn**.
 * We never guess a position: a frame drawn in the wrong place is worse than no
 * frame at all, because the supplier would believe it.
 *
 * ## The coordinate contract
 *
 * A zone is `{ page, type, label, x, y, width, height, unit, origin }`:
 *
 * | field | accepted | default |
 * |---|---|---|
 * | `page` | `page`, `pageNumber`, `pageIndex` (0-based) | — (required) |
 * | `type` | `signature`, `initials`, `date`, `text` | `signature` |
 * | box | `x/y/width/height`, `left/top/w/h`, `rect: [x,y,w,h]`, `x1,y1,x2,y2` | — (required) |
 * | `unit` | `ratio` (0..1), `percent` (0..100), `point` (PDF user space) | inferred |
 * | `origin` | `top-left`, `bottom-left` | `bottom-left` for points, `top-left` otherwise |
 *
 * `unit` is inferred when missing: any coordinate above 1 means points (a ratio
 * cannot be 250). Points need the page's PDF dimensions, which the viewer passes
 * as `pageSize` — without them, a point-based zone is skipped rather than
 * mis-drawn.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** The zone types beCPG's signature service knows how to stamp. */
export const ZONE_TYPES = Object.freeze({
    SIGNATURE: 'signature',
    INITIALS: 'initials',
    DATE: 'date',
    TEXT: 'text',
});

/** Type aliases seen in the wild (fr/en, DocuSign/YouSign vocabulary). */
const TYPE_ALIASES = {
    signature: ZONE_TYPES.SIGNATURE,
    sign: ZONE_TYPES.SIGNATURE,
    signhere: ZONE_TYPES.SIGNATURE,
    initials: ZONE_TYPES.INITIALS,
    initial: ZONE_TYPES.INITIALS,
    paraphe: ZONE_TYPES.INITIALS,
    paraphes: ZONE_TYPES.INITIALS,
    date: ZONE_TYPES.DATE,
    datesigned: ZONE_TYPES.DATE,
    text: ZONE_TYPES.TEXT,
    name: ZONE_TYPES.TEXT,
};

/** Fallback labels, used only when the API sends no label of its own. */
const DEFAULT_LABELS = {
    fr: { signature: 'Signature', initials: 'Paraphes', date: 'Date', text: 'Mention' },
    en: { signature: 'Signature', initials: 'Initials', date: 'Date', text: 'Text' },
};

/**
 * @param {*} value
 * @returns {number|null}
 */
function toNumber(value) {
    const number = typeof value === 'string' ? Number(value.trim()) : Number(value);
    return Number.isFinite(number) ? number : null;
}

/**
 * Reads the box out of whatever shape the API used.
 *
 * @param {Object} raw
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
function readBox(raw) {
    if (Array.isArray(raw.rect) && raw.rect.length >= 4) {
        const [x, y, width, height] = raw.rect.map(toNumber);
        if ([x, y, width, height].every((value) => value !== null)) {
            return { x, y, width, height };
        }
    }

    const x = toNumber(raw.x ?? raw.left ?? raw.x1);
    const y = toNumber(raw.y ?? raw.top ?? raw.y1);
    let width = toNumber(raw.width ?? raw.w);
    let height = toNumber(raw.height ?? raw.h);

    // `x1,y1,x2,y2` corners rather than an origin plus a size.
    if ((width === null || height === null) && raw.x2 !== undefined && raw.y2 !== undefined) {
        const x2 = toNumber(raw.x2);
        const y2 = toNumber(raw.y2);
        if (x !== null && y !== null && x2 !== null && y2 !== null) {
            width = Math.abs(x2 - x);
            height = Math.abs(y2 - y);
        }
    }

    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
        return null;
    }
    return { x, y, width, height };
}

/**
 * Normalises whatever the API returned into a stable list of zones.
 *
 * Accepts an array, or an object keyed by type (`{ signature: {...},
 * initials: [...] }`), or `{ zones: [...] }`. Anything it cannot read with
 * certainty is dropped — that is the graceful degradation rule.
 *
 * @param {*} raw
 * @returns {Array<Object>} normalised zones (possibly empty)
 *
 * @example
 * normalizeZones({ signature: { page: 12, x: 0.62, y: 0.78, width: 0.25, height: 0.08 } });
 */
export function normalizeZones(raw) {
    if (!raw) {
        return [];
    }

    let entries = [];
    if (Array.isArray(raw)) {
        entries = raw.map((zone) => ({ zone, hint: null }));
    }
    else if (typeof raw === 'object') {
        if (Array.isArray(raw.zones)) {
            return normalizeZones(raw.zones);
        }
        if (Array.isArray(raw.positions)) {
            return normalizeZones(raw.positions);
        }
        Object.keys(raw).forEach((key) => {
            const value = raw[key];
            if (!value || typeof value !== 'object') {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((zone) => entries.push({ zone, hint: key }));
                return;
            }
            entries.push({ zone: value, hint: key });
        });
    }

    const zones = [];
    entries.forEach(({ zone, hint }, index) => {
        if (!zone || typeof zone !== 'object') {
            return;
        }

        const pageValue = toNumber(zone.page ?? zone.pageNumber);
        const pageIndex = toNumber(zone.pageIndex);
        const page = pageValue !== null ? pageValue : pageIndex !== null ? pageIndex + 1 : null;
        if (page === null || page < 1) {
            return;
        }

        const box = readBox(zone);
        if (!box) {
            return;
        }

        const rawType = String(zone.type || zone.kind || hint || '').toLowerCase().replace(/[^a-z]/g, '');
        const type = TYPE_ALIASES[rawType] || ZONE_TYPES.SIGNATURE;

        const declaredUnit = String(zone.unit || zone.units || '').toLowerCase();
        const maxValue = Math.max(Math.abs(box.x), Math.abs(box.y), box.width, box.height);
        const unit =
            declaredUnit === 'ratio' || declaredUnit === 'fraction'
                ? 'ratio'
                : declaredUnit === 'percent' || declaredUnit === '%'
                  ? 'percent'
                  : declaredUnit === 'point' || declaredUnit === 'pt' || declaredUnit === 'px'
                    ? 'point'
                    : maxValue > 1
                      ? 'point'
                      : 'ratio';

        const declaredOrigin = String(zone.origin || '').toLowerCase().replace(/[^a-z]/g, '');
        const origin =
            declaredOrigin === 'bottomleft'
                ? 'bottom-left'
                : declaredOrigin === 'topleft'
                  ? 'top-left'
                  // PDF user space starts bottom-left; screen ratios start top-left.
                  : unit === 'point'
                    ? 'bottom-left'
                    : 'top-left';

        zones.push({
            id: String(zone.id || `${type}-${Math.round(page)}-${index}`),
            page: Math.round(page),
            type,
            label: typeof zone.label === 'string' && zone.label.trim() ? zone.label.trim() : null,
            recipient: zone.recipient || zone.signer || null,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            unit,
            origin,
            // Page dimensions in points, when the API bothers to say.
            pageWidth: toNumber(zone.pageWidth) || null,
            pageHeight: toNumber(zone.pageHeight) || null,
        });
    });

    return zones;
}

/**
 * @param {Array<Object>} zones
 * @param {number} pageNumber
 * @returns {Array<Object>}
 */
export function zonesForPage(zones, pageNumber) {
    if (!Array.isArray(zones) || !zones.length) {
        return [];
    }
    const page = Number(pageNumber);
    return zones.filter((zone) => zone.page === page);
}

/**
 * The pages carrying at least one zone — used to jump straight to them.
 *
 * @param {Array<Object>} zones
 * @returns {number[]} sorted, de-duplicated
 */
export function zonePages(zones) {
    if (!Array.isArray(zones)) {
        return [];
    }
    return Array.from(new Set(zones.map((zone) => zone.page))).sort((a, b) => a - b);
}

/**
 * Converts a zone to CSS percentages inside the rendered page.
 *
 * @param {Object} zone normalised zone
 * @param {{width: number, height: number}|null} pageSize page size **in PDF points**
 * @returns {{left: number, top: number, width: number, height: number}|null} percentages
 */
export function zoneBox(zone, pageSize) {
    if (!zone) {
        return null;
    }

    let scaleX = 1;
    let scaleY = 1;

    if (zone.unit === 'percent') {
        scaleX = 100;
        scaleY = 100;
    }
    else if (zone.unit === 'point') {
        const width = zone.pageWidth || (pageSize && pageSize.width) || null;
        const height = zone.pageHeight || (pageSize && pageSize.height) || null;
        if (!width || !height) {
            // Points without a page size cannot be placed. Draw nothing.
            return null;
        }
        scaleX = width;
        scaleY = height;
    }

    const left = (zone.x / scaleX) * 100;
    const width = (zone.width / scaleX) * 100;
    const height = (zone.height / scaleY) * 100;
    const rawTop = (zone.y / scaleY) * 100;
    // PDF space grows upwards: the stored y is the *bottom* of the box.
    const top = zone.origin === 'bottom-left' ? 100 - rawTop - height : rawTop;

    if (![left, top, width, height].every((value) => Number.isFinite(value))) {
        return null;
    }
    if (left > 100 || top > 100 || left + width < 0 || top + height < 0) {
        return null; // entirely outside the page — almost certainly a bad unit
    }

    return { left, top, width, height };
}

const TYPE_STYLES = {
    [ZONE_TYPES.SIGNATURE]: 'border-[var(--becpg-orange)] bg-[var(--becpg-orange)]/8',
    [ZONE_TYPES.INITIALS]: 'border-[var(--becpg-blue-light)] bg-[var(--becpg-blue-light)]/8',
    [ZONE_TYPES.DATE]: 'border-[var(--becpg-dark-grey)] bg-[var(--becpg-dark-grey)]/8',
    [ZONE_TYPES.TEXT]: 'border-[var(--becpg-dark-grey)] bg-[var(--becpg-dark-grey)]/8',
};

const TYPE_BADGES = {
    [ZONE_TYPES.SIGNATURE]: 'bg-[var(--becpg-orange)] text-white',
    [ZONE_TYPES.INITIALS]: 'bg-[var(--becpg-blue-light)] text-white',
    [ZONE_TYPES.DATE]: 'bg-[var(--becpg-dark-grey)] text-white',
    [ZONE_TYPES.TEXT]: 'bg-[var(--becpg-dark-grey)] text-white',
};

/**
 * Draws the frames of one page. Rendered inside the page wrapper, which is
 * `position: relative` and sized exactly like the canvas.
 *
 * @param {Object} props
 * @param {Array<Object>} props.zones normalised zones (all pages, filtered here)
 * @param {number} props.pageNumber
 * @param {{width: number, height: number}|null} [props.pageSize] page size in PDF points
 * @param {'fr'|'en'} [props.lang='fr']
 * @param {boolean} [props.animate=true]
 */
export function SignatureZones({ zones, pageNumber, pageSize = null, lang = 'fr', animate = true }) {
    const reduceMotion = useReducedMotion();
    const labels = DEFAULT_LABELS[lang] || DEFAULT_LABELS.fr;

    const boxes = useMemo(() => {
        return zonesForPage(zones, pageNumber)
            .map((zone) => ({ zone, box: zoneBox(zone, pageSize) }))
            .filter((entry) => entry.box !== null);
    }, [zones, pageNumber, pageSize]);

    if (!boxes.length) {
        return null;
    }

    return (
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {boxes.map(({ zone, box }) => (
                <motion.div
                    key={zone.id}
                    className={`absolute rounded-[3px] border-2 border-dashed ${
                        TYPE_STYLES[zone.type] || TYPE_STYLES[ZONE_TYPES.SIGNATURE]
                    }`}
                    style={{
                        left: `${box.left}%`,
                        top: `${box.top}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                    }}
                    initial={animate && !reduceMotion ? { opacity: 0, scale: 0.96 } : false}
                    animate={animate && !reduceMotion ? { opacity: 1, scale: 1 } : false}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                    <span
                        className={`absolute -top-2 left-1 max-w-full truncate rounded px-1 py-px text-[9px] font-medium leading-tight sm:text-[10px] ${
                            TYPE_BADGES[zone.type] || TYPE_BADGES[ZONE_TYPES.SIGNATURE]
                        }`}
                    >
                        {zone.label || labels[zone.type] || labels.signature}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}

/**
 * One-line legend shown under the viewer when zones exist. Tells the supplier
 * that the frames are informative and that beCPG stamps them, not him.
 *
 * @param {Object} props
 * @param {Array<Object>} props.zones
 * @param {'fr'|'en'} [props.lang='fr']
 * @param {React.ReactNode} [props.children] the explanatory sentence
 */
export function ZoneLegend({ zones, lang = 'fr', children, className = '' }) {
    const types = useMemo(() => Array.from(new Set((zones || []).map((zone) => zone.type))), [zones]);
    if (!types.length) {
        return null;
    }
    const labels = DEFAULT_LABELS[lang] || DEFAULT_LABELS.fr;
    return (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--becpg-dark-grey)] ${className}`}>
            {types.map((type) => (
                <span key={type} className="inline-flex items-center gap-1.5">
                    <span
                        className={`inline-block h-3 w-5 rounded-[2px] border border-dashed ${
                            TYPE_STYLES[type] || TYPE_STYLES[ZONE_TYPES.SIGNATURE]
                        }`}
                    />
                    {labels[type] || type}
                </span>
            ))}
            {children ? <span className="basis-full sm:basis-auto">{children}</span> : null}
        </div>
    );
}
