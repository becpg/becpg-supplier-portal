/**
 * **Le périmètre fournisseur, rendu lisible par le serveur.**
 *
 * Un compte peut agir pour plusieurs fiches fournisseur — quinze pour le compte
 * de test — et la barre du haut sert à choisir laquelle. Ce choix vivait dans le
 * `localStorage` du navigateur, donc **hors de portée des composants serveur**.
 *
 * Le tableau de bord en est un. Il composait donc ses compteurs sur les quinze
 * fiches pendant que la barre en annonçait une : 51 tâches et 193 produits pour
 * un périmètre qui en comptait deux, et un statut d'agrément qui décrivait une
 * autre société que celle affichée. Ce n'était pas un décalage d'affichage,
 * c'était une réponse à une question que l'utilisateur n'avait pas posée.
 *
 * Le choix est donc **aussi** écrit dans un cookie. Le `localStorage` reste la
 * référence côté client : le cookie n'existe que pour que le rendu serveur
 * puisse borner ses requêtes, et il est traité en indication, jamais en
 * autorisation.
 *
 * ## Ce que ce cookie n'est pas
 *
 * Il ne donne aucun droit. Le périmètre restreint ce que l'on regarde parmi ce
 * que l'on peut déjà voir ; beCPG reste seul juge de l'accès (spec §6.2), et une
 * fiche demandée hors de ses droits répond 403 quel que soit ce cookie. Il porte
 * en plus le `sub` de la session qui l'a écrit, si bien qu'un cookie laissé par
 * un autre compte sur le même navigateur est ignoré plutôt qu'appliqué.
 *
 * `SameSite=Lax` et pas de `httpOnly` : c'est le client qui l'écrit, et il ne
 * contient qu'un identifiant de nœud déjà connu du navigateur.
 */

/** Nom du cookie portant le périmètre choisi. */
export const SCOPE_COOKIE = 'becpg_portal_scope';

/** Un an : c'est un réglage, pas une session de travail. */
const MAX_AGE_SECONDS = 31_536_000;

/**
 * Écrit le périmètre dans le cookie, côté navigateur.
 *
 * @param {string|null} sub identifiant de l'utilisateur courant
 * @param {{ref: string|null, all: boolean}} scope
 * @returns {void}
 */
export function writeScopeCookie(sub, scope) {
    if (typeof document === 'undefined' || !sub) {
        return;
    }
    const value = encodeURIComponent(JSON.stringify({
        sub,
        ref: (scope && scope.ref) || null,
        all: Boolean(scope && scope.all),
    }));
    document.cookie = `${SCOPE_COOKIE}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * Relit le périmètre depuis la valeur brute d'un cookie.
 *
 * Exportée séparément de la lecture serveur pour être testable sans `next/headers`.
 *
 * @param {string|null|undefined} raw valeur du cookie, déjà décodée par l'appelant
 * @param {string|null} sessionSub le `sub` de la session **en cours**
 * @returns {{ref: string|null, all: boolean}} périmètre vide si le cookie est
 *   absent, illisible, ou écrit par un autre compte
 */
export function parseScopeCookie(raw, sessionSub) {
    const empty = { ref: null, all: false };
    if (!raw) {
        return empty;
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return empty;
        }
        // Un choix appartient à celui qui l'a fait : le cookie d'un autre compte
        // sur ce navigateur ne doit pas borner cette session-ci.
        if (!parsed.sub || !sessionSub || parsed.sub !== sessionSub) {
            return empty;
        }
        return { ref: parsed.ref || null, all: Boolean(parsed.all) };
    }
    catch {
        return empty;
    }
}
