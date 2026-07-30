/**
 * Typed portal errors and their JSON representation.
 *
 * Every error thrown by the server layer (lib/http.js, lib/becpg.js, route
 * handlers) is a `PortalError`. It carries:
 *
 *   - `status`      the HTTP status the portal must answer with;
 *   - `code`        a stable, machine-readable code the UI can switch on;
 *   - `messageKey`  a key of `config/messages.js`, so the browser renders a
 *                   localised sentence instead of a server-generated one.
 *
 * The `message` carried by the error is for the **server log**. It is echoed in
 * the JSON body only because it helps integrators, and it is always sanitised:
 * no ticket, no token, no Alfresco call stack ever reaches the browser
 * (spec §6.1).
 *
 * @example
 * try {
 *     const data = await getJson('becpg/remote/entity', { query: { nodeRef } });
 *     return NextResponse.json(data);
 * }
 * catch (error) {
 *     return toApiResponse(error);
 * }
 */

import { NextResponse } from 'next/server';

/**
 * Stable error codes. The UI maps them; never rename one without updating the
 * front end, they are part of the API contract.
 */
export const ERROR_CODES = {
    BAD_REQUEST: 'badRequest',
    UNAUTHORIZED: 'unauthorized',
    FORBIDDEN: 'forbidden',
    NOT_FOUND: 'notFound',
    CONFLICT: 'conflict',
    PAYLOAD_TOO_LARGE: 'payloadTooLarge',
    UPSTREAM: 'upstream',
    TIMEOUT: 'timeout',
    TENANT: 'tenant',
    UPLOAD: 'upload',
    GENERIC: 'generic',
};

/**
 * Code → chrome message key (`config/messages.js`). Codes that have no
 * dedicated sentence fall back on a generic one, so the UI can always resolve
 * a key and never has to display a raw server message.
 */
export const ERROR_MESSAGE_KEYS = {
    [ERROR_CODES.BAD_REQUEST]: 'error.generic',
    [ERROR_CODES.UNAUTHORIZED]: 'error.unauthorized',
    [ERROR_CODES.FORBIDDEN]: 'error.forbidden',
    [ERROR_CODES.NOT_FOUND]: 'error.notFound',
    [ERROR_CODES.CONFLICT]: 'error.generic',
    [ERROR_CODES.PAYLOAD_TOO_LARGE]: 'error.upload',
    [ERROR_CODES.UPSTREAM]: 'error.network',
    [ERROR_CODES.TIMEOUT]: 'error.network',
    [ERROR_CODES.TENANT]: 'error.tenant',
    [ERROR_CODES.UPLOAD]: 'error.upload',
    [ERROR_CODES.GENERIC]: 'error.generic',
};

/** Longest upstream message we are willing to echo back. */
const MAX_MESSAGE_LENGTH = 300;

/**
 * Patterns of values that must never appear in a message, a log line or a JSON
 * body, even when an upstream component decided to include them in its error.
 */
