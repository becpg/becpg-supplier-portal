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
 * A Material icon.
 *
 * @param {Object} props
 * @param {string} props.name Material icon ligature (e.g. `check_circle`)
 * @param {number} [props.size=20] pixel size (font-size, width and height)
 * @param {string} [props.className]
 */
export function Icon({ name, size = 20, className = '', ...rest }) {
    return (
        <span
            className={`material-icons shrink-0 select-none leading-none ${className}`}
            style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
            aria-hidden="true"
            {...rest}
        >
            {name}
        </span>
    );
}

/** Visual variants. `primary` is the single call to action of a screen. */
const VARIANTS = {
    primary:
        'bg-[var(--becpg-blue)] text-white border border-transparent hover:bg-[var(--becpg-blue-light)] active:bg-[var(--becpg-blue)] shadow-sm',
    accent:
        'bg-[var(--becpg-orange)] text-white border border-transparent hover:brightness-110 active:brightness-95 shadow-sm',
    secondary:
        'bg-[var(--becpg-grey)] text-[var(--becpg-blue)] border border-transparent hover:bg-[var(--becpg-blue-lighter)]',
    outline:
        'bg-white text-[var(--becpg-blue)] border border-[var(--becpg-blue-lighter)] hover:border-[var(--becpg-blue-light)] hover:bg-[var(--becpg-blue-lighter)]/40',
    ghost:
        'bg-transparent text-[var(--becpg-blue)] border border-transparent hover:bg-[var(--becpg-grey)]',
    danger:
        'bg-[var(--status-danger)] text-white border border-transparent hover:brightness-110 shadow-sm',
    subtle:
        'bg-transparent text-[var(--becpg-dark-grey)] border border-transparent hover:bg-[var(--becpg-grey)] hover:text-[var(--becpg-blue)]',
    link: 'bg-transparent text-[var(--becpg-blue-light)] border border-transparent underline underline-offset-2 hover:text-[var(--becpg-orange)] p-0',
};

const SIZES = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-md min-h-[32px]',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-lg min-h-[40px]',
    lg: 'text-base px-5 py-2.5 gap-2 rounded-lg min-h-[48px]',
    icon: 'p-2 gap-0 rounded-lg min-h-[40px] min-w-[40px] justify-center',
};

const ICON_SIZES = { sm: 16, md: 18, lg: 20, icon: 20 };

const BASE =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)] focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

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
