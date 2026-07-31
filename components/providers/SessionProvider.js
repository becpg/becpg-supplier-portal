'use client';

/**
 * The session context — the shell's single source of truth.
 *
 * It fetches `GET /api/v1/session` **once** on mount and keeps the result for
 * the lifetime of the tab (the provider is mounted by the root layout, so it
 * survives every client navigation). That one payload carries everything the
 * chrome needs: the user, the tenant (label, logo, TEST flag), the beCPG groups,
 * the resolved `space`, the supplier(s) and the capabilities.
 *
 * It never sees a ticket or a token — `/api/v1/session` returns
 * `toPublicSession()` / `toPublicTenant()` projections (AGENTS.md rule 5).
 *
 * It is also the component that reacts to expiry: `lib/client.js` dispatches
 * `portal:unauthorized` on any 401, and the provider restarts the OIDC flow with
 * `next=` pointing back at the page the user was on. Nothing else in the app has
 * to handle session loss.
 *
 * On `/login` no call is made at all — there is no session to fetch, and the
 * page is the only public one.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { UNAUTHORIZED_EVENT, api, tenantPrefix } from '@/lib/client';

/**
 * @typedef {Object} PortalSession
 * @property {{sub, name, email, username, tenantId, authMode, expiresAt, createdAt}|null} user
 * @property {{id, label, logoUrl, isTest}|null} tenant
 * @property {boolean} isTest
 * @property {'fr'|'en'} lang
 * @property {'supplier'|'monitor'|'unknown'} space
 * @property {string[]} groups beCPG group names
 * @property {Array<Object>} suppliers supplier refs the user acts for
 * @property {Object|null} supplier the primary supplier
 * @property {{isExternalUser: boolean, canMonitor: boolean}} capabilities
 */

const EMPTY_CAPABILITIES = Object.freeze({ isExternalUser: false, canMonitor: false });

/** sessionStorage key holding the recent re-login attempts, so the guard survives a reload. */
const RELOGIN_KEY = 'becpg_portal_relogin_attempts';

/** Re-login attempts tolerated inside {@link RELOGIN_WINDOW_MS} before giving up. */
const RELOGIN_MAX = 2;

/** Window over which re-login attempts are counted, in ms. */
const RELOGIN_WINDOW_MS = 30_000;

const SessionContext = createContext({
    session: null,
    user: null,
    tenant: null,
    isTest: false,
    space: 'unknown',
    groups: [],
    suppliers: [],
    supplier: null,
    capabilities: EMPTY_CAPABILITIES,
    loading: true,
    error: null,
    isAuthenticated: false,
    refresh: () => {},
    signOut: () => {},
});

/** Pages that must never trigger a session call. */
function isPublicPathname(pathname) {
    if (!pathname) {
        return false;
    }
    const stripped = pathname.replace(/^\/t\/[^/]+/, '');
    return stripped === '/login' || stripped.startsWith('/login/');
}

/**
 * @param {Object} props
 * @param {Object} [props.initialSession] server-rendered seed; skips the first fetch
 * @param {React.ReactNode} props.children
 */
