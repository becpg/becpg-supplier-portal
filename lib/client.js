'use client';

/**
 * The browser-side client for `/api/v1`.
 *
 * There is **no auth header**: the session is an httpOnly encrypted cookie, and
 * the OIDC token and the Alfresco ticket never leave the server (AGENTS.md rule 5).
 * A request therefore carries nothing but the cookie the browser already has —
 * which is also why every call is `same-origin`.
 *
 * Three things this module owns:
 *
 *  1. **URL building** — including the `/t/<tenant>` prefix. When the portal is
 *     served under `/t/acme/...` the tenant is carried by the path, so the API
 *     call must keep it (`/t/acme/api/v1/tasks`); the proxy rewrites it back.
 *  2. **Error normalisation** — every failure becomes an `ApiError` carrying the
 *     stable `code` and the `messageKey` from `lib/errors.js`, so the UI shows a
 *     chrome sentence and never a raw upstream message.
 *  3. **Session expiry** — a 401 dispatches `portal:unauthorized` on the window.
 *     `SessionProvider` listens and restarts the OIDC flow. No component has to
 *     think about it.
 *
 * Hooks (`useApi`, `useMutation`) are intentionally minimal: no cache, no
 * revalidation policy, no third-party data library. A screen that needs
 * something more elaborate composes `api.*` itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Base path of the portal API. */
export const API_BASE = '/api/v1';

/** Window event dispatched when the server answers 401. */
export const UNAUTHORIZED_EVENT = 'portal:unauthorized';

/** Default request timeout, in ms. Long enough for a formulation round trip. */
const DEFAULT_TIMEOUT = 45000;

/** `/t/<tenant>/…` — mirrors TENANT_PATH_RE in lib/tenant.js. */
const TENANT_PATH_RE = /^\/t\/([A-Za-z0-9][A-Za-z0-9._-]*)(?=\/|$)/;

/**
 * A normalised API failure.
 *
 * @property {number} status HTTP status (0 = network/abort)
 * @property {string} code stable error code from lib/errors.js (`forbidden`, `upstream`…)
 * @property {string} messageKey chrome message key (`error.forbidden`…)
 * @property {*} details optional structured payload returned by the route
 * @property {string} url the request URL, for logs
 */
export class ApiError extends Error {
    constructor(message, options = {}) {
        super(message || 'Request failed');
        this.name = 'ApiError';
        this.status = options.status === undefined ? 0 : options.status;
        this.code = options.code || 'generic';
        this.messageKey = options.messageKey || 'error.generic';
        this.details = options.details === undefined ? null : options.details;
        this.url = options.url || '';
        this.reauth = Boolean(options.reauth);
    }

    /** @returns {boolean} the session is gone or was refused */
    get isUnauthorized() {
        return this.status === 401;
    }

    /** @returns {boolean} authenticated but not allowed */
    get isForbidden() {
        return this.status === 403;
    }

    /** @returns {boolean} */
    get isNotFound() {
        return this.status === 404;
    }

    /** @returns {boolean} the browser never reached the portal */
    get isNetwork() {
        return this.status === 0;
    }
}

/**
 * The `/t/<tenant>` prefix of the current page, or `''`.
 *
 * @returns {string}
 */
export function tenantPrefix() {
    if (typeof window === 'undefined') {
        return '';
    }
    const match = TENANT_PATH_RE.exec(window.location.pathname);
    return match ? `/t/${match[1]}` : '';
}

/**
 * Builds an absolute-in-origin URL for an API path.
 *
 * Accepts a bare resource (`'tasks'`), an API path (`'/api/v1/tasks'`) or an
 * already-built URL with a query string; adds the tenant prefix and serialises
 * `params` (null/undefined/'' entries are dropped, arrays repeat the key).
 *
 * @param {string} path
 * @param {Object} [params] query parameters
 * @returns {string}
 */
