/**
 * Server-side fetch wrapper: timeout, bounded retry, JSON helpers, structured
 * logging.
 *
 * This module is the only place where the portal talks to the network. It is
 * deliberately generic — it knows nothing about beCPG, tickets or tenants
 * (that is `lib/becpg.js`) — and it never logs a secret: every URL is redacted
 * before it reaches a log line.
 *
 * Server only: importing it from a client component would leak nothing (there
 * is no secret in here), but there is no reason to.
 */

import {
    ERROR_CODES, TimeoutError, UpstreamError, errorFromStatus, sanitizeMessage } from '@/lib/errors';

/** Default timeout for every upstream call, in milliseconds. */
export const DEFAULT_TIMEOUT = Number(process.env.BECPG_TIMEOUT || 30000);

/** Maximum number of *retries* (so at most 1 + MAX_RETRIES attempts). */
export const MAX_RETRIES = 2;

/** Base delay of the exponential back-off between two attempts, in ms. */
const RETRY_BASE_DELAY = 200;

/** Methods we may safely replay after a 5xx or a connection reset. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

/** Query parameters whose value must never be written to a log. */
const SENSITIVE_QUERY_PARAMS = new Set([
    'alf_ticket',
    'ticket',
    'password',
    'pw',
    'pwd',
    'secret',
    'client_secret',
    'code',
    'access_token',
    'id_token',
    'refresh_token',
    'api_key',
    'apikey',
    'key',
]);

/** Headers whose value must never be written to a log. */
const SENSITIVE_HEADERS = new Set([
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-alfresco-ticket',
    'becpg_ticket',
    'x-becpg-ticket',
]);

/** Verbose logging switch (env `PORTAL_DEBUG`). */
const DEBUG = String(process.env.PORTAL_DEBUG || '').toLowerCase() === 'true';

/**
 * Replaces the value of every sensitive query parameter with `***`.
 * Also used before anything is logged or echoed in an error.
 *
 * @param {string|URL} url
 * @returns {string} a URL safe to log
 */
export function redactUrl(url) {
    try {
        const parsed = url instanceof URL ? new URL(url.toString()) : new URL(String(url));
        for (const name of parsed.searchParams.keys()) {
            if (SENSITIVE_QUERY_PARAMS.has(name.toLowerCase())) {
                parsed.searchParams.set(name, '***');
            }
        }
        if (parsed.password) {
            parsed.password = '***';
        }
        return parsed.toString();
    }
    catch {
        // Not an absolute URL: fall back on a textual redaction.
        return sanitizeMessage(url);
    }
}

/**
 * Turns headers into a plain object with sensitive values masked.
 *
 * @param {Headers|Object} headers
 * @returns {Object} loggable headers
 */
export function redactHeaders(headers) {
    const entries = headers instanceof Headers ? [...headers.entries()] : Object.entries(headers || {});
    const output = {};
    for (const [name, value] of entries) {
        output[name] = SENSITIVE_HEADERS.has(name.toLowerCase()) ? '***' : value;
    }
    return output;
}

/**
 * Structured, single-line JSON logging. Anything that ends up in a log line
 * must already be redacted by the caller.
 *
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} event dotted event name, e.g. `upstream.response`
 * @param {Object} [fields] extra context, must not contain secrets
 */
export function log(level, event, fields = {}) {
    if (level === 'debug' && !DEBUG) {
        return;
    }
    const line = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        event,
        ...fields,
    });
    if (level === 'error') {
        console.error(line);
    }
    else if (level === 'warn') {
        console.warn(line);
    }
    else {
        console.log(line);
    }
}

/** @param {string} event @param {Object} [fields] */
export const logDebug = (event, fields) => log('debug', event, fields);
/** @param {string} event @param {Object} [fields] */
export const logInfo = (event, fields) => log('info', event, fields);
/** @param {string} event @param {Object} [fields] */
export const logWarn = (event, fields) => log('warn', event, fields);
/** @param {string} event @param {Object} [fields] */
export const logError = (event, fields) => log('error', event, fields);

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {AbortSignal} [a]
 * @param {AbortSignal} [b]
 * @returns {AbortSignal|undefined}
 */
function combineSignals(a, b) {
    if (!a) {
        return b;
    }
    if (!b) {
        return a;
    }
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
        return AbortSignal.any([a, b]);
    }
    return a;
}

/**
 * A body that can only be read once (an incoming request stream) forbids any
 * retry: replaying the call would send an empty body.
 *
 * @param {*} body
 * @returns {boolean}
 */
function isSingleUseBody(body) {
    if (!body) {
        return false;
    }
    if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
        return true;
    }
    return typeof body.pipe === 'function' || typeof body[Symbol.asyncIterator] === 'function';
}

/**
 * Fetch with timeout, bounded retry and structured logging.
 *
 * Retry policy: a request is replayed at most `MAX_RETRIES` times, only on a
 * 5xx / 429 answer or a transport failure, and only when it is safe to do so
 * (idempotent method and a replayable body). Pass `retries: 0` to opt out.
 *
 * @param {string|URL} url absolute URL
 * @param {Object} [options] standard fetch init, plus:
 * @param {number} [options.timeout] milliseconds before aborting (DEFAULT_TIMEOUT)
 * @param {number} [options.retries] number of retries (defaults to the policy above)
 * @param {string} [options.label] short name of the target, used in logs
 * @returns {Promise<Response>} the upstream response, whatever its status
 * @throws {TimeoutError} when the call exceeds `timeout`
 * @throws {UpstreamError} when the transport fails
 *
 * @example
 * const response = await httpFetch(url, { method: 'GET', label: 'becpg' });
 */
