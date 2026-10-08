'use client';

/**
 * Buttons and the shared Material icon wrapper.
 *
 * The portal has no icon package: Material Icons are already loaded by the root
 * layout, so `<Icon name="check" />` is the single icon primitive of the whole
 * component library. Its font-size is set inline on purpose — the Google
 * stylesheet and the Tailwind utilities both target a single class, and their
 * order in <head> is not guaranteed.
 *
 * Every interactive element reaches the 44px touch target on phones (`.touch-target`
 * from globals.css) — spec §4.3 "utilisable au téléphone".
 */

import { forwardRef } from 'react';
import Link from 'next/link';

/**
 * Glyphs that point along the reading direction: « next » is a chevron to the
 * right in French and to the left in Arabic. Mirrored by `.rtl-mirror` in a
 * right-to-left document; every other glyph — a check, a cloud — is not.
 */
const DIRECTIONAL_ICONS = new Set([
    'arrow_back', 'arrow_forward', 'arrow_left', 'arrow_right', 'chevron_left', 'chevron_right',
    'navigate_before', 'navigate_next', 'first_page', 'last_page', 'keyboard_arrow_left',
    'keyboard_arrow_right', 'keyboard_double_arrow_left', 'keyboard_double_arrow_right',
    'east', 'west', 'logout', 'login', 'open_in_new', 'send', 'reply', 'redo', 'undo',
    'list', 'format_list_bulleted', 'segment', 'subdirectory_arrow_right',
]);

/**
 * A Material icon.
 *
 * @param {Object} props
 * @param {string} props.name Material icon ligature (e.g. `check_circle`)
 * @param {number} [props.size=20] pixel size (font-size, width and height)
 * @param {string} [props.className]
 */
export function Icon({ name, size = 20, className = '', ...rest }) {
    const mirror = DIRECTIONAL_ICONS.has(name) ? ' rtl-mirror' : '';
    return (
        <span
            className={`material-icons shrink-0 select-none leading-none${mirror} ${className}`}
            style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
            aria-hidden="true"
            {...rest}
        >
            {name}
        </span>
    );
}

/**
 * Visual variants, in the beCPG action hierarchy.
 *
 *   primary    `--becpg-blue`        the safe main action (white on blue, 11.0:1)
 *   accent     `--becpg-orange-deep` the *call to action* — the brand's action colour
 *   secondary  outline blue          the alternative, same weight as primary
 *   outline    soft outline          a tertiary action in a dense toolbar
 *   ghost / subtle / link            no surface at all
 *   danger     `--status-danger`     destructive
 *
 * Measured, on white:
 *   white on `--becpg-blue` ................... 11.01:1 ✓ (hover blue-light 7.04:1)
 *   white on `--becpg-orange` ................. 2.95:1  ✗ — why `accent` is not #ff642d
 *   white on `--becpg-orange-deep` ............ 4.83:1  ✓ (active 5.92:1)
 *   `--becpg-blue` on white / blue-lighter .... 11.01 / 8.72:1 ✓
 *   white on `--status-danger` ................. 6.54:1 ✓
 *   `--becpg-dark-grey` on white .............. 4.67:1 ✓
 *   `--becpg-blue-light` on white ............. 7.04:1 ✓ (link hover, deep orange 4.83:1)
 *
 * Every hover *darkens*: `brightness-110` used to lighten the accent and the
 * danger surfaces, which lowered their contrast with the white label exactly
 * when the pointer was on them.
 */
const VARIANTS = {
    primary:
        'bg-[var(--becpg-blue)] text-white border border-transparent hover:bg-[var(--becpg-blue-light)] active:bg-[var(--becpg-blue)] shadow-[0_1px_2px_rgba(0,66,84,0.25)]',
    accent:
        'bg-[var(--becpg-orange-deep)] text-white border border-transparent hover:bg-[var(--becpg-orange-deep-active)] active:bg-[var(--becpg-orange-deep-active)] shadow-[0_1px_2px_rgba(0,66,84,0.25)]',
    secondary:
        'bg-white text-[var(--becpg-blue)] border border-[var(--becpg-blue)] hover:bg-[var(--becpg-blue-lighter)]',
    outline:
        'bg-white text-[var(--becpg-blue)] border border-[var(--becpg-blue-lighter)] hover:border-[var(--becpg-blue-light)] hover:bg-[rgba(214,232,237,0.4)]',
    ghost:
        'bg-transparent text-[var(--becpg-blue)] border border-transparent hover:bg-[var(--becpg-grey)]',
    danger:
        'bg-[var(--status-danger)] text-white border border-transparent hover:brightness-90 shadow-[0_1px_2px_rgba(0,66,84,0.25)]',
    subtle:
        'bg-transparent text-[var(--becpg-dark-grey)] border border-transparent hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]',
    link: 'bg-transparent text-[var(--becpg-blue-light)] border border-transparent underline underline-offset-2 hover:text-[var(--becpg-orange-deep)] p-0',
};

const SIZES = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md min-h-[32px]',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-lg min-h-[40px]',
    lg: 'text-base px-5 py-2.5 gap-2 rounded-lg min-h-[48px]',
    icon: 'p-2 gap-0 rounded-lg min-h-[40px] min-w-[40px] justify-center',
};

const ICON_SIZES = { sm: 16, md: 18, lg: 20, icon: 20 };

