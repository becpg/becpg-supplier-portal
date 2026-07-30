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

const VARIANTS = {
    empty: { icon: 'inbox', tone: 'text-[var(--becpg-dark-grey)]', bg: 'bg-[var(--becpg-grey)]' },
    search: { icon: 'search_off', tone: 'text-[var(--becpg-dark-grey)]', bg: 'bg-[var(--becpg-grey)]' },
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
 * @param {Object} props
 * @param {'empty'|'search'|'error'|'success'} [props.variant='empty']
 * @param {string} [props.icon] overrides the variant icon
 * @param {React.ReactNode} [props.title] defaults to the variant's chrome message
 * @param {React.ReactNode} [props.message] explanatory line
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
    const { t } = useMessages();
    const reduceMotion = useReducedMotion();
    const palette = VARIANTS[variant] || VARIANTS.empty;

    const defaultTitle =
        variant === 'search'
            ? t('state.noResults')
            : variant === 'error'
              ? t('error.title')
              : t('state.empty');

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
                'flex flex-col items-center justify-center text-center',
                compact ? 'gap-2 px-4 py-6' : 'gap-3 px-4 py-12',
                className,
            ].join(' ')}
        >
            <span
                className={`flex items-center justify-center rounded-full ${palette.bg} ${palette.tone} ${
                    compact ? 'h-10 w-10' : 'h-14 w-14'
                }`}
            >
                <Icon name={icon || palette.icon} size={compact ? 22 : 28} />
            </span>
            <h3 className="text-sm font-medium sm:text-base">{title || defaultTitle}</h3>
            {message ? (
                <p className="max-w-md text-xs leading-relaxed text-[var(--becpg-dark-grey)] sm:text-sm">
                    {message}
                </p>
            ) : null}
            {children}
            {action ||
            (actionLabel && (onAction || actionHref)) ? (
                <div className="mt-1">
                    {action || (
                        <Button
                            variant={variant === 'error' ? 'outline' : 'primary'}
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
