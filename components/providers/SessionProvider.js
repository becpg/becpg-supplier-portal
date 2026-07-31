'use client';

/**
 * The session context — the shell's single source of truth.
 *
 * It starts from the **identity the root layout resolved server-side** from the
 * session cookie (`initialIdentity`: user, tenant, TEST flag) and fetches
 * `GET /api/v1/session` for the rest — the beCPG groups, the resolved `space`,
 * the supplier(s) and the capabilities, none of which can be read off a cookie.
 * The result is kept for the lifetime of the tab (the provider is mounted by the
 * root layout, so it survives every client navigation).
 *
 * **Why the seed exists.** Without it the provider began every document at
 * `session = null`, which the shell renders as the *signed-out* state: no name,
 * no tenant, no navigation. The first paint after a successful login was
 * therefore always signed-out chrome over a perfectly valid session, and the one
 * request that could fix it had no retry — a timeout, a network blip or an
 * upstream failure while composing the payload left the shell signed-out until
 * the user reloaded the page by hand. The seed makes the signed-in state a
 * property of the document, not of a race.
 *
 * Consequently: **only a 401 clears the session.** Every other failure is a
 * failed *read* of a session that still exists, and is reported as an error
 * without repainting the shell as signed out.
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
 * @param {{user: Object, tenant: Object|null, isTest: boolean, lang: string}} [props.initialIdentity]
 *        server-rendered seed built by `app/layout.js` from the session cookie.
 *        Partial by construction — identity only, never `space` / `groups` /
 *        `suppliers` / `capabilities` — so it never replaces the fetch below.
 * @param {React.ReactNode} props.children
 */
export function SessionProvider({ initialIdentity = null, children }) {
    const pathname = usePathname();
    const publicPage = isPublicPathname(pathname);
    const [nonce, setNonce] = useState(0);
    const redirecting = useRef(false);

    // One state object keyed by "which fetch belongs in flight". Same shape and
    // same reason as `useApi` in lib/client.js: when the key changes the state is
    // adjusted **during render** rather than in an effect, so leaving /login for
    // an application page shows the loading state immediately instead of painting
    // one settled frame of the signed-out shell first.
    const key = `${publicPage ? 'public' : 'private'}:${nonce}`;
    const [state, setState] = useState({
        key,
        session: publicPage ? null : initialIdentity,
        error: null,
        loading: !publicPage,
    });

    if (state.key !== key) {
        setState({
            key,
            session: publicPage ? null : state.session,
            error: null,
            loading: !publicPage,
        });
    }

    const { session, error, loading } = state;

    useEffect(() => {
        if (publicPage) {
            return undefined;
        }
        const controller = new AbortController();
        let alive = true;

        api.get('session', { signal: controller.signal, silent401: true })
            .then((payload) => {
                if (!alive) {
                    return;
                }
                setState({ key, session: payload, error: null, loading: false });
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
                // **A 401 is the only answer that means "there is no session".** The
                // server has just said the cookie is gone, expired or refused, and the
                // shell must show that. Anything else — a timeout, a network error, a
                // 5xx, an upstream beCPG failure while composing the payload — is a
                // failed READ of a session the browser still holds; dropping the
                // server-seeded identity on it is precisely what used to paint the
                // signed-out shell over a user who had just signed in successfully.
                setState((previous) => ({
                    key,
                    session: cause.status === 401 ? null : previous.session,
                    error: cause,
                    loading: false,
                }));
            });

        return () => {
            alive = false;
            controller.abort();
        };
    }, [publicPage, key]);

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
                // The identity is deliberately left alone: the loop is a failing
                // endpoint, not a lost session, and blanking the shell on top of it
                // would hide who the user is while telling them nothing new.
                setState((previous) => ({
                    ...previous,
                    error: new Error('unauthorized_loop'),
                    loading: false,
                }));
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