export async function httpFetch(url, options = {}) {
    const {
        timeout = DEFAULT_TIMEOUT,
        retries,
        label = 'upstream',
        signal: callerSignal,
        ...init
    } = options;

    const method = (init.method || 'GET').toUpperCase();
    const safeUrl = redactUrl(url);
    const replayable = !isSingleUseBody(init.body);
    const maxRetries = retries !== undefined
        ? Math.max(0, retries)
        : (IDEMPOTENT_METHODS.has(method) && replayable ? MAX_RETRIES : 0);

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const startedAt = Date.now();

        try {
            logDebug('upstream.request', { label, method, url: safeUrl, attempt });

            const response = await fetch(url, {
                ...init,
                method,
                signal: combineSignals(controller.signal, callerSignal),
                // Never let Next cache a proxied, per-user call.
                cache: init.cache || 'no-store',
            });

            const duration = Date.now() - startedAt;
            const retryable = response.status >= 500 || response.status === 429;

            if (retryable && attempt < maxRetries) {
                logWarn('upstream.retry', {
                    label, method, url: safeUrl, status: response.status, duration, attempt,
                });
                // Drain the body so the connection can be reused.
                await response.arrayBuffer().catch(() => undefined);
                clearTimeout(timer);
                await delay(RETRY_BASE_DELAY * 2 ** attempt);
                continue;
            }

            log(response.ok ? 'debug' : 'warn', 'upstream.response', {
                label, method, url: safeUrl, status: response.status, duration, attempt,
            });
            clearTimeout(timer);
            return response;
        }
        catch (error) {
            const duration = Date.now() - startedAt;
            const aborted = controller.signal.aborted;
            lastError = aborted
                ? new TimeoutError(`${label} timed out after ${timeout}ms`, {
                    details: { label, timeout },
                    cause: error,
                })
                // Transport : rien n'a répondu. C'est le seul cas qui mérite
                // « connexion impossible » — un 5xx de beCPG est un `upstream`,
                // pas une panne de réseau.
                : new UpstreamError(`${label} is unreachable: ${sanitizeMessage(error?.message)}`, {
                    code: ERROR_CODES.UNREACHABLE,
                    details: { label },
                    cause: error,
                });

            logWarn('upstream.failure', {
                label, method, url: safeUrl, duration, attempt,
                reason: aborted ? 'timeout' : 'transport',
                message: sanitizeMessage(error?.message),
            });

            if (attempt < maxRetries && !aborted && replayable) {
                await delay(RETRY_BASE_DELAY * 2 ** attempt);
                continue;
            }
            throw lastError;
        }
        finally {
            clearTimeout(timer);
        }
    }

    throw lastError || new UpstreamError(`${label} failed`);
}

/**
 * Extracts a short, safe message from an upstream error body.
 *
 * Alfresco answers errors as `{ status, message, exception, callstack }`; the
 * call stack must never leave the server, so only `message` is kept.
 *
 * @param {Response} response an upstream response, not yet consumed
 * @returns {Promise<string>} a sanitised message (possibly empty)
 */
export async function readErrorMessage(response) {
    try {
        const text = await response.text();
        if (!text) {
            return '';
        }
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('json')) {
            try {
                const parsed = JSON.parse(text);
                return sanitizeMessage(parsed.message || parsed.error?.message || parsed.error || '');
            }
            catch {
                // fall through to the raw text
            }
        }
        // HTML error pages carry no useful message: keep the status only.
        if (contentType.includes('html')) {
            return '';
        }
        return sanitizeMessage(text);
    }
    catch {
        return '';
    }
}

/**
 * Fetch + JSON parse, turning any non-2xx into a typed error.
 *
 * @param {string|URL} url absolute URL
 * @param {Object} [options] same options as {@link httpFetch}
 * @returns {Promise<*>} the parsed body, or `null` on 204 / empty body
 * @throws {PortalError} typed error mapped from the upstream status
 *
 * @example
 * const entity = await fetchJson(url, { label: 'becpg' });
 */
export async function fetchJson(url, options = {}) {
    const response = await httpFetch(url, options);

    if (!response.ok) {
        const message = await readErrorMessage(response);
        throw errorFromStatus(response.status, message, {
            label: options.label || 'upstream',
            url: redactUrl(url),
        });
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();
    if (!text.trim()) {
        return null;
    }

    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new UpstreamError('Upstream returned a non-JSON payload', {
            details: { label: options.label || 'upstream', url: redactUrl(url) },
            cause: error,
        });
    }
}

/**
 * Convenience POST/PUT of a JSON document.
 *
 * @param {string|URL} url absolute URL
 * @param {*} body value to serialise
 * @param {Object} [options] same options as {@link httpFetch}
 * @returns {Promise<*>} the parsed response body
 */
export async function postJson(url, body, options = {}) {
    return fetchJson(url, {
        ...options,
        method: options.method || 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(options.headers || {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/**
 * Builds a URL from a base and a query object, skipping empty values.
 * Arrays are repeated (`fields=a&fields=b`), the shape Alfresco expects.
 *
 * @param {string} base absolute base URL
 * @param {Object} [query] query parameters
 * @returns {URL}
 */
export function buildUrl(base, query) {
    const url = new URL(base);
    if (!query) {
        return url;
    }
    for (const [name, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null && item !== '') {
                    url.searchParams.append(name, String(item));
                }
            }
            continue;
        }
        url.searchParams.set(name, String(value));
    }
    return url;
}
