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
import { writeScopeCookie } from '@/lib/scope';
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
 * @property {Object|null} supplier the record being worked on — always concrete
 * @property {Object|null} scopedSupplier what the lists filter on; `null` = all
 * @property {boolean} scopeAll true when the lists are widened to every record
 * @property {{isExternalUser: boolean, canMonitor: boolean}} capabilities
 */

const EMPTY_CAPABILITIES = Object.freeze({ isExternalUser: false, canMonitor: false });

/** sessionStorage key holding the recent re-login attempts, so the guard survives a reload. */
const RELOGIN_KEY = 'becpg_portal_relogin_attempts';

/**
 * localStorage key holding the supplier record the user is currently working on.
 *
 * **Why a choice exists at all.** One contact can act for several supplier
 * records — a group and its subsidiaries, a parent and its plants. The session
 * already resolves them all (`suppliers[]`; measured on dev: **13** for
 * the test supplier account), but the payload's `supplier` was simply
 * `suppliers[0]`. So *Ma fiche*, the approval banner and the document checklist
 * all described **one arbitrary record**, and the other twelve were unreachable
 * from the UI — not hidden behind a filter, absent.
 *
 * Persisted, and per user: which company I am working on is not a property of one
 * page, and re-picking it on every navigation would make it a chore rather than a
 * setting. Stored per `sub` so two accounts on the same browser do not inherit
 * each other's choice.
 */
const SUPPLIER_KEY = 'becpg_portal_active_supplier';

/**
 * Reads the stored scope for a user: `{ ref, all }`.
 *
 * Two shapes are accepted because the key predates the "all" scope: a bare
 * string is the record that was chosen before this existed, and reading it as
 * such is what stops an upgrade from silently resetting everyone's choice.
 *
 * @param {string|null} sub
 * @returns {{ref: string|null, all: boolean}}
 */
function readStoredScope(sub) {
    const empty = { ref: null, all: false };
    if (!sub || typeof window === 'undefined') {
        return empty;
    }
    try {
        const raw = JSON.parse(window.localStorage.getItem(SUPPLIER_KEY) || '{}');
        const entry = raw[sub];
        if (typeof entry === 'string') {
            return { ref: entry, all: false };
        }
        if (entry && typeof entry === 'object') {
            return { ref: entry.ref || null, all: Boolean(entry.all) };
        }
        return empty;
    }
    catch {
        return empty;
    }
}

/** Persists `{ ref, all }` for a user, merging into the per-`sub` map. */
function writeStoredScope(sub, scope) {
    if (!sub || typeof window === 'undefined') {
        return;
    }
    try {
        const raw = JSON.parse(window.localStorage.getItem(SUPPLIER_KEY) || '{}');
        window.localStorage.setItem(SUPPLIER_KEY, JSON.stringify({ ...raw, [sub]: scope }));
    }
    catch {
        // Private browsing: the choice still holds for this page's lifetime.
    }
}

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
    scopedSupplier: null,
    scopeAll: false,
    selectSupplier: () => {},
    selectAllSuppliers: () => {},
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

    /* ---------------------------------------------------------------- supplier */

    const sub = (session && session.user && session.user.sub) || null;
    const suppliers = useMemo(() => (session && session.suppliers) || [], [session]);

    // Read during render, not in an effect: an effect would paint one frame of the
    // wrong company — and on `/company` that frame is a whole supplier record.
    const [chosenRef, setChosenRef] = useState(null);
    const [scopeAll, setScopeAll] = useState(false);
    const [chosenFor, setChosenFor] = useState(null);
    if (sub && chosenFor !== sub) {
        const stored = readStoredScope(sub);
        setChosenFor(sub);
        setChosenRef(stored.ref);
        setScopeAll(stored.all);
    }

    /*
     * The scope is copied into a cookie, because the SERVER render has no other
     * way of knowing it (see `lib/scope.js`). Otherwise the dashboard composed
     * its counters over every record of the account while the bar announced a
     * single one.
     *
     * In an effect, and not during render: writing a cookie is the
     * synchronisation of an external system, exactly what an effect is for. It
     * covers both cases in one gesture — the choice that has just been made, and
     * the one already sleeping in the local storage of a browser that never had
     * this cookie.
     */
    useEffect(() => {
        writeScopeCookie(sub, { ref: chosenRef, all: scopeAll });
    }, [sub, chosenRef, scopeAll]);

    /**
     * The record being worked on. Falls back to the first one, so a single-record
     * account behaves exactly as before and a stale stored ref — a supplier the
     * user no longer acts for — cannot leave the shell pointing at nothing.
     *
     * **It stays a concrete record even under the "all" scope.** `/company`, the
     * approval banner and the document check-list describe *one* company; there
     * is no such thing as the profile of "all my records". The all-scope is a
     * property of the **lists** (`/products`, `/tasks`), carried by `scopeAll`
     * and by `scopedSupplier` below, and choosing it must not blank the screens
     * that need a company.
     */
    const supplier = useMemo(() => {
        if (suppliers.length === 0) {
            return (session && session.supplier) || null;
        }
        const chosen = chosenRef
            ? suppliers.find((entry) => entry.nodeRef === chosenRef || entry.uuid === chosenRef)
            : null;
        return chosen || suppliers[0];
    }, [suppliers, chosenRef, session]);

    /**
     * What the list screens filter on: the selected record, or `null` for "all".
     *
     * `null` only ever means "do not scope"; an account acting for a single
     * record can never reach it, because scoping on the only record it has and
     * not scoping at all return the same rows.
     */
    const scopedSupplier = scopeAll && suppliers.length > 1 ? null : supplier;

    const selectSupplier = useCallback(
        (value) => {
            const ref = typeof value === 'string' ? value : (value && (value.nodeRef || value.uuid)) || null;
            setChosenRef(ref);
            setScopeAll(false);
            writeStoredScope(sub, { ref, all: false });
        },
        [sub],
    );

    /** Widens the list screens to every record the account acts for. */
    const selectAllSuppliers = useCallback(() => {
        setScopeAll(true);
        writeStoredScope(sub, { ref: chosenRef, all: true });
    }, [sub, chosenRef]);

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
            suppliers,
            supplier,
            scopedSupplier,
            scopeAll: Boolean(scopeAll && suppliers.length > 1),
            selectSupplier,
            selectAllSuppliers,
            capabilities: (session && session.capabilities) || EMPTY_CAPABILITIES,
            loading,
            error,
            isAuthenticated: Boolean(session && session.user),
            refresh,
            signOut,
        }),
        [
            session, suppliers, supplier, scopedSupplier, scopeAll,
            selectSupplier, selectAllSuppliers, loading, error, refresh, signOut,
        ],
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
