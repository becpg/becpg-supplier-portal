/**
 * **Dans quelles langues le fournisseur doit-il saisir ?** (#33085, spec §4.4.1)
 *
 * Un champ `d:mltext` est une carte locale → texte. Le portail rendait ces
 * cartes avec **deux** cases, `fr` et `en`, parce que `localesFor()` retombait
 * sur `SUPPORTED_LANGS` — la liste des langues de *l'interface* du portail. Ce
 * sont deux choses différentes : la langue dans laquelle on lit le portail n'a
 * rien à voir avec les langues dans lesquelles le client attend le libellé
 * légal d'un produit. Un fournisseur qui livre l'Italie ne pouvait tout
 * simplement pas saisir l'italien.
 *
 * L'ordre de résolution, du plus précis au plus général :
 *
 * | Rang | Source | Ce que ça veut dire |
 * |---|---|---|
 * | 1 | `locales` / `languages` du contrôle | le formulaire Share le déclare champ par champ — toujours prioritaire |
 * | 2 | le **catalogue lié à l'assistant courant** | le client déclare ce qu'il attend de cette fiche |
 * | 3 | `$supportedLocales` du dépôt | tout ce qu'Alfresco sait stocker |
 *
 * Le rang 2 est celui de la spécification : une langue exigée est une exigence
 * de complétude comme une autre, elle appartient au catalogue et pas à une
 * configuration parallèle du portail (§4.4.1). **beCPG ne la porte pas encore**
 * — mesuré le 11/08 sur dev, `becpg/entity/catalog/node/…` ne renvoie que
 * `{id, label, score, color, protectedFields}`. Le rang est donc câblé et
 * inerte : le jour où le dépôt ajoute le champ, il prend effet sans rien
 * toucher ici. En attendant, c'est le rang 3 qui répond, et c'est la bonne
 * réponse par défaut — le dépôt, pas nous, dit ce qu'il sait stocker.
 *
 * **Aucune liste n'est inventée ici.** Le portail n'écrit nulle part une liste
 * de langues en dur : il n'y a pas de valeur par défaut dans ce module, et
 * quand le dépôt ne répond pas, la réponse est `null` — l'appelant retombe
 * alors sur le comportement d'avant plutôt que sur une liste de notre cru.
 *
 * Serveur uniquement.
 */

import { logWarn } from '@/lib/http';

/**
 * Découpe une liste de locales séparées par des virgules.
 *
 * Accepte les deux écritures qui circulent — `fr_FR` (Java) et `fr-FR` (BCP 47)
 * — et les rend telles quelles : c'est `MlTextControl` qui les affiche, et il
 * sait déjà normaliser pour comparer.
 *
 * @param {*} value
 * @returns {string[]}
 */
export function parseLocales(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value !== 'string') {
        return [];
    }
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Les locales déclarées par un catalogue, s'il en déclare.
 *
 * Plusieurs noms de champ sont acceptés parce qu'aucun n'est encore arrêté côté
 * beCPG : le contrat sera fixé par le dépôt, et deviner un seul nom ferait
 * échouer silencieusement l'intégration le jour où il choisit l'autre.
 *
 * @param {Object[]} catalogs la charge utile `catalogs[]` de `entity/catalog/node`
 * @returns {string[]} vide quand aucun catalogue ne dit rien
 */
export function catalogLocales(catalogs) {
    const found = [];
    for (const catalog of Array.isArray(catalogs) ? catalogs : []) {
        if (!catalog || typeof catalog !== 'object') {
            continue;
        }
        for (const key of ['locales', 'requiredLocales', 'languages']) {
            for (const locale of parseLocales(catalog[key])) {
                if (!found.includes(locale)) {
                    found.push(locale);
                }
            }
        }
    }
    return found;
}

/**
 * Les locales que le dépôt sait stocker.
 *
 * `becpg/remote/dictionary` les annonce dans `$supportedLocales`, en tête de son
 * schéma — mesuré sur dev.becpg.fr le 11/08 : 27 locales, de `fr` à `vi_VN`.
 * C'est `MLTextHelper.getSupportedLocales()`, donc la propriété
 * `beCPG.multilinguale.supportedLocales` de l'instance : la même liste que Share
 * propose, et celle que l'administrateur règle déjà.
 *
 * Le préfixe `becpg/remote/` est déjà autorisé par le proxy — rien à ouvrir.
 *
 * @param {Object} client un client beCPG authentifié
 * @param {string} [entityType] le type interrogé ; le dictionnaire répond la
 *        même liste quel que soit le type, mais il en exige un
 * @returns {Promise<string[]|null>} `null` quand le dépôt n'a pas répondu
 */
export async function repositoryLocales(client, entityType = 'bcpg:rawMaterial') {
    const key = `supportedLocales:${entityType}`;
    if (client.cache && client.cache.has(key)) {
        return client.cache.get(key);
    }

    const promise = (async () => {
        try {
            const payload = await client.getJson('becpg/remote/dictionary', {
                query: { type: entityType },
            });
            const locales = parseLocales(payload && payload.$supportedLocales);
            return locales.length > 0 ? locales : null;
        }
        catch (error) {
            // Une liste de langues est un confort, pas un prérequis : l'assistant
            // doit s'ouvrir même si le dictionnaire ne répond pas.
            logWarn('contentLocales.dictionary', { error: error.message, entityType });
            return null;
        }
    })();

    if (client.cache) {
        client.cache.set(key, promise);
    }
    return promise;
}

/**
 * La politique de langues de saisie d'une fiche.
 *
 * @param {Object} client un client beCPG authentifié
 * @param {Object} [options]
 * @param {Object[]} [options.catalogs] les catalogues qui s'appliquent à la fiche
 * @param {string} [options.entityType] le type de la fiche
 * @returns {Promise<{locales: string[], source: 'catalog'|'repository'}|null>}
 *          `null` quand rien ne peut être affirmé — l'appelant ne doit alors
 *          **rien** changer à ce qu'il faisait
 *
 * @example
 * await resolveContentLocales(client, { entityType: 'bcpg:rawMaterial' });
 * // { locales: ['fr','de','en','en_AU', …], source: 'repository' }
 */
export async function resolveContentLocales(client, options = {}) {
    const fromCatalog = catalogLocales(options.catalogs);
    if (fromCatalog.length > 0) {
        return { locales: fromCatalog, source: 'catalog' };
    }

    const supported = await repositoryLocales(client, options.entityType);
    return supported ? { locales: supported, source: 'repository' } : null;
}
