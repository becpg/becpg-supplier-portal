'use client';

/**
 * Capturing the signature mark — **drawn or typed, the client decides**
 * (spec §9.2).
 *
 * What this component produces is a *visual mark*, not a cryptographic act. In
 * beCPG the act is `PDFBoxServiceImpl.signDocument()`, server-side, with the
 * recipient resolved from `sign:recipients`; DocuSign and YouSign do the same
 * remotely. So this component's job is narrow and honest: give the supplier
 * something to look at that is unmistakably *his*, and hand it to the server
 * along with the consent.
 *
 * Two ways in, because clients disagree and both are legitimate:
 *
 * - **drawn** (`signature_pad`) — a finger on a phone, a stylus on a tablet,
 *   a mouse on a desktop. Undo removes the last stroke, not the whole thing:
 *   redoing a whole signature because the last loop slipped is exactly the kind
 *   of small cruelty that makes people abandon;
 * - **typed** — the name, rendered in a script face. Faster on a phone, and the
 *   only usable option with a trackpad.
 *
 * Both produce the **same payload shape**, so the server side never has to care:
 *
 * ```js
 * { kind: 'drawn' | 'typed', text: string, dataUrl: string|null, empty: boolean }
 * ```
 *
 * `dataUrl` is a transparent PNG in both cases — the typed variant is rasterised
 * here rather than server-side, so what the supplier saw is byte-for-byte what
 * the archive keeps.
 *
 * @example
 * <SignaturePad mode="both" defaultName={session.fullName} onChange={setSignature} />
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button, Icon } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** The two ways to produce a mark. */
export const SIGNATURE_KINDS = Object.freeze({ DRAWN: 'drawn', TYPED: 'typed' });

/** Script faces, in decreasing order of "actually installed somewhere". */
const SCRIPT_FONT_STACK =
    '"Segoe Script", "Bradley Hand", "Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive';

/** Rasterisation size of a typed signature, in CSS px. */
const TYPED_CANVAS = { width: 640, height: 200 };

/** Ink colour — the becpg blue, not black: it reads as a signature, not as text. */
const DEFAULT_PEN_COLOR = '#004254';

const LABELS = defineLabels('components/signature/SignaturePad#LABELS', {
    fr: {
        draw: 'Dessiner',
        type: 'Saisir mon nom',
        drawHint: 'Signez dans le cadre avec le doigt, un stylet ou la souris.',
        typeHint: 'Votre nom sera apposé en signature.',
        namePlaceholder: 'Prénom NOM',
        nameLabel: 'Nom du signataire',
        clear: 'Effacer',
        undo: 'Annuler le dernier trait',
        preview: 'Aperçu de votre signature',
        empty: 'Aucune signature pour l’instant',
        required: 'Votre signature est nécessaire pour continuer.',
        initialsType: 'Saisir mes initiales',
        initialsDrawHint: 'Tracez vos initiales dans le cadre.',
        initialsTypeHint: 'Ces initiales seront apposées en paraphe.',
        initialsNameLabel: 'Initiales',
        initialsPlaceholder: 'VL',
        initialsPreview: 'Aperçu de vos paraphes',
        initialsEmpty: 'Aucun paraphe pour l’instant',
    },
    en: {
        draw: 'Draw',
        type: 'Type my name',
        drawHint: 'Sign inside the frame with your finger, a stylus or the mouse.',
        typeHint: 'Your name will be applied as the signature.',
        namePlaceholder: 'First name LAST NAME',
        nameLabel: 'Signatory name',
        clear: 'Clear',
        undo: 'Undo last stroke',
        preview: 'Preview of your signature',
        empty: 'No signature yet',
        required: 'Your signature is required to continue.',
        initialsType: 'Type my initials',
        initialsDrawHint: 'Draw your initials inside the frame.',
        initialsTypeHint: 'These initials will be applied as the paraph.',
        initialsNameLabel: 'Initials',
        initialsPlaceholder: 'VL',
        initialsPreview: 'Preview of your initials',
        initialsEmpty: 'No initials yet',
    },
});

/**
 * Margin kept around the ink once the empty space is cut away, as a fraction of
 * the trimmed box. Enough that a stroke does not touch the edge of the PNG.
 */
const TRIM_MARGIN = 0.04;

/**
 * The same mark, without the empty space around it.
 *
 * WHY THIS EXISTS. The mark is stamped into the rectangle beCPG reserved for it
 * (`lib/pdfStamp.js`), scaled to fit without being distorted — so what gets
 * scaled is the whole PNG, transparent margins included. A canvas of 640x200
 * holding « TR » is nine tenths nothing, and the paraphe landed in its box at a
 * quarter of the width it had to fill, looking timid where Apryse's is full
 * size. Apryse trims to the drawing; so does this.
 *
 * Cutting to the ink also makes the two capture modes agree: a name typed in a
 * fixed canvas and a signature drawn across a wide pad both come out as the mark
 * itself, and the box decides how big it is.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {string|null} a `data:image/png;base64,…`, or `null` when nothing was drawn
 */
