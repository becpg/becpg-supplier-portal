/**
 * **Ce que le fournisseur a déjà lu — et pourquoi cela ne peut vivre qu'ici.**
 *
 * Une discussion du portail est le forum Alfresco attaché à un nœud
 * (`fm:forum` → `fm:topic` → `fm:post`), le fil que Share écrit aussi. Ce
 * modèle **ne porte aucun état de lecture** : ni par utilisateur, ni par
 * message. `lib/adapters/notifications.js` le constate déjà et en tire la
 * conséquence — « non lu » ne peut pas être calculé côté serveur, et une règle
 * fondée sur la date seule re-signalerait le même message indéfiniment.
 *
 * Le pastille « 3 » à côté de « Mes discussions » comptait donc les fils qui
 * ont au moins un commentaire, pas ceux qui appellent une réponse. Rien, dans
 * la liste, ne disait ensuite lesquels étaient nouveaux : le compteur promettait
 * une information que l'écran ne tenait pas.
 *
 * Ce module tient cet état là où il est légitime : **dans le navigateur de
 * l'utilisateur**, une entrée par fil, la date du dernier message qu'il a ouvert.
 * Un fil est nouveau tant que son dernier message est postérieur à cette date.
 * C'est exact au sens où l'utilisateur l'entend — « je ne l'ai pas encore
 * ouvert » — et stable : le marqueur ne disparaît pas tout seul au bout de
 * quelques jours, il disparaît quand on a lu.
 *
 * **Limite assumée, à dire plutôt qu'à masquer** : l'état est par navigateur. Le
 * même fournisseur sur un autre poste retrouve ses fils marqués comme nouveaux.
 * Un état partagé supposerait de l'écrire dans le référentiel, donc un modèle
 * beCPG que le portail n'a pas à inventer.
 *
 * Client uniquement — `localStorage` n'existe pas au rendu serveur, et toutes
 * les fonctions ci-dessous répondent une valeur neutre plutôt que d'échouer.
 */

/** Clé de stockage : `{ [nodeRef]: date ISO du dernier message lu }`. */
const STORAGE_KEY = 'becpg.portal.discussions.read';

/**
 * L'état vide, en un seul exemplaire.
 *
 * `useSyncExternalStore` compare les instantanés par identité : rendre un objet
 * neuf à chaque lecture ferait boucler React indéfiniment. Cette constante est
 * l'instantané du serveur et celui d'un stockage vide.
 */
const EMPTY = Object.freeze({});

/**
 * Au-delà, les entrées les plus anciennes sont oubliées. Un fournisseur actif
 * ouvre quelques dizaines de fils ; la borne existe pour que le stockage ne
 * grossisse pas sans fin, pas pour rationner.
 */
const MAX_ENTRIES = 500;

/* --- Le store, tel que `useSyncExternalStore` l'attend --------------------- */

/** Dernier texte brut lu dans le stockage, et l'objet qui en a été tiré. */
let cachedRaw = null;
let cachedState = EMPTY;

/** Les composants montés, à prévenir quand une lecture est enregistrée. */
const listeners = new Set();

/**
 * L'état de lecture complet, **stable par identité** tant que le stockage n'a
 * pas changé.
 *
 * C'est la condition posée par `useSyncExternalStore` : deux appels successifs
 * sans écriture doivent rendre exactement le même objet, sinon React considère
 * que le store a changé et redessine sans fin. D'où la comparaison sur le texte
 * brut plutôt que sur le résultat de `JSON.parse`.
 *
 * @returns {Object<string, string>} nodeRef → date ISO ; vide hors navigateur
 *   ou si le contenu stocké est illisible
 */
export function readState() {
    if (typeof window === 'undefined') {
        return EMPTY;
    }
    let raw = null;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    }
    catch {
        // Stockage refusé (navigation privée) : pas de marqueur vaut mieux
        // qu'un écran cassé.
        return EMPTY;
    }
    if (raw === cachedRaw) {
        return cachedState;
    }
    cachedRaw = raw;
    cachedState = EMPTY;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                cachedState = parsed;
            }
        }
        catch {
            // JSON corrompu : on repart d'un état vide plutôt que de propager.
        }
    }
    return cachedState;
}

