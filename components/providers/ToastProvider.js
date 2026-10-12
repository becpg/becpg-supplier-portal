'use client';

/**
 * The toast queue.
 *
 * Deliberately small: an id generator, a bounded FIFO, an auto-dismiss timer per
 * toast, and one `<ToastViewport>` rendered at the root. Errors never auto-dismiss
 * — a failed upload the user did not see is a failed upload they will repeat.
 *
 * `useToast()` is the only API screens need:
 *
 * ```js
 * const toast = useToast();
 * toast.success('Document déposé');
 * toast.error(error);                       // an ApiError resolves its own message
 * toast.show({ title, message, action: { label, onClick }, duration: 0 });
 * ```
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/client';
import { ToastViewport } from '@/components/ui/Toast';
import { useMessages } from '@/lib/messages';

/** Default lifetime per variant, in ms. `0` = sticky. */
const DEFAULT_DURATION = { success: 4000, info: 5000, warning: 7000, error: 0 };

/** Never stack more than this — the rest of the screen still has to be usable. */
const MAX_TOASTS = 4;

const GENERIC_ERROR_KEY = 'error.generic';

/** `ApiError.name`, for an instance built by another copy of the client module. */
const API_ERROR_NAME = 'ApiError';

const ToastContext = createContext({
    show: () => '',
    success: () => '',
    error: () => '',
    warning: () => '',
    info: () => '',
    dismiss: () => {},
    dismissAll: () => {},
});

let counter = 0;
function nextId() {
    counter += 1;
    return `toast-${counter}`;
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function ToastProvider({ children }) {
    const { t } = useMessages();
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        timers.current.forEach((timer) => clearTimeout(timer));
        timers.current.clear();
        setToasts([]);
    }, []);

    /**
     * Pushes a toast.
     *
     * @param {Object|string} options message string, or
     *   `{ variant, title, message, action: {label, onClick}, duration }`
     * @returns {string} the toast id, for a manual `dismiss()`
     */
    const show = useCallback(
        (options) => {
            const config = typeof options === 'string' ? { message: options } : options || {};
            const variant = config.variant || 'info';
            const id = config.id || nextId();
            const duration =
                config.duration === undefined ? DEFAULT_DURATION[variant] : config.duration;

            // The same sentence shown again replaces the one on screen: a retried action
            // that fails the same way must not stack three identical errors.
            setToasts((current) => {
                const same = (toast) => toast.id === id
                    || (toast.variant === variant
                        && toast.title === config.title
                        && toast.message === config.message);
                const next = [...current.filter((toast) => !same(toast)), { ...config, id, variant }];
                return next.slice(-MAX_TOASTS);
            });

            if (duration > 0) {
                const timer = setTimeout(() => dismiss(id), duration);
                timers.current.set(id, timer);
            }
            return id;
        },
        [dismiss],
    );

    // Cleanup on unmount: a pending timer must not fire against a dead tree.
    const timersRef = timers;
    useEffect(() => {
        const map = timersRef.current;
        return () => {
            map.forEach((timer) => clearTimeout(timer));
            map.clear();
        };
    }, [timersRef]);

    const value = useMemo(() => {
        const normalize = (input, fallbackKey) => toastContent(input, { fallbackKey, t });

        return {
            show,
            dismiss,
            dismissAll,
            /** @param {string|{title,message}} input */
            success: (input, extra) => show({ variant: 'success', ...normalize(input), ...extra }),
            /** @param {string|Error} input an ApiError resolves its own message */
            error: (input, extra) => show({ variant: 'error', ...normalize(input, GENERIC_ERROR_KEY), ...extra }),
            warning: (input, extra) => show({ variant: 'warning', ...normalize(input), ...extra }),
            info: (input, extra) => show({ variant: 'info', ...normalize(input), ...extra }),
        };
    }, [show, dismiss, dismissAll, t]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

/**
 * What a toast says for whatever a screen hands it: a string, a
 * `{title, message}` object, or an Error.
 *
 * An `ApiError` from `lib/client.js` always resolves its `messageKey` against
 * the chrome dictionary, so the user reads "Vous n'avez pas les droits…" and
 * never a raw upstream sentence. A plain `new Error(text)` is the portal's own
 * wording, written for the user, and is shown as is. Any other Error subclass
 * (a TypeError, a pdf.js failure) is a technical message and gets the generic
 * one.
 *
 * @param {string|Object|Error} input
 * @param {{fallbackKey?: string, t: (key: string) => string}} options
 * @returns {{title?: string, message?: string}}
 */
export function toastContent(input, { fallbackKey, t }) {
    if (!(input instanceof Error)) {
        return typeof input === 'string' ? { message: input } : input || {};
    }
    const title = t('error.title');
    const isApiError = input instanceof ApiError || input.name === API_ERROR_NAME;
    if (input.messageKey || isApiError) {
        return { title, message: t(input.messageKey || fallbackKey || GENERIC_ERROR_KEY) };
    }
    if (Object.getPrototypeOf(input) === Error.prototype && input.message) {
        return { title, message: input.message };
    }
    return { title, message: t(fallbackKey || GENERIC_ERROR_KEY) };
}

/**
 * @returns {{show: Function, success: Function, error: Function, warning: Function,
 *            info: Function, dismiss: Function, dismissAll: Function}}
 */
export function useToast() {
    return useContext(ToastContext);
}