export function trimmedDataUrl(canvas) {
    const context = canvas && canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !(canvas.width > 0) || !(canvas.height > 0)) {
        return null;
    }

    let pixels = null;
    try {
        pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    catch {
        // A tainted canvas cannot be read back. Nothing here loads a foreign
        // image, but the untrimmed mark is still a mark: fall back to it.
        return canvas.toDataURL('image/png');
    }

    let top = canvas.height;
    let left = canvas.width;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
            if (pixels[(y * canvas.width + x) * 4 + 3] === 0) {
                continue;
            }
            if (x < left) { left = x; }
            if (x > right) { right = x; }
            if (y < top) { top = y; }
            if (y > bottom) { bottom = y; }
        }
    }
    if (right < left || bottom < top) {
        return null;
    }

    const inkWidth = right - left + 1;
    const inkHeight = bottom - top + 1;
    const margin = Math.round(Math.max(inkWidth, inkHeight) * TRIM_MARGIN);
    const x = Math.max(0, left - margin);
    const y = Math.max(0, top - margin);
    const width = Math.min(canvas.width - x, inkWidth + 2 * margin);
    const height = Math.min(canvas.height - y, inkHeight + 2 * margin);

    const trimmed = document.createElement('canvas');
    trimmed.width = width;
    trimmed.height = height;
    const target = trimmed.getContext('2d');
    if (!target) {
        return canvas.toDataURL('image/png');
    }
    target.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    return trimmed.toDataURL('image/png');
}

/**
 * Renders a name as a transparent PNG in a script face.
 *
 * The font size is fitted to the canvas so a long compound name stays inside the
 * frame instead of being clipped — a clipped name on a signed contract is a
 * support ticket.
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {string} [options.color]
 * @returns {string|null} a `data:image/png;base64,…` URL, or null when empty
 */
export function typedSignatureDataUrl(text, options = {}) {
    const value = String(text || '').trim();
    if (!value || typeof document === 'undefined') {
        return null;
    }
    const { color = DEFAULT_PEN_COLOR } = options;
    const ratio = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const canvas = document.createElement('canvas');
    canvas.width = TYPED_CANVAS.width * ratio;
    canvas.height = TYPED_CANVAS.height * ratio;

    const context = canvas.getContext('2d');
    if (!context) {
        return null;
    }
    context.scale(ratio, ratio);
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    let fontSize = 76;
    const maxWidth = TYPED_CANVAS.width - 40;
    do {
        context.font = `italic ${fontSize}px ${SCRIPT_FONT_STACK}`;
        if (context.measureText(value).width <= maxWidth || fontSize <= 20) {
            break;
        }
        fontSize -= 4;
    } while (fontSize > 20);

    context.fillText(value, TYPED_CANVAS.width / 2, TYPED_CANVAS.height / 2, maxWidth);
    return trimmedDataUrl(canvas);
}

/**
 * The signature capture.
 *
 * @param {Object} props
 * @param {'draw'|'type'|'both'} [props.mode='both'] which capture(s) are offered
 * @param {'signature'|'initials'} [props.purpose='signature'] what is being captured:
 *        it changes the wording and, for the initials, opens on the typed variant —
 *        the name is already known, and nobody wants to draw two letters on a phone
 * @param {string} [props.defaultName] prefilled signatory name (the session's full name)
 * @param {(value: {kind: string, text: string, dataUrl: string|null, empty: boolean}) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {number} [props.height=180] drawing area height, in px
 * @param {string} [props.penColor]
 * @param {string} [props.className]
 */