export function SessionProvider({ initialSession = null, children }) {
    const pathname = usePathname();
    const publicPage = isPublicPathname(pathname);

    const [session, setSession] = useState(initialSession);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(!initialSession && !publicPage);
    const [nonce, setNonce] = useState(0);
    const redirecting = useRef(false);

    useEffect(() => {
        if (publicPage || (initialSession && nonce === 0)) {
            return undefined;
        }
        const controller = new AbortController();
        let alive = true;

        api.get('session', { signal: controller.signal, silent401: true })
            .then((payload) => {
                if (!alive) {
                    return;
                }
                setSession(payload);
                setError(null);
                setLoading(false);
                // The counter is deliberately NOT cleared here.
                //
                // It used to be, "so a legitimate expiry hours later is not refused because of
                // an old incident" — but re-login always makes this very call succeed, which is
                // the whole point of re-logging in. Clearing on that success therefore reset the
                // counter on *every* bounce and the guard below could never trip. Measured on
                // /tasks/<id>?step=<n> with a step endpoint answering 401: 14 full navigations
                // and 6 trips through /api/auth/login in 30 s, still going — the infinite loop
                // the guard exists to stop.
                //
                // RELOGIN_WINDOW_MS already gives the ageing that was wanted: attempts older
                // than the window are filtered out below, so an expiry hours later starts from
                // a clean slate without anything having to erase the counter.
            })
            .catch((cause) => {
                if (!alive || cause.name === 'AbortError') {
                    return;
                }
                setSession(null);
                setError(cause);
                setLoading(false);
            });

        return () => {
            alive = false;
            controller.abort();
        };
    }, [publicPage, initialSession, nonce]);

    // Session expiry: restart the OIDC flow, once, aimed back at this page.
    useEffect(() => {
        if (publicPage) {
            return undefined;
        }
        const onUnauthorized = () => {
            if (redirecting.current) {
                return;
            }

            // The in-memory guard only covers ONE page load, and re-login triggers a full
            // navigation that resets it. Without a guard that survives the reload, a 401 that
            // keeps coming back — an endpoint failing for a reason login cannot fix — spins the
            // browser between the page and the login route forever. Observed on
            // /tasks/<id>?step=<n> when a Share call answered 401.
            //
            // So: at most RELOGIN_MAX attempts inside RELOGIN_WINDOW_MS. Beyond that we stop
            // redirecting and let the screen show its error, which is the honest outcome —
            // logging in again would not help.
            const now = Date.now();
            let attempts = [];
            try {
                attempts = JSON.parse(window.sessionStorage.getItem(RELOGIN_KEY) || '[]');
            }
            catch {
                attempts = [];
            }
            const recent = attempts.filter((at) => now - at < RELOGIN_WINDOW_MS);

            if (recent.length >= RELOGIN_MAX) {
                console.warn(
                    '[session] repeated 401 after re-login — not redirecting again. '
                    + 'The failing call is not an authentication problem.',
                );
                redirecting.current = true;
                setError(new Error('unauthorized_loop'));
                setLoading(false);
                return;
            }

            recent.push(now);
            try {
                window.sessionStorage.setItem(RELOGIN_KEY, JSON.stringify(recent));
            }
            catch {
                // Private browsing without sessionStorage: the in-memory guard still applies.
            }

            redirecting.current = true;
            const next = `${window.location.pathname}${window.location.search}`;
            window.location.assign(
                `${tenantPrefix()}/api/auth/login?next=${encodeURIComponent(next)}`,
            );
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, [publicPage]);

    const refresh = useCallback(() => setNonce((value) => value + 1), []);

    const signOut = useCallback((options = {}) => {
        const params = new URLSearchParams();
        if (options.next) {
            params.set('next', options.next);
        }
        if (options.local) {
            params.set('local', '1');
        }
        const query = params.toString();
        window.location.assign(`${tenantPrefix()}/api/auth/logout${query ? `?${query}` : ''}`);
    }, []);

    const value = useMemo(
        () => ({
            session,
            user: session ? session.user || null : null,
            tenant: session ? session.tenant || null : null,
            isTest: Boolean(session && session.isTest),
            space: (session && session.space) || 'unknown',
            groups: (session && session.groups) || [],
            suppliers: (session && session.suppliers) || [],
            supplier: (session && session.supplier) || null,
            capabilities: (session && session.capabilities) || EMPTY_CAPABILITIES,
            loading,
            error,
            isAuthenticated: Boolean(session && session.user),
            refresh,
            signOut,
        }),
        [session, loading, error, refresh, signOut],
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Reads the session context.
 *
 * @returns {PortalSession & {loading: boolean, error: Error|null, isAuthenticated: boolean,
 *                            refresh: Function, signOut: Function}}
 *
 * @example
 * const { tenant, supplier, space, loading } = useSession();
 */
export function useSession() {
    return useContext(SessionContext);
}

/**
 * True when the user belongs to the monitoring space (Qualité / Achats /
 * Référencement). Sugar over `capabilities.canMonitor`, used by the nav.
 *
 * @returns {boolean}
 */
export function useCanMonitor() {
    const { capabilities } = useSession();
    return Boolean(capabilities && capabilities.canMonitor);
}
