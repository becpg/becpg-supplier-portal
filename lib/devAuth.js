/**
 * The `DEV_FAKE_AUTH` shortcut's accounts — **server side, development only**.
 *
 * This module holds the parsing of `BECPG_DEV_ACCOUNTS` and the flag that gates it,
 * because two callers need them and a second copy of a password parser is not something
 * to have: `app/api/auth/login/route.js` opens the session, and `lib/shareSession.js`
 * opens the matching Share session with Share's own form login.
 *
 * Nothing here is reachable in production: {@link isDevAuthEnabled} is false as soon as
 * `NODE_ENV` is `production`, whatever the flag says, and every caller asks it first.
 * No value read here is ever returned to the browser or written to a log.
 *
 * Server only.
 */

/** Values of `DEV_FAKE_AUTH` that count as on. */
const TRUTHY = ['1', 'true', 'yes', 'on'];

/**
 * Is the development authentication shortcut available?
 *
 * @returns {boolean}
 */
export function isDevAuthEnabled() {
    const flag = String(process.env.DEV_FAKE_AUTH || '').toLowerCase();
    return TRUTHY.includes(flag) && process.env.NODE_ENV !== 'production';
}

/**
 * The configured development accounts, by label.
 *
 * Format: `label=user:password,label=user:password`. The single-account variables
 * (`BECPG_DEV_USER` / `BECPG_DEV_PASSWORD`) stay authoritative for the `default` label, so
 * an existing setup keeps working untouched.
 *
 * @returns {Record<string, {userId: string, password: string}>}
 */
export function devAccounts() {
    const accounts = {};
    const raw = String(process.env.BECPG_DEV_ACCOUNTS || '').trim();

    for (const entry of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
        const equals = entry.indexOf('=');
        const colon = entry.indexOf(':', equals + 1);
        if (equals === -1 || colon === -1) {
            continue;
        }
        const label = entry.slice(0, equals).trim();
        const userId = entry.slice(equals + 1, colon).trim();
        const password = entry.slice(colon + 1);
        if (label && userId && password) {
            accounts[label] = { userId, password };
        }
    }

    if (process.env.BECPG_DEV_USER && process.env.BECPG_DEV_PASSWORD) {
        accounts.default = {
            userId: process.env.BECPG_DEV_USER,
            password: process.env.BECPG_DEV_PASSWORD,
        };
    }

    return accounts;
}

/**
 * The credentials of the development account a session was opened with.
 *
 * Matched on the user id rather than on the label, because the session records who it is,
 * not which entry of the map produced it. Case-insensitive: Alfresco answers
 * `admin.test.user` for a login typed `Admin.Test.User`.
 *
 * @param {string} username the session's user id
 * @returns {{userId: string, password: string}|null}
 */
export function devCredentialsFor(username) {
    if (!isDevAuthEnabled() || !username) {
        return null;
    }
    const wanted = String(username).toLowerCase();
    for (const account of Object.values(devAccounts())) {
        if (account.userId.toLowerCase() === wanted) {
            return account;
        }
    }
    return null;
}