export function apiUrl(path, params) {
    let target = String(path || '');
    if (!target.startsWith('/')) {
        target = `${API_BASE}/${target}`;
    }
    else if (!target.startsWith('/api/')) {
        target = `${API_BASE}${target}`;
    }

    const prefix = tenantPrefix();
    if (prefix && !target.startsWith(prefix)) {
        target = `${prefix}${target}`;
    }

    if (!params) {
        return target;
    }

    const [base, existing] = target.split('?');
    const search = new URLSearchParams(existing || '');
    Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value === undefined || value === null || value === '') {
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((entry) => {
                if (entry !== undefined && entry !== null && entry !== '') {
                    search.append(key, String(entry));
                }
            });
            return;
        }
        search.set(key, String(value));
    });
    const query = search.toString();
    return query ? `${base}?${query}` : base;
}

/**
 * Turns a failed response into an ApiError.
 *
 * Two body shapes are accepted: the route handlers' `{error:{code,message,messageKey}}`
 * (lib/errors.js) and the proxy's flat `{error, message}`.
 */
function toApiError(response, payload, url) {
    const envelope = payload && typeof payload === 'object' ? payload.error : null;
    const structured = envelope && typeof envelope === 'object' ? envelope : null;
    const code = structured
        ? structured.code
        : typeof envelope === 'string'
          ? envelope
          : 'generic';
    const message =
        (structured && structured.message) ||
        (payload && payload.message) ||
        response.statusText ||
        'Request failed';
    return new ApiError(message, {
        status: response.status,
        code,
        messageKey: (structured && structured.messageKey) || messageKeyForStatus(response.status),
        details: (structured && structured.details) || null,
        url,
        reauth: response.headers.get('X-Portal-Reauth') === '1',
    });
}

/** Fallback mapping when the server did not send a messageKey. */
function messageKeyForStatus(status) {
    if (status === 401) {
        return 'error.unauthorized';
    }
    if (status === 403) {
        return 'error.forbidden';
    }
    if (status === 404) {
        return 'error.notFound';
    }
    if (status === 413) {
        return 'error.upload';
    }
    if (status >= 500) {
        return 'error.network';
    }
    return 'error.generic';
}

function notifyUnauthorized(error) {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { error } }));
}

async function readBody(response) {
    if (response.status === 204 || response.status === 205) {
        return null;
    }
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
        try {
            return await response.json();
        }
        catch {
            return null;
        }
    }
    const text = await response.text();
    return text === '' ? null : text;
}

/**
 * The single request primitive. Everything else in this module calls it.
 *
 * @param {string} path resource path (see `apiUrl`)
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {*} [options.body] plain object → JSON; FormData/Blob/string sent as is
 * @param {Object} [options.params] query parameters
 * @param {Object} [options.headers]
 * @param {AbortSignal} [options.signal] caller-owned cancellation
 * @param {number} [options.timeout=45000] ms; 0 disables the timeout
 * @param {boolean} [options.raw=false] resolve with the `Response` (streams, blobs)
 * @param {boolean} [options.silent401=false] do not dispatch `portal:unauthorized`
 * @returns {Promise<*>} the parsed body, or the Response when `raw`
 * @throws {ApiError}
 */
export async function request(path, options = {}) {
    const {
        method = 'GET',
        body,
        params,
        headers = {},
        signal,
        timeout = DEFAULT_TIMEOUT,
        raw = false,
        silent401 = false,
    } = options;

    const url = apiUrl(path, params);
    const controller = new AbortController();
    const timer =
        timeout > 0 ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeout) : null;
    if (signal) {
        if (signal.aborted) {
            controller.abort(signal.reason);
        }
        else {
            signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
        }
    }

    const init = {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...headers },
    };

    if (body !== undefined && body !== null) {
        if (
            typeof FormData !== 'undefined' && body instanceof FormData) {
            init.body = body; // the browser sets the multipart boundary itself
        }
        else if (typeof Blob !== 'undefined' && body instanceof Blob) {
            init.body = body;
        }
        else if (typeof body === 'string') {
            init.body = body;
        }
        else {
            init.body = JSON.stringify(body);
            init.headers['Content-Type'] = 'application/json';
        }
    }

    let response;
    try {
        response = await fetch(url, init);
    }
    catch (cause) {
        if (timer) {
            clearTimeout(timer);
        }
        if (cause && (cause.name === 'AbortError' || cause.name === 'TimeoutError')) {
            const aborted = new ApiError('Request aborted', {
                status: 0,
                code: 'timeout',
                messageKey: 'error.network',
                url,
            });
            aborted.name = cause.name;
            throw aborted;
        }
        throw new ApiError('Network error', {
            status: 0,
            code: 'upstream',
            messageKey: 'error.network',
            url,
        });
    }
    if (timer) {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const payload = await readBody(response);
        const error = toApiError(response, payload, url);
        if (error.status === 401 && !silent401) {
            notifyUnauthorized(error);
        }
        throw error;
    }

    return raw ? response : readBody(response);
}

