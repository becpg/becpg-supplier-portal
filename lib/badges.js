/**
 * **Les compteurs du menu, qui doivent survivre au changement d'écran.**
 *
 * Chaque pastille du menu de gauche vient de la page rendue : le tableau de bord
 * connaît les tâches, les documents et les discussions ; `/tasks` ne connaît que
 * les tâches ; `/products` n'en connaît aucune. Comme `AppShell` ne recevait que
 * ce que la page courante lui passait, quitter le tableau de bord effaçait les
 * pastilles que la page d'arrivée ne savait pas recalculer — le fournisseur
 * voyait ses 51 tâches et ses 3 discussions disparaître en changeant de vue.
 *
 * Les faire recalculer par chaque page serait la mauvaise réponse : un compteur
 * de discussions coûte un balayage des entités plus une lecture de fil par
 * discussion, et le portail n'a pas à payer cela pour afficher un « 3 » sur un
 * écran qui parle d'autre chose.
 *
 * Ce module garde donc **le dernier compteur connu de chaque clé**, alimenté par
 * les pages qui savent les calculer et lu par le menu partout ailleurs. Une page
 * qui publie une valeur plus fraîche l'écrase ; une page qui ne sait rien d'une
 * clé la laisse intacte.
 *
 * **Portée : l'onglet, et l'utilisateur.** `sessionStorage` — et non
 * `localStorage` — parce qu'un compteur est une photographie, pas une préférence :
 * il n'a aucune raison de survivre à la fermeture de l'onglet, et il vaut mieux
 * un menu sans pastille qu'un menu qui affiche les chiffres d'hier. Le nom de
 * l'utilisateur est stocké avec : une reconnexion sous un autre compte dans le
 * même onglet repart de zéro plutôt que de montrer les compteurs du précédent.
 *
 * Client uniquement.
 */

/** Clé de stockage : `{ user, badges }`. */
const STORAGE_KEY = 'becpg.portal.badges';

/**
 * L'état vide, en un seul exemplaire — `useSyncExternalStore` compare les
 * instantanés par identité, et un objet neuf à chaque lecture ferait boucler React.
 */
const EMPTY = Object.freeze({});

/** L'instantané courant, tel que les composants montés l'ont vu. */
let snapshot = EMPTY;

/** L'utilisateur auquel `snapshot` appartient, pour ne pas mélanger deux sessions. */
let snapshotUser = null;

/** Vrai une fois `sessionStorage` relu, pour ne le faire qu'au premier rendu client. */
let hydrated = false;

/** Les composants montés, à prévenir quand un compteur change. */
const listeners = new Set();

/**
 * Les compteurs connus.
 *
 * Le stockage n'est relu qu'une fois : ensuite `snapshot` fait foi, ce qui
 * garantit la stabilité par identité qu'attend `useSyncExternalStore`.
 *
 * @returns {Object<string, number>} clé de pastille → compte
 */
export function readBadges() {
    if (typeof window === 'undefined') {
        return EMPTY;
    }
    if (!hydrated) {
        hydrated = true;
        try {
            const raw = window.sessionStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed.badges === 'object' && parsed.badges) {
                snapshot = parsed.badges;
                snapshotUser = parsed.user || null;
            }
        }
        catch {
            // Stockage refusé ou JSON corrompu : un menu sans pastille reste un
            // menu utilisable.
        }
    }
    return snapshot;
}

/**
 * L'instantané du rendu serveur : toujours vide. Le serveur ne sait pas ce que
 * cet onglet a déjà affiché, et prétendre le contraire provoquerait un écart
 * d'hydratation.
 *
 * @returns {Object<string, number>}
 */
export function serverBadges() {
    return EMPTY;
}

/**
 * S'abonne aux changements de compteurs.
 *
 * @param {() => void} listener
 * @returns {() => void} le désabonnement
 */
export function subscribeBadges(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Publie ce qu'une page sait compter.
 *
 * **Ne notifie que si quelque chose a réellement changé**, et c'est ce qui rend
 * l'appel sûr depuis un effet : les pages passent des littéraux
 * (`badges={{ tasks: 51 }}`), dont l'identité change à chaque rendu. Sans cette
 * garde, publier déclencherait un rendu qui republierait, indéfiniment.
 *
 * Les valeurs absentes ou non numériques sont ignorées plutôt qu'écrites à zéro :
 * une page muette sur une clé n'affirme pas qu'elle vaut zéro.
 *
 * @param {Object<string, number>} badges les compteurs connus de la page
 * @param {string|null} [user] l'utilisateur courant, pour détecter un changement de compte
 * @returns {void}
 */
export function publishBadges(badges, user = null) {
    if (typeof window === 'undefined') {
        return;
    }
    readBadges();

    // Changement de compte dans le même onglet : rien de ce qui précède ne vaut
    // plus, et le mélange serait pire que l'absence.
    let base = snapshot;
    if (user && snapshotUser && user !== snapshotUser) {
        base = EMPTY;
    }

    let next = base;
    for (const [key, value] of Object.entries(badges || {})) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            continue;
        }
        if (base[key] !== value) {
            if (next === base) {
                next = { ...base };
            }
            next[key] = value;
        }
    }

    const sameUser = !user || user === snapshotUser;
    if (next === base && base === snapshot && sameUser) {
        return;
    }

    snapshot = next;
    snapshotUser = user || snapshotUser;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: snapshotUser, badges: snapshot }));
    }
    catch {
        // Quota ou stockage refusé : les compteurs restent valables pour la
        // navigation en cours, ce qui est déjà l'essentiel du besoin.
    }
    for (const listener of listeners) {
        listener();
    }
}
