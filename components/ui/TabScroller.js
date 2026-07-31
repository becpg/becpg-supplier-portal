'use client';

/**
 * A horizontal bar of tabs that **says when it has more to show**.
 *
 * ## The defect this exists for
 *
 * The product sheet carries one tab per wizard step: eleven on the local
 * instance, more on a client that declares several questionnaires. The bar
 * scrolled — `overflow-x: auto` — but the scrollbar was hidden by
 * `.no-scrollbar`, so nothing on screen said the last five tabs existed.
 * Measured on the Éclair sheet at 1280: `scrollWidth 1420` against
 * `clientWidth 960`, i.e. **460px of tabs with no affordance at all**, and a
 * pointer had no way to page through them. Worse, opening `?tab=specs`
 * selected a tab sitting at `offsetLeft 1547` while `scrollLeft` stayed at 0 —
 * the *selected* tab was 587px off screen.
 *
 * ## What it adds — and what it does not change
 *
 * The scroll stays exactly as it was; this only adds the affordance:
 *
 *  - a chevron button on each side, **rendered only when that side has
 *    something to scroll to**, re-evaluated on scroll, on resize, on any
 *    re-render and once the webfont has settled;
 *  - a soft fade under each chevron, so the "there is more" signal survives on
 *    touch, where the chevrons are deliberately not drawn (a 28px target is
 *    below the portal's 44px touch floor, and a finger already swipes);
 *  - the active tab scrolls itself into view whenever it changes — including on
 *    first paint, which is what fixes the `?tab=` deep link;
 *  - ←/→/Home/End move focus along the bar and drag the focused tab into view.
 *
 * Labels are **never truncated**: they are beCPG's own translated list names
 * ("Physico-chimiques", "Cahiers des charges") and a supplier has to be able to
 * read them. The bar scrolls; the text does not shrink.
 *
 * ## Keyboard model
 *
 * WAI-ARIA tabs with **manual activation**: the arrows move focus, Enter or
 * Space activates. Automatic activation would fire one step request per
 * keypress — eleven fetches for a walk down the bar — so it is not used here.
 * Consumers pass `tabIndex={active ? 0 : -1}` (roving tabindex), which is what
 * lets a Tab press jump *over* eleven tabs straight into the panel.
 *
 * The chevrons are real focusable `<button>`s with labels and focus rings, per
 * the portal's rule that no interactive element is pointer-only; they only
 * exist while there is something to scroll to, so they add no permanent stop.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';

/** Sub-pixel layout means `scrollLeft` never lands exactly on `scrollWidth - clientWidth`. */
const EPSILON = 2;

/** Kept visible around a tab that is being scrolled into view, so it never hugs the chevron. */
const REVEAL_PADDING = 36;

/** One click on a chevron moves this share of the visible width. */
const PAGE_RATIO = 0.8;

const LOCAL = {
    fr: { previous: 'Onglets précédents', next: 'Onglets suivants' },
    en: { previous: 'Previous tabs', next: 'Next tabs' },
};

/**
 * Scrolls `element` into view **horizontally only**.
 *
 * `Element.scrollIntoView` would also scroll the page vertically (it walks
 * every scrollable ancestor), which on the product sheet jumps the whole
 * document on load. Writing `scrollLeft` on the one container we own cannot.
 *
 * @param {HTMLElement} track the scrolling container
 * @param {HTMLElement} element a child of it
 * @param {ScrollBehavior} behavior
 */