const SECRET_PATTERNS = [
    /alf_ticket=[^&\s"']+/gi,
    /ticket=TICKET_[^&\s"']+/gi,
    /TICKET_[A-Za-z0-9]+/g,
    /(authorization|bearer)\s+[A-Za-z0-9._~+/-]+=*/gi,
    /(password|passwd|pw|secret|client_secret|api[_-]?key|access_token|id_token|refresh_token)["'\s:=]+[^&\s"',}]+/gi,
];

/**
 * Removes ticket/token-shaped substrings and truncates.
 *
 * @param {*} value raw message
 * @returns {string} a message safe to log and to return
 */
export function sanitizeMessage(value) {
    if (value === null || value === undefined) {
        return '';
    }
    let text = String(value).replace(/\s+/g, ' ').trim();
    for (const pattern of SECRET_PATTERNS) {
        text = text.replace(pattern, '[redacted]');
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
        text = `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
    }
    return text;
}

/**
 * Base class of every error the portal answers with.
 */
export class PortalError extends Error {
    /**
     * @param {string} message technical message (server log, sanitised)
     * @param {Object} [options]
     * @param {number} [options.status=500] HTTP status to answer with
     * @param {string} [options.code] one of ERROR_CODES
     * @param {string} [options.messageKey] chrome message key for the UI
     * @param {Object} [options.details] extra, non-sensitive context
     * @param {Error} [options.cause] original error, kept server-side only
     */
    constructor(message, { status = 500, code = ERROR_CODES.GENERIC, messageKey, details, cause } = {}) {
        super(sanitizeMessage(message) || code);
        this.name = new.target.name;
        this.status = status;
        this.code = code;
        this.messageKey = messageKey || ERROR_MESSAGE_KEYS[code] || 'error.generic';
        this.details = details;
        if (cause) {
            this.cause = cause;
        }
        Error.captureStackTrace?.(this, new.target);
    }

    /**
     * @returns {{ error: { code: string, message: string, messageKey: string, details?: Object } }}
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                messageKey: this.messageKey,
                ...(this.details ? { details: this.details } : {}),
            },
        };
    }
}

/** 400 — the request itself is malformed (bad nodeRef, missing parameter…). */
export class BadRequestError extends PortalError {
    constructor(message = 'Bad request', options = {}) {
        super(message, { status: 400, code: ERROR_CODES.BAD_REQUEST, ...options });
    }
}

/** 401 — no session, expired session, or a JWT without the required claims. */
export class AuthError extends PortalError {
    constructor(message = 'Authentication required', options = {}) {
        super(message, { status: 401, code: ERROR_CODES.UNAUTHORIZED, ...options });
    }
}

/** 403 — authenticated, but not allowed (proxy allow-list, beCPG permissions). */
export class ForbiddenError extends PortalError {
    constructor(message = 'Forbidden', options = {}) {
        super(message, { status: 403, code: ERROR_CODES.FORBIDDEN, ...options });
    }
}

/** 404 — the node, task or webscript does not exist. */
export class NotFoundError extends PortalError {
    constructor(message = 'Not found', options = {}) {
        super(message, { status: 404, code: ERROR_CODES.NOT_FOUND, ...options });
    }
}

/** 409 — concurrent edit, frozen list, already-completed task. */
export class ConflictError extends PortalError {
    constructor(message = 'Conflict', options = {}) {
        super(message, { status: 409, code: ERROR_CODES.CONFLICT, ...options });
    }
}

/** 502 — beCPG / becpg-ai answered with an error we cannot map, or not at all. */
export class UpstreamError extends PortalError {
    constructor(message = 'Upstream error', options = {}) {
        super(message, { status: 502, code: ERROR_CODES.UPSTREAM, ...options });
    }
}

/** 504 — the upstream call exceeded BECPG_TIMEOUT. */
export class TimeoutError extends PortalError {
    constructor(message = 'Upstream timeout', options = {}) {
        super(message, { status: 504, code: ERROR_CODES.TIMEOUT, ...options });
    }
}

/** 401 — the JWT carries no `becpg_url` / `becpg_instance` claim (spec §5.3). */
export class TenantError extends PortalError {
    constructor(message = 'No tenant resolved for this session', options = {}) {
        super(message, { status: 401, code: ERROR_CODES.TENANT, ...options });
    }
}

/**
 * Maps an upstream HTTP status onto the matching portal error.
 *
 * 401/403 from beCPG are surfaced as-is: beCPG remains the authority on
 * permissions, the portal never overrides its verdict (spec §6.2).
 *
 * @param {number} status upstream HTTP status
 * @param {string} [message] upstream message (already sanitised or not)
 * @param {Object} [details] extra context ({ path, method, upstreamStatus }…)
 * @returns {PortalError}
 */
/**
 * Signatures Alfresco uses to report a PERMISSION denial under an HTTP 401.
 *
 * Deliberately matched on the message rather than the status: the status is ambiguous
 * (Alfresco reuses 401 for both "no ticket" and "not allowed on this node") and only the
 * message tells the two apart. The distinction matters because one is fixed by logging in
 * again and the other never is.
 *
 * @type {RegExp}
 */
const PERMISSION_DENIAL_RE = /no right to see|access denied|accessdeniedexception|permission[s]? (?:denied|to perform)/i;

/**
 * @param {string} [message] the upstream message
 * @returns {boolean} true when an upstream 401 is really a permission denial
 */
export function isPermissionDenial(message) {
    return Boolean(message) && PERMISSION_DENIAL_RE.test(String(message));
}

export function errorFromStatus(status, message, details) {
    const options = { details };
    if (status === 400) {
        return new BadRequestError(message || 'Bad request', options);
    }
    if (status === 401) {
        // Alfresco (and therefore beCPG's remote API) answers **401 for a permission denial**,
        // not 403: "06309912 You have no right to see this node", "Access Denied",
        // "AccessDeniedException". Passing that through as the portal's own 401 tells the
        // browser the session expired; SessionProvider then restarts the login flow, the new
        // session hits the same node, gets 401 again — a reload loop. Observed on
        // /products/<uuid> for a node outside the supplier's perimeter.
        //
        // A permission denial is a 403: the caller IS authenticated, it simply may not see
        // this node. Logging in again cannot change that, so the UI must say so instead of
        // bouncing the user.
        if (isPermissionDenial(message)) {
            return new ForbiddenError(message || 'Upstream refused access to this node', options);
        }
        return new AuthError(message || 'Upstream authentication failed', options);
    }
    if (status === 403) {
        return new ForbiddenError(message || 'Upstream refused the request', options);
    }
    if (status === 404) {
        return new NotFoundError(message || 'Upstream resource not found', options);
    }
    if (status === 409) {
        return new ConflictError(message || 'Upstream conflict', options);
    }
    if (status === 413) {
        return new PortalError(message || 'Payload too large', {
            status: 413,
            code: ERROR_CODES.PAYLOAD_TOO_LARGE,
            details,
        });
    }
    if (status === 504 || status === 408) {
        return new TimeoutError(message || 'Upstream timeout', options);
    }
    return new UpstreamError(message || `Upstream returned ${status}`, {
        details: { ...(details || {}), upstreamStatus: status },
    });
}

/**
 * Normalises anything thrown in the server layer into a PortalError.
 *
 * @param {*} error the caught value
 * @param {string} [fallbackMessage]
 * @returns {PortalError}
 */
export function normalizeError(error, fallbackMessage = 'Unexpected server error') {
    if (error instanceof PortalError) {
        return error;
    }
    if (error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        return new TimeoutError('Upstream call aborted or timed out', { cause: error });
    }
    if (error instanceof Error) {
        return new UpstreamError(error.message || fallbackMessage, { cause: error });
    }
    return new PortalError(fallbackMessage);
}

/**
 * Builds the HTTP response for an error.
 *
 * Body shape (stable, part of the API contract):
 *
 * ```json
 * { "error": { "code": "forbidden", "message": "…", "messageKey": "error.forbidden" } }
 * ```
 *
 * @param {*} error anything thrown upstream
 * @param {Object} [context] extra fields for the server log ({ path, method })
 * @returns {import('next/server').NextResponse}
 */
export function toApiResponse(error, context = {}) {
    const portalError = normalizeError(error);

    // 5xx are our fault (or the upstream's): log with the cause, never return it.
    const logPayload = {
        event: 'api.error',
        code: portalError.code,
        status: portalError.status,
        message: portalError.message,
        ...context,
    };
    if (portalError.status >= 500) {
        console.error(JSON.stringify(logPayload), portalError.cause || '');
    }
    else {
        console.warn(JSON.stringify(logPayload));
    }

    const response = NextResponse.json(portalError.toJSON(), { status: portalError.status });
    response.headers.set('Cache-Control', 'no-store');
    if (portalError.status === 401) {
        // Tells the client shell to restart the OIDC flow rather than to retry.
        response.headers.set('X-Portal-Reauth', '1');
    }
    return response;
}
