'use client';

/**
 * A multi-valued list in a grid cell: a button that reads the chosen values
 * and opens the checkboxes in a panel over the grid.
 *
 * The panel is portalled and fixed, like the autocomplete's: the grid scrolls
 * in both directions and would clip anything positioned inside it.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Button';

const PANEL_MIN_WIDTH = 220;
const PANEL_MAX_HEIGHT = 280;
const VIEWPORT_MARGIN = 8;

function useAnchor(open, anchorRef) {
    const [anchor, setAnchor] = useState(null);
    const place = useCallback(() => {
        const box = anchorRef.current?.getBoundingClientRect();
        if (box) {
            setAnchor({ top: box.top, bottom: box.bottom, left: box.left, width: box.width });
        }
    }, [anchorRef]);
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place]);
    return open ? anchor : null;
}

function panelStyle(anchor) {
    if (!anchor) {
        return { visibility: 'hidden' };
    }
    const roomBelow = window.innerHeight - anchor.bottom;
    const dropUp = roomBelow < PANEL_MAX_HEIGHT && anchor.top > roomBelow;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - PANEL_MIN_WIDTH - VIEWPORT_MARGIN));
    return {
        left: `${left}px`,
        minWidth: `${Math.max(anchor.width, PANEL_MIN_WIDTH)}px`,
        maxHeight: `${Math.min(PANEL_MAX_HEIGHT, (dropUp ? anchor.top : roomBelow) - VIEWPORT_MARGIN * 2)}px`,
        ...(dropUp ? { bottom: `${window.innerHeight - anchor.top + 4}px` } : { top: `${anchor.bottom + 4}px` }),
    };
}

/**
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.label the field label, for the screen reader
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string[]} props.selected
 * @param {Function} props.onToggle `(value, checked) => void`
 * @param {string} props.placeholder shown when nothing is chosen
 * @param {boolean} [props.invalid]
 * @param {boolean} [props.disabled]
 */
export function CheckDropdown({ id, label, options, selected, onToggle, placeholder, invalid = false, disabled = false }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const panelId = useId();
    const anchor = useAnchor(open, buttonRef);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onPointer = (event) => {
            if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const labelOf = new Map(options.map((option) => [option.value, option.label]));
    const summary = selected.map((value) => labelOf.get(value) || value).join(', ');

    return (
        <>
            <button
                ref={buttonRef}
                id={id}
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                title={summary || undefined}
                onClick={() => setOpen((current) => !current)}
                className={[
                    'becpg-check-dropdown flex w-full min-w-0 items-center gap-1 text-start',
                    invalid ? 'border-[var(--status-danger)]' : '',
                ].join(' ')}
            >
                <span className={`min-w-0 flex-1 truncate ${summary ? '' : 'text-[var(--becpg-muted)]'}`}>
                    {summary || placeholder}
                </span>
                {selected.length > 1 ? (
                    <span className="shrink-0 rounded-full bg-[var(--becpg-blue-lighter)] px-1.5 text-[11px] tabular-nums text-[var(--becpg-blue)]">
                        {selected.length}
                    </span>
                ) : null}
                <Icon name={open ? 'expand_less' : 'expand_more'} size={16} className="shrink-0 text-[var(--becpg-dark-grey)]" />
            </button>
            {open && typeof document !== 'undefined' ? createPortal(
                <div ref={panelRef} id={panelId} role="group" aria-label={label} className="becpg-ac-panel overflow-y-auto p-1" style={panelStyle(anchor)}>
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className="flex min-h-[32px] cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-[var(--becpg-blue-lighter)]/50"
                        >
                            <input
                                type="checkbox"
                                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--becpg-blue)]"
                                checked={selected.includes(option.value)}
                                onChange={(event) => onToggle(option.value, event.target.checked)}
                            />
                            <span className="min-w-0 break-words">{option.label}</span>
                        </label>
                    ))}
                </div>,
                document.body,
            ) : null}
        </>
    );
}