export function revealHorizontally(track, element, behavior = 'auto') {
    if (!track || !element) {
        return;
    }
    // `offsetLeft` is relative to the nearest positioned ancestor, and the track
    // is `position: relative` (`.tab-track` in globals.css) precisely so that
    // ancestor is the track itself.
    const left = element.offsetLeft;
    const right = left + element.offsetWidth;
    const viewLeft = track.scrollLeft;
    const viewRight = viewLeft + track.clientWidth;

    let next = viewLeft;
    if (left - REVEAL_PADDING < viewLeft) {
        next = Math.max(0, left - REVEAL_PADDING);
    }
    else if (right + REVEAL_PADDING > viewRight) {
        next = right + REVEAL_PADDING - track.clientWidth;
    }
    if (Math.abs(next - viewLeft) > 1) {
        track.scrollTo({ left: next, behavior });
    }
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children the tab buttons; each one must carry
 *        `data-tab-key` so the active one can be found and revealed
 * @param {string} props.ariaLabel names the bar for a screen reader
 * @param {string|null} [props.activeKey] the `data-tab-key` of the selected tab
 * @param {boolean} [props.tabs=true] true for a real `role="tablist"` (arrow keys
 *        move between tabs); false for a plain scrolling row of buttons
 * @param {'page'|'card'} [props.surface='page'] what the fade must fade *into*
 * @param {string} [props.className] on the wrapper
 * @param {string} [props.trackClassName] on the scrolling track
 */
export function TabScroller({
    children,
    ariaLabel,
    activeKey = null,
    tabs = true,
    surface = 'page',
    className = '',
    trackClassName = '',
}) {
    const { lang } = useMessages();
    const local = LOCAL[lang] || LOCAL.fr;
    const reduceMotion = useReducedMotion();
    const trackRef = useRef(null);
    const [overflow, setOverflow] = useState({ start: false, end: false });

    // "Has the first paint happened?" — the very first reveal must be instant
    // (a deep-linked tab is simply *there*, it does not slide in), every later
    // one animates. Only a *successful* reveal flips it, so a bar whose tabs
    // arrive one render late still lands its deep link without an animation.
    const painted = useRef(false);

    // The last key this bar actually scrolled to. It is what stops the reveal
    // from fighting the user: the effect below has to depend on `children` (the
    // tab set arrives with the wizard structure, one render after `activeKey`),
    // and `children` is a new array on every parent render — so without this
    // guard, any unrelated re-render would drag the bar back onto the selected
    // tab and silently undo a chevron click or a swipe.
    const revealed = useRef(null);

    const measure = useCallback(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }
        const max = track.scrollWidth - track.clientWidth;
        const start = track.scrollLeft > EPSILON;
        const end = track.scrollLeft < max - EPSILON;
        setOverflow((previous) =>
            previous.start === start && previous.end === end ? previous : { start, end },
        );
    }, []);

    // Re-measured after **every** render: the tab set arrives asynchronously
    // (one request for the wizard structure), and a ResizeObserver on the track
    // does not fire when only its content grows. Two layout reads on a bar that
    // renders a handful of times is not a cost worth optimising away.
    useEffect(measure);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return undefined;
        }
        track.addEventListener('scroll', measure, { passive: true });
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        if (observer) {
            observer.observe(track);
        }
        window.addEventListener('resize', measure);
        // Roboto lands after the first paint and every label changes width with
        // it; without this the bar can claim it fits when it no longer does.
        if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
            document.fonts.ready.then(measure).catch(() => {});
        }
        return () => {
            track.removeEventListener('scroll', measure);
            if (observer) {
                observer.disconnect();
            }
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    // The selected tab always ends up visible — on a click, on a browser Back,
    // and on the first paint of a `?tab=` deep link. Exactly once per selection:
    // scrolling is the user's afterwards.
    useEffect(() => {
        const track = trackRef.current;
        if (!track || activeKey === null || activeKey === undefined) {
            return;
        }
        if (revealed.current === activeKey) {
            return;
        }
        const escape = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape : (v) => v;
        const tab = track.querySelector(`[data-tab-key="${escape(String(activeKey))}"]`);
        if (!tab) {
            // The tabs have not landed yet. Leave `revealed` alone so the next
            // render — the one that brings them — does the reveal.
            return;
        }
        revealHorizontally(track, tab, painted.current && !reduceMotion ? 'smooth' : 'auto');
        revealed.current = activeKey;
        painted.current = true;
    }, [activeKey, reduceMotion, children]);

    const page = useCallback(
        (direction) => {
            const track = trackRef.current;
            if (!track) {
                return;
            }
            const step = Math.max(120, Math.round(track.clientWidth * PAGE_RATIO));
            track.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' });
        },
        [reduceMotion],
    );

    const onKeyDown = useCallback(
        (event) => {
            if (!tabs || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                return;
            }
            const track = trackRef.current;
            const items = track ? Array.from(track.querySelectorAll('[role="tab"]')) : [];
            const index = items.indexOf(document.activeElement);
            if (index < 0) {
                return;
            }
            event.preventDefault();
            const last = items.length - 1;
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                        ? last
                        : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
            // The browser would scroll the focused element into view on its own,
            // vertically included; `preventScroll` hands that job to us.
            items[next].focus({ preventScroll: true });
            revealHorizontally(track, items[next], reduceMotion ? 'auto' : 'smooth');
        },
        [tabs, reduceMotion],
    );

    const chevron = (side) => (
        <>
            <span
                aria-hidden="true"
                data-tab-fade={side}
                className={`tab-fade tab-fade-${side}`}
            />
            <button
                type="button"
                data-tab-scroll={side}
                aria-label={side === 'start' ? local.previous : local.next}
                title={side === 'start' ? local.previous : local.next}
                onClick={() => page(side === 'start' ? -1 : 1)}
                className={`tab-scroll-button tab-scroll-${side}`}
            >
                <Icon name={side === 'start' ? 'chevron_left' : 'chevron_right'} size={20} />
            </button>
        </>
    );

    return (
        <div
            className={`tab-scroller ${surface === 'card' ? 'tab-scroller-on-card' : ''} ${className}`}
            data-overflow-start={overflow.start ? 'true' : 'false'}
            data-overflow-end={overflow.end ? 'true' : 'false'}
        >
            <div
                ref={trackRef}
                role={tabs ? 'tablist' : undefined}
                aria-label={ariaLabel}
                onKeyDown={onKeyDown}
                className={`tab-track ${trackClassName}`}
            >
                {children}
            </div>
            {overflow.start ? chevron('start') : null}
            {overflow.end ? chevron('end') : null}
        </div>
    );
}