/*
 * Focus ring: 2px `--becpg-orange` on a 2px offset — the range's indicator, the
 * same one theme.css names `--becpg-top-bar-border-color`. The offset colour is
 * left to Tailwind's `--tw-ring-offset-color` on purpose: `.becpg-toolbar` in
 * globals.css sets it to the bar's blue so a focused header button does not get
 * a white halo.
 *
 * Disabled: `disabled:opacity-50` used to fade the whole button, which took the
 * white-on-blue label from 11.0:1 down to ~2.7:1 — a disabled "Envoyer" was a
 * pale smudge. A disabled button now *changes surface* instead of fading:
 * `--becpg-grey` with a `--becpg-dark-grey-deep` label (4.79:1) and no shadow.
 * It reads as inert because it is flat and grey, not because it is invisible.
 * (WCAG 1.4.3 exempts inactive controls; this clears AA anyway.)
 */
const BASE =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none disabled:filter-none';

/**
 * The disabled surface, per variant.
 *
 * It is resolved in JS rather than by stacking a second set of `disabled:`
 * utilities on top of the variant, because two `disabled:` classes for the same
 * property have identical specificity and the winner would depend on Tailwind's
 * emission order — the one thing this codebase refuses to rely on.
 */
const DISABLED = {
    /* Filled variants: the surface goes flat `--becpg-grey`. */
    filled:
        'disabled:bg-[var(--becpg-grey)] disabled:text-[var(--becpg-dark-grey-deep)] disabled:border-[var(--becpg-blue-lighter)]',
    /*
     * Outlined variants keep their **white** surface and only lose the blue.
     * They must not fill with grey: a grey-filled disabled button ends up
     * *heavier* than the same button enabled (white on white), which reads as
     * "selected" instead of "unavailable" — visible on the datagrid's pager,
     * where the greyed "previous" arrow looked like the current page.
     */
    outlined:
        'disabled:bg-white disabled:text-[var(--becpg-dark-grey-deep)] disabled:border-[var(--becpg-blue-lighter)]',
    /* Variants that own no surface: only the label greys out, nothing appears. */
    text: 'disabled:bg-transparent disabled:text-[var(--becpg-dark-grey-deep)] disabled:border-transparent disabled:no-underline',
};

const DISABLED_BY_VARIANT = {
    primary: DISABLED.filled,
    accent: DISABLED.filled,
    danger: DISABLED.filled,
    secondary: DISABLED.outlined,
    outline: DISABLED.outlined,
    ghost: DISABLED.text,
    subtle: DISABLED.text,
    link: DISABLED.text,
};

/**
 * The portal button. Renders a `<button>`, or a `next/link` when `href` is set.
 *
 * @param {Object} props
 * @param {'primary'|'accent'|'secondary'|'outline'|'ghost'|'danger'|'subtle'|'link'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'|'icon'} [props.size='md']
 * @param {string} [props.icon] leading Material icon name
 * @param {string} [props.iconRight] trailing Material icon name
 * @param {boolean} [props.loading] shows a spinner and disables the button
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.href] renders a link instead of a button
 * @param {boolean} [props.external] with `href`: plain <a> + target=_blank
 * @param {string} [props.label] accessible name for an icon-only button (required when size="icon")
 * @param {React.ReactNode} [props.children]
 */
export const Button = forwardRef(function Button(
    {
        variant = 'primary',
        size = 'md',
        icon,
        iconRight,
        loading = false,
        fullWidth = false,
        href,
        external = false,
        label,
        className = '',
        children,
        disabled,
        type = 'button',
        ...rest
    },
    ref,
) {
    const iconSize = ICON_SIZES[size] || 18;
    const classes = [
        BASE,
        VARIANTS[variant] || VARIANTS.primary,
        DISABLED_BY_VARIANT[variant] || DISABLED.filled,
        SIZES[size] || SIZES.md,
        fullWidth ? 'w-full' : '',
        'touch-target',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const content = (
        <>
            {loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null}
            {children ? <span className="truncate">{children}</span> : null}
            {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
        </>
    );

    if (href && !disabled && !loading) {
        if (external) {
            return (
                <a
                    ref={ref}
                    href={href}
                    className={classes}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...rest}
                >
                    {content}
                </a>
            );
        }
        return (
            <Link ref={ref} href={href} className={classes} aria-label={label} {...rest}>
                {content}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-label={label}
            aria-busy={loading || undefined}
            {...rest}
        >
            {content}
        </button>
    );
});

/**
 * Icon-only button. `label` is mandatory — it becomes the accessible name.
 *
 * @param {Object} props
 * @param {string} props.icon Material icon name
 * @param {string} props.label accessible name (also used as the native tooltip)
 */
export const IconButton = forwardRef(function IconButton(
    { icon, label, variant = 'ghost', size = 'icon', title, ...rest },
    ref,
) {
    return (
        <Button
            ref={ref}
            variant={variant}
            size={size}
            icon={icon}
            label={label}
            title={title || label}
            {...rest}
        />
    );
});

/**
 * Inline spinner, also usable on its own next to a "saving…" label.
 *
 * @param {Object} props
 * @param {number} [props.size=18]
 */
export function Spinner({ size = 18, className = '' }) {
    return (
        <svg
            className={`animate-spin ${className}`}
            style={{ width: `${size}px`, height: `${size}px` }}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

/**
 * Groups buttons with a shared gutter; stacks them on phones.
 *
 * @param {Object} props
 * @param {'start'|'end'|'between'} [props.align='end']
 * @param {boolean} [props.stackOnMobile=true]
 */
export function ButtonGroup({ align = 'end', stackOnMobile = true, className = '', children }) {
    const justify =
        align === 'start' ? 'justify-start' : align === 'between' ? 'justify-between' : 'justify-end';
    return (
        <div
            className={[
                'flex gap-2',
                stackOnMobile ? 'flex-col sm:flex-row' : 'flex-row',
                justify,
                className,
            ].join(' ')}
        >
            {children}
        </div>
    );
}