export function SignaturePad({
    mode = 'both',
    purpose = 'signature',
    defaultName = '',
    onChange,
    disabled = false,
    height = 180,
    penColor = DEFAULT_PEN_COLOR,
    className = '',
}) {
    const { lang } = useMessages();
    const base = pickLabels(LABELS, lang);
    // The initials reuse the whole component and override the six strings that
    // would otherwise call a paraphe a signature.
    const labels = purpose === 'initials'
        ? {
            ...base,
            type: base.initialsType,
            drawHint: base.initialsDrawHint,
            typeHint: base.initialsTypeHint,
            nameLabel: base.initialsNameLabel,
            namePlaceholder: base.initialsPlaceholder,
            preview: base.initialsPreview,
            empty: base.initialsEmpty,
        }
        : base;
    const inputId = useId();

    const allowDraw = mode === 'draw' || mode === 'both';
    const allowType = mode === 'type' || mode === 'both';

    const typedFirst = purpose === 'initials' && allowType;
    const [kind, setKind] = useState(
        allowDraw && !typedFirst ? SIGNATURE_KINDS.DRAWN : SIGNATURE_KINDS.TYPED,
    );
    const [name, setName] = useState(defaultName || '');
    const [drawnUrl, setDrawnUrl] = useState(null);
    const [strokeCount, setStrokeCount] = useState(0);

    const canvasRef = useRef(null);
    const padRef = useRef(null);
    // Kept in a ref so the signature_pad listener never goes stale and never has
    // to be re-registered (re-registering loses strokes).
    const emit = useRef(onChange);
    useEffect(() => {
        emit.current = onChange;
    });

    const typedUrl = useMemo(
        () => (allowType && name.trim() ? typedSignatureDataUrl(name, { color: penColor }) : null),
        [allowType, name, penColor],
    );

    /** Pushes the current value up. Called from events only — never from render. */
    const publish = useCallback(
        (nextKind, nextName, nextDrawnUrl) => {
            const isTyped = nextKind === SIGNATURE_KINDS.TYPED;
            const text = String(nextName || '').trim();
            const dataUrl = isTyped ? typedSignatureDataUrl(text, { color: penColor }) : nextDrawnUrl || null;
            if (emit.current) {
                emit.current({ kind: nextKind, text, dataUrl, empty: !dataUrl });
            }
        },
        [penColor],
    );

    // A prefilled name is already a valid typed signature: publish it once, or
    // `mode="type"` would keep the sign button disabled until the supplier
    // retypes a name the portal filled in for him.
    const bootstrapped = useRef(false);
    useEffect(() => {
        if (bootstrapped.current) {
            return;
        }
        bootstrapped.current = true;
        if (kind === SIGNATURE_KINDS.TYPED && name.trim()) {
            publish(SIGNATURE_KINDS.TYPED, name, null);
        }
    }, [kind, name, publish]);

    /* ------------------------------------------------------------- drawing */

    // The canvas is sized in device pixels but drawn in CSS pixels, otherwise the
    // stroke is blurry on every phone made since 2014.
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const pad = padRef.current;
        if (!canvas || !pad) {
            return;
        }
        const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = canvas.offsetWidth;
        const target = canvas.offsetHeight;
        if (!width || !target) {
            return;
        }
        const data = pad.toData();
        canvas.width = width * ratio;
        canvas.height = target * ratio;
        const context = canvas.getContext('2d');
        if (context) {
            context.scale(ratio, ratio);
        }
        // Resizing resets the backing store; strokes are stored as CSS-pixel
        // points, so they can simply be replayed.
        pad.clear();
        if (data && data.length) {
            pad.fromData(data);
        }
    }, []);

    useEffect(() => {
        if (!allowDraw) {
            return undefined;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
            return undefined;
        }
        const pad = new SignaturePadLib(canvas, {
            penColor,
            backgroundColor: 'rgba(255,255,255,0)',
            minWidth: 0.8,
            maxWidth: 2.4,
            throttle: 8,
        });
        padRef.current = pad;
        resizeCanvas();

        const onEnd = () => {
            // Trimmed like the typed variant: what is stamped is the drawing,
            // not the width of the pad it happened to be drawn on.
            const url = pad.isEmpty() ? null : trimmedDataUrl(canvas);
            setDrawnUrl(url);
            setStrokeCount(pad.toData().length);
            publish(SIGNATURE_KINDS.DRAWN, '', url);
        };
        pad.addEventListener('endStroke', onEnd);

        const observer =
            typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resizeCanvas()) : null;
        if (observer) {
            observer.observe(canvas);
        }
        else {
            window.addEventListener('resize', resizeCanvas);
        }

        return () => {
            pad.removeEventListener('endStroke', onEnd);
            pad.off();
            padRef.current = null;
            if (observer) {
                observer.disconnect();
            }
            else {
                window.removeEventListener('resize', resizeCanvas);
            }
        };
    }, [allowDraw, penColor, resizeCanvas, publish]);

    useEffect(() => {
        const pad = padRef.current;
        if (pad) {
            if (disabled) {
                pad.off();
            }
            else {
                pad.on();
            }
        }
    }, [disabled]);

    const clear = useCallback(() => {
        const pad = padRef.current;
        if (pad) {
            pad.clear();
        }
        setDrawnUrl(null);
        setStrokeCount(0);
        publish(SIGNATURE_KINDS.DRAWN, '', null);
    }, [publish]);

    const undo = useCallback(() => {
        const pad = padRef.current;
        if (!pad) {
            return;
        }
        const data = pad.toData();
        data.pop();
        pad.fromData(data);
        const url = data.length ? trimmedDataUrl(canvasRef.current) : null;
        setDrawnUrl(url);
        setStrokeCount(data.length);
        publish(SIGNATURE_KINDS.DRAWN, '', url);
    }, [publish]);

    /* --------------------------------------------------------------- typed */

    const changeName = useCallback(
        (value) => {
            setName(value);
            publish(SIGNATURE_KINDS.TYPED, value, null);
        },
        [publish],
    );

    const switchKind = useCallback(
        (nextKind) => {
            setKind(nextKind);
            publish(nextKind, name, drawnUrl);
        },
        [publish, name, drawnUrl],
    );

    /* ------------------------------------------------------------ rendering */

    const currentUrl = kind === SIGNATURE_KINDS.TYPED ? typedUrl : drawnUrl;

    return (
        <div className={className}>
            {mode === 'both' ? (
                <div
                    className="mb-3 inline-flex rounded-lg border border-[var(--becpg-grey)] p-0.5"
                    role="tablist"
                    aria-label={labels.preview}
                >
                    {[
                        { value: SIGNATURE_KINDS.DRAWN, label: labels.draw, icon: 'draw' },
                        { value: SIGNATURE_KINDS.TYPED, label: labels.type, icon: 'keyboard' },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={kind === tab.value}
                            disabled={disabled}
                            onClick={() => switchKind(tab.value)}
                            className={`touch-target inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] ${
                                kind === tab.value
                                    ? 'bg-[var(--becpg-blue)] text-white'
                                    : 'text-[var(--becpg-dark-grey)] hover:bg-[var(--becpg-grey)]'
                            }`}
                        >
                            <Icon name={tab.icon} size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {/* ------------------------------------------------------- drawn */}
            {/* Kept mounted (only hidden) when the typed tab is active: the
                signature_pad instance is bound to *this* canvas element, and
                unmounting it would silently detach the pad — and lose the
                strokes already drawn. Hidden means offsetWidth is 0, which
                `resizeCanvas` skips; showing it back fires the ResizeObserver,
                which replays the stored points. */}
            {allowDraw ? (
                <div className={kind === SIGNATURE_KINDS.DRAWN ? '' : 'hidden'}>
                    <div
                        className={`relative rounded-lg border-2 border-dashed bg-white ${
                            disabled ? 'border-[var(--becpg-grey)] opacity-60' : 'border-[var(--becpg-blue-lighter)]'
                        }`}
                        style={{ height: `${height}px` }}
                    >
                        <canvas
                            ref={canvasRef}
                            className="h-full w-full rounded-lg"
                            style={{ touchAction: 'none', cursor: disabled ? 'not-allowed' : 'crosshair' }}
                            aria-label={labels.drawHint}
                        />
                        {!drawnUrl ? (
                            <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-[var(--becpg-dark-grey)]">
                                <span className="mx-auto block h-px w-3/5 bg-[var(--becpg-grey)]" />
                                <span className="mt-1 inline-block">{labels.drawHint}</span>
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon="undo"
                            onClick={undo}
                            disabled={disabled || strokeCount === 0}
                        >
                            {labels.undo}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon="delete_outline"
                            onClick={clear}
                            disabled={disabled || !drawnUrl}
                        >
                            {labels.clear}
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* ------------------------------------------------------- typed */}
            {allowType && kind === SIGNATURE_KINDS.TYPED ? (
                <div>
                    <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-[var(--becpg-blue)]">
                        {labels.nameLabel}
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        value={name}
                        disabled={disabled}
                        autoComplete="name"
                        placeholder={labels.namePlaceholder}
                        onChange={(event) => changeName(event.target.value)}
                        className="w-full rounded-lg border border-[var(--becpg-grey)] px-3 py-2 text-base text-[var(--becpg-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] disabled:opacity-60"
                    />
                    <p className="mt-1 text-xs text-[var(--becpg-dark-grey)]">{labels.typeHint}</p>
                    <div
                        className="mt-2 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--becpg-blue-lighter)] bg-white px-3"
                        style={{ height: `${Math.round(height * 0.7)}px` }}
                    >
                        <span
                            className="truncate text-3xl italic sm:text-4xl"
                            style={{ fontFamily: SCRIPT_FONT_STACK, color: penColor }}
                        >
                            {name.trim() || ' '}
                        </span>
                    </div>
                </div>
            ) : null}

            {/* ----------------------------------------------------- preview */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-[var(--becpg-grey)]/50 p-2">
                <span className="shrink-0 text-xs text-[var(--becpg-dark-grey)]">{labels.preview}</span>
                {currentUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={currentUrl}
                        alt={labels.preview}
                        className="h-10 max-w-[60%] object-contain"
                    />
                ) : (
                    <span className="text-xs italic text-[var(--becpg-dark-grey)]">{labels.empty}</span>
                )}
            </div>
        </div>
    );
}