/** Convenience verbs. */
export const api = {
    /**
     * @param {string} path
     * @param {Object} [options] `{ params, signal, timeout, raw, silent401 }`
     */
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    /**
     * @param {string} path
     * @param {*} [body]
     * @param {Object} [options]
     */
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
    patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
    del: (path, options) => request(path, { ...options, method: 'DELETE' }),
    /**
     * Multipart upload. `fields` become form entries next to the file(s).
     *
     * @param {string} path
     * @param {File|File[]|FormData} file
     * @param {Object} [fields] extra form fields (documentRef, entityRef, majorVersion…)
     * @param {Object} [options] plus `onProgress(percent)` — uses XHR when given
     */
    upload: (path, file, fields = {}, options = {}) => uploadFile(path, file, fields, options),
    /** Raw `Response`, for blobs and streamed content. */
    raw: (path, options) => request(path, { ...options, raw: true }),
};

/**
 * Uploads a file. Falls back to `fetch` unless `onProgress` is given — progress
 * events are only available through XHR, and a phone on 3G deserves a real
 * progress bar.
 *
 * @param {string} path
 * @param {File|File[]|FormData} file
 * @param {Object} [fields]
 * @param {Object} [options] `{ onProgress, signal, fileField = 'file' }`
 * @returns {Promise<*>} the parsed JSON body
 */
export function uploadFile(path, file, fields = {}, options = {}) {
    const { onProgress, signal, fileField = 'file' } = options;

    let form;
    if (typeof FormData !== 'undefined' && file instanceof FormData) {
        form = file;
    }
    else {
        form = new FormData();
        const files = Array.isArray(file) ? file : [file];
        files.forEach((entry) => {
            if (entry) {
                form.append(fileField, entry, entry.name);
            }
        });
    }
    Object.keys(fields || {}).forEach((key) => {
        const value = fields[key];
        if (value !== undefined && value !== null) {
            form.append(key, String(value));
        }
    });

    if (typeof onProgress !== 'function') {
        return request(path, { method: 'POST', body: form, timeout: 0 });
    }

    const url = apiUrl(path);
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        xhr.onload = () => {
            let payload = null;
            try {
                payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            }
            catch {
                payload = null;
            }
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(payload);
                return;
            }
            const envelope = payload && payload.error;
            const error = new ApiError(
                (envelope && envelope.message) || xhr.statusText || 'Upload failed',
                {
                    status: xhr.status,
                    code: (envelope && envelope.code) || 'upload',
                    messageKey: (envelope && envelope.messageKey) || 'error.upload',
                    url,
                },
            );
            if (xhr.status === 401) {
                notifyUnauthorized(error);
            }
            reject(error);
        };
        xhr.onerror = () =>
            reject(
                new ApiError('Network error', {
                    status: 0,
                    code: 'upstream',
                    messageKey: 'error.network',
                    url,
                }),
            );
        xhr.onabort = () =>
            reject(new ApiError('Upload aborted', { status: 0, code: 'timeout', messageKey: 'error.network', url }));

        if (signal) {
            signal.addEventListener('abort', () => xhr.abort(), { once: true });
        }
        xhr.send(form);
    });
}

/**
 * Triggers a browser download of an API resource (document content, export).
 * The URL is same-origin, so the session cookie authenticates it — no blob
 * round trip, no memory copy of a 50 MB PDF.
 *
 * @param {string} path e.g. `documents/<id>/content`
 * @param {Object} [params]
 */