/**
 * L'instantané du rendu serveur : toujours vide, parce que le serveur ne sait
 * rien de ce que cet utilisateur a lu. C'est ce qui garantit l'absence d'écart
 * d'hydratation — les marqueurs apparaissent au premier rendu client.
 *
 * @returns {Object<string, string>}
 */
export function serverState() {
    return EMPTY;
}

/**
 * S'abonne aux changements d'état de lecture.
 *
 * L'événement `storage` du navigateur ne se déclenche que dans les **autres**
 * onglets ; les écritures de cet onglet-ci passent par {@link listeners}. Les
 * deux sont nécessaires pour qu'un fil ouvert dans un onglet cesse d'être
 * signalé dans l'autre.
 *
 * @param {() => void} listener
 * @returns {() => void} le désabonnement
 */
export function subscribe(listener) {
    listeners.add(listener);
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', listener);
    }
    return () => {
        listeners.delete(listener);
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', listener);
        }
    };
}

/**
 * Ce fil porte-t-il un message que l'utilisateur n'a pas encore ouvert ?
 *
 * Un fil jamais ouvert est nouveau. Un fil sans date de dernier message ne l'est
 * pas : sans date, rien ne permet d'affirmer qu'il a bougé, et signaler dans le
 * doute reviendrait à marquer en permanence les fils dont l'aperçu n'a pas pu
 * être lu.
 *
 * @param {{nodeRef: string, last: {date: string|null}|null}} thread
 * @param {Object<string, string>} state état issu de {@link readState}
 * @returns {boolean}
 */
export function isUnread(thread, state) {
    const lastDate = thread && thread.last ? thread.last.date : null;
    if (!lastDate) {
        return false;
    }
    const lastMs = Date.parse(lastDate);
    if (Number.isNaN(lastMs)) {
        return false;
    }
    const seen = state ? state[thread.nodeRef] : null;
    if (!seen) {
        return true;
    }
    const seenMs = Date.parse(seen);
    return Number.isNaN(seenMs) || lastMs > seenMs;
}

/**
 * Marque un fil comme lu jusqu'à la date de son dernier message.
 *
 * On enregistre **la date du message**, pas l'instant du clic : un message
 * publié pendant la lecture doit rester nouveau, et c'est ce que garantit le
 * fait de ne jamais dater la lecture plus tard que ce qui a été lu.
 *
 * @param {string} nodeRef le nœud portant le forum
 * @param {string|null} lastDate date ISO du dernier message affiché
 * @returns {void}
 */
export function markRead(nodeRef, lastDate) {
    if (typeof window === 'undefined' || !nodeRef) {
        return;
    }
    const state = readState();

    const stamp = lastDate || new Date().toISOString();
    const next = { ...state, [nodeRef]: stamp };

    // Purge des plus anciennes lectures, pas des plus anciennes discussions :
    // c'est la date enregistrée qui ordonne, et elle dit bien quel fil n'a plus
    // été touché depuis longtemps.
    const keys = Object.keys(next);
    if (keys.length > MAX_ENTRIES) {
        keys.sort((a, b) => Date.parse(next[a] || 0) - Date.parse(next[b] || 0));
        for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
            delete next[key];
        }
    }

    const raw = JSON.stringify(next);
    try {
        window.localStorage.setItem(STORAGE_KEY, raw);
    }
    catch {
        // Quota atteint ou stockage refusé : le marqueur disparaît quand même
        // pour la page courante, grâce au cache mis à jour juste en dessous.
    }

    // Le cache est posé à la main plutôt que relu : c'est lui qui donne son
    // instantané à React, et il doit refléter l'écriture même quand celle-ci a
    // été refusée par le navigateur.
    cachedRaw = raw;
    cachedState = next;
    for (const listener of listeners) {
        listener();
    }
}
