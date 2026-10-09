/**
 * The labels the repository gives the properties and associations of a class,
 * in the reader's language (`Accept-Language` set by `becpgFetch`). What turns
 * `bcpg:storageConditionsRef` into « Conditions de stockage » on a screen.
 *
 * Server only.
 */

import { getJson } from '@/lib/becpg';
import { logWarn } from '@/lib/http';

/**
 * @param {Object} session
 * @param {string} type a prefixed class name, e.g. `bcpg:nutList`; a named list key
 *        (`survey:surveyList|surveyList@1`) is read as its class
 * @returns {Promise<Object.<string, string|null>>} qname → label, plus `title` for the class;
 *          empty when the dictionary cannot be read
 */
export async function classLabels(session, type) {
    try {
        const payload = await getJson(`api/classes/${String(type).split('|')[0].replace(':', '_')}`, { session, skipAllowList: true });
        const pick = (map) => Object.fromEntries(Object.entries(map || {}).map(([name, entry]) => [name, entry?.title || null]));
        return { title: payload?.title || null, ...pick(payload?.properties), ...pick(payload?.associations) };
    }
    catch (error) {
        logWarn('dictionary.labelsUnavailable', { type, status: error?.status });
        return {};
    }
}