export function download(path, params) {
    if (typeof window === 'undefined') {
        return;
    }
    const url = apiUrl(path, { ...(params || {}), download: 1 });
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener';
    anchor.download = '';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

/**
 * GET a resource and keep it in component state.
 *
 * No global cache on purpose: the portal's data is per-supplier and short lived,
 * and a stale dashboard is worse than a second request. `refresh()` re-fetches;
 * changing `path` or `params` re-fetches automatically.
 *
 * @param {string|null} path resource path; `null` disables the call
 * @param {Object} [options]
 * @param {Object} [options.params] query parameters
 * @param {boolean} [options.enabled=true]
 * @param {*} [options.initialData]
 * @param {Function} [options.onSuccess]
 * @param {Function} [options.onError]
 * @returns {{data: *, error: ApiError|null, loading: boolean, refresh: Function, setData: Function}}
 *
 * @example
 * const { data, loading, error, refresh } = useApi('tasks', { params: { state: 'open' } });
 */
export function useApi(path, options = {}) {
    const { params, enabled = true, initialData = null, onSuccess, onError } = options;

    const key = enabled && path ? apiUrl(path, params) : null;
    // Kept in a ref and refreshed after every render, so a caller may pass
    // inline callbacks without re-triggering the fetch effect.
    const callbacks = useRef({ onSuccess, onError });
    useEffect(() => {
        callbacks.current = { onSuccess, onError };
    });

    // The fetch key is part of the state: when it changes, the state is reset
    // during render (React's "adjust state on prop change" pattern) rather than
    // in an effect — an effect that calls setState synchronously would cause a
    // second render pass on every navigation.
    const [state, setState] = useState({
        key,
        data: initialData,
        error: null,
        loading: Boolean(key),
    });
    const [nonce, setNonce] = useState(0);

    if (state.key !== key) {
        setState({ key, data: initialData, error: null, loading: Boolean(key) });
    }

    useEffect(() => {
        if (!key) {
            return undefined;
        }
        const controller = new AbortController();
        let alive = true;

        request(key, { signal: controller.signal })
            .then((data) => {
                if (!alive) {
                    return;
                }
                setState({ key, data, error: null, loading: false });
                if (callbacks.current.onSuccess) {
                    callbacks.current.onSuccess(data);
                }
            })
            .catch((error) => {
                if (!alive || error.name === 'AbortError') {
                    return;
                }
                setState({ key, data: null, error, loading: false });
                if (callbacks.current.onError) {
                    callbacks.current.onError(error);
                }
            });

        return () => {
            alive = false;
            controller.abort();
        };
    }, [key, nonce]);

    const refresh = useCallback(() => setNonce((value) => value + 1), []);
    const setData = useCallback(
        (updater) =>
            setState((previous) => ({
                ...previous,
                data: typeof updater === 'function' ? updater(previous.data) : updater,
            })),
        [],
    );

    return useMemo(
        () => ({ data: state.data, error: state.error, loading: state.loading, refresh, setData }),
        [state.data, state.error, state.loading, refresh, setData],
    );
}

/**
 * Runs a write and tracks its lifecycle. The mutation function receives whatever
 * the caller passes to `run` and must return a promise.
 *
 * @param {Function} mutation `(input) => Promise<*>`
 * @param {Object} [options] `{ onSuccess, onError }`
 * @returns {{run: Function, loading: boolean, error: ApiError|null, data: *, reset: Function}}
 *
 * @example
 * const save = useMutation((values) => api.put(`wizard/${id}/step/${step}`, values));
 * await save.run(values);
 */
export function useMutation(mutation, options = {}) {
    const [state, setState] = useState({ loading: false, error: null, data: null });
    const alive = useRef(true);
    const handlers = useRef(options);

    useEffect(() => {
        handlers.current = options;
    });

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const run = useCallback(
        async (input) => {
            setState({ loading: true, error: null, data: null });
            try {
                const data = await mutation(input);
                if (alive.current) {
                    setState({ loading: false, error: null, data });
                }
                if (handlers.current.onSuccess) {
                    handlers.current.onSuccess(data, input);
                }
                return data;
            }
            catch (error) {
                if (alive.current) {
                    setState({ loading: false, error, data: null });
                }
                if (handlers.current.onError) {
                    handlers.current.onError(error, input);
                }
                throw error;
            }
        },
        [mutation],
    );

    const reset = useCallback(() => setState({ loading: false, error: null, data: null }), []);

    return { run, reset, loading: state.loading, error: state.error, data: state.data };
}
