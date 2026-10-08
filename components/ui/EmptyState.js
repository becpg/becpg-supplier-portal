'use client';

/**
 * The "nothing here" and "it broke" surfaces.
 *
 * An empty list is never a blank area: it says what is missing and offers the
 * one action that fills it. The three variants cover everything the portal
 * needs — `empty` (no data yet), `search` (a filter matched nothing) and
 * `error` (a call failed, with a retry).
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Button, Icon } from '@/components/ui/Button';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

/*
 * The medallion behind the icon. `empty` and `search` used a flat
 * `--becpg-grey` disc with a `--becpg-dark-grey` glyph (3.90:1); they are now
 * `--becpg-blue-lighter` with a `--becpg-blue` glyph (8.72:1) — the same pairing
 * as a Card's header chip, so an empty list looks like part of the product
 * rather than like a missing image.
 */
const VARIANTS = {
    empty: { icon: 'inbox', tone: 'text-[var(--becpg-blue)]', bg: 'bg-[var(--becpg-blue-lighter)]' },
    search: {
        icon: 'search_off',
        tone: 'text-[var(--becpg-blue)]',
        bg: 'bg-[var(--becpg-blue-lighter)]',
    },
    error: {
        icon: 'error_outline',
        tone: 'text-[var(--status-danger)]',
        bg: 'bg-[var(--status-danger-bg)]',
    },
    success: {
        icon: 'task_alt',
        tone: 'text-[var(--status-ok)]',
        bg: 'bg-[var(--status-ok-bg)]',
    },
};

/**
 * The sentence under the title.
 *
 * An empty state that only says "Aucun élément à afficher" tells a supplier
 * nothing; it has to say *why* it is empty and what happens next. These are
 * portal chrome, but they are sentences rather than labels, and `config/messages.js`
 * is explicitly capped at ~60 keys — so they live here, next to the component
 * that owns them, the same way `DataTable` keeps its table mechanics local.
 */
const SENTENCES = defineLabels('components/ui/EmptyState#SENTENCES', {
    fr: {
        empty: "Il n'y a rien à afficher ici pour le moment. Les éléments apparaîtront dès qu'ils auront été créés ou transmis.",
        search: 'Aucun élément ne correspond à votre recherche. Essayez avec moins de mots ou retirez un filtre.',
        error: null,
        success: null,
    },
    en: {
        empty: 'There is nothing to show here yet. Items will appear as soon as they are created or submitted.',
        search: 'No item matches your search. Try fewer words, or remove one of the filters.',
        error: null,
        success: null,
    },
});

/**
 * @param {Object} props
 * @param {'empty'|'search'|'error'|'success'} [props.variant='empty']
 * @param {string} [props.icon] overrides the variant icon
 * @param {React.ReactNode} [props.title] defaults to the variant's chrome message
 * @param {React.ReactNode} [props.message] explanatory line; falls back to the
 *        variant's own sentence (`SENTENCES`) — pass `''` for no sentence at all
 * @param {React.ReactNode} [props.action] a `<Button>`; use `actionLabel`+`onAction` for the simple case
 * @param {string} [props.actionLabel]
 * @param {Function} [props.onAction]
 * @param {string} [props.actionHref]
 * @param {boolean} [props.compact] tighter padding, for an empty card body
 */
export function EmptyState({
    variant = 'empty',
    icon,
    title,
    message,
    action,
    actionLabel,
    onAction,
    actionHref,
    compact = false,
    className = '',
    children,
}) {
    const { t, lang } = useMessages();
    const reduceMotion = useReducedMotion();
    const palette = VARIANTS[variant] || VARIANTS.empty;

    const defaultTitle =
        variant === 'search'
            ? t('state.noResults')
            : variant === 'error'
              ? t('error.title')
              : t('state.empty');

    const sentences = pickLabels(SENTENCES, lang);
    const finalMessage = message === undefined || message === null ? sentences[variant] : message;

    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.25, ease: 'easeOut' },
          };

    return (
        <motion.div
            {...motionProps}
            role={variant === 'error' ? 'alert' : undefined}
            className={[
                'relative flex flex-col items-center justify-center overflow-hidden text-center',
                compact ? 'gap-2 px-4 py-6' : 'gap-3 px-4 py-12',
                className,
            ].join(' ')}
        >
            {/*
              * `shape.png` — the range's background mark, the one theme.css pins to
              * the bottom-right of every content area. An empty list is the one
              * surface with room for it, and it is exactly what turns a blank
              * rectangle into a beCPG page.
              *
              * No `opacity` on it, and that is deliberate: the asset is drawn in
              * flat `#e5ecee`, i.e. `--becpg-grey` itself, so on a white surface it
              * already measures 1.20:1 — discreet is what it *is*, and dimming it
              * further would simply erase it. (The login hero needs 13% only
              * because it puts the same mark on dark blue.)
              *
              * Behind everything, `pointer-events-none`, `aria-hidden`, and the
              * text above it carries its own stacking context so the sentence is
              * never read through the mark.
              */}
            <span
                className="bg-shape pointer-events-none absolute bottom-0 end-0 h-[72%] w-1/2 max-w-[180px]"
                /* `contain`, not the utility's `min(70%, 340px)`: an empty state is
                   a wide, short box, and a width-driven background got cropped into
                   a grey wedge. Fitting the mark to the *height* keeps it whole and
                   in proportion whatever the container. */
                style={{ backgroundSize: 'contain' }}
                aria-hidden="true"
            />
            <span
                className={`relative flex items-center justify-center rounded-full ${palette.bg} ${palette.tone} ${
                    compact ? 'h-10 w-10' : 'h-14 w-14'
                }`}
            >
                <Icon name={icon || palette.icon} size={compact ? 22 : 28} />
            </span>
            <p className="relative text-sm font-medium text-[var(--becpg-blue)] sm:text-base">
                {title || defaultTitle}
            </p>
            {finalMessage ? (
                <p className="relative max-w-md text-xs leading-relaxed text-[var(--becpg-dark-grey)] sm:text-sm">
                    {finalMessage}
                </p>
            ) : null}
            {children}
            {action ||
            (actionLabel && (onAction || actionHref)) ? (
                <div className="relative mt-1">
                    {action || (
                        /* The one action an empty state offers *is* the call to
                           action of that surface, so it takes the accent. A retry
                           after an error is not: it is a repair, and it sits in the
                           softer outline next to a red medallion. */
                        <Button
                            variant={variant === 'error' ? 'outline' : 'accent'}
                            size="sm"
                            icon={variant === 'error' ? 'refresh' : undefined}
                            onClick={onAction}
                            href={actionHref}
                        >
                            {actionLabel}
                        </Button>
                    )}
                </div>
            ) : null}
        </motion.div>
    );
}

/**
 * Error surface bound to an `ApiError` from `lib/client.js`: it resolves the
 * error's `messageKey` against the chrome messages, so a 403 reads
 * "Vous n'avez pas les droits…" and never a raw upstream sentence.
 *
 * @param {Object} props
 * @param {Error & {messageKey?: string, status?: number}} props.error
 * @param {Function} [props.onRetry]
 * @param {boolean} [props.compact]
 */
export function ErrorState({ error, onRetry, compact = false, className = '' }) {
    const { t } = useMessages();
    if (!error) {
        return null;
    }
    const key = error.messageKey || 'error.generic';
    return (
        <EmptyState
            variant="error"
            title={t('error.title')}
            message={t(key)}
            compact={compact}
            className={className}
            actionLabel={onRetry ? t('action.retry') : undefined}
            onAction={onRetry}
        />
    );
}
