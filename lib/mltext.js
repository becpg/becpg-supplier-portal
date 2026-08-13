/**
 * **Une carte de locales qui a été enregistrée comme du texte.**
 *
 * Une propriété `d:mltext` se lit normalement soit comme une chaîne — le texte
 * dans la langue de l'appelant — soit comme une carte `{ fr: '…', en: '…' }`.
 * Il existe un troisième cas, qui n'aurait jamais dû exister : **une chaîne
 * contenant le JSON de la carte**, `{"fr":"Sucre cristal"}`, écrite telle quelle
 * dans la propriété.
 *
 * Elle vient d'un défaut du portail lui-même, corrigé depuis : la préparation des
 * valeurs de formulaire sérialisait les cartes de locales avant de les envoyer,
 * si bien que le référentiel recevait du texte là où il attendait un
 * multilingue. Ce qui a été écrit pendant cette période reste écrit — mesuré sur
 * dev le 2026-08-13 : **2 fiches sur 83** portant une dénomination légale, deux
 * copies du même produit de test.
 *
 * ## Ce que ce module fait, et ce qu'il ne fait pas
 *
 * Il **relit** : rendre `{"fr":"Sucre cristal"}` à un fournisseur dans un champ
 * de saisie n'est pas acceptable, et le laisser tel quel garantissait en plus
 * qu'un simple enregistrement l'encode une fois de plus. Reconnue, la valeur
 * redevient une vraie carte de locales : le contrôle multilingue s'en saisit, et
 * le prochain enregistrement la remet droite.
 *
 * Il ne **répare rien de lui-même** : aucune écriture n'est déclenchée à la
 * lecture, et aucun patch de migration n'accompagne ce fichier — c'est une
 * demande explicite, l'anomalie doit rester visible plutôt que d'être effacée
 * dans le dos de l'exploitant.
 *
 * ## Pourquoi la reconnaissance est aussi étroite
 *
 * Confondre un texte légitime avec une carte encodée remplacerait une valeur
 * juste par une autre : la garde exige donc un objet plat dont **toutes** les
 * clés sont des codes de langue plausibles et **toutes** les valeurs des
 * chaînes. Une dénomination qui commencerait par une accolade sans satisfaire
 * cela est rendue inchangée.
 */

/** `fr`, `en`, `fr_FR`, `pt_BR`… — la forme des locales d'Alfresco. */
const LOCALE_KEY = /^[a-z]{2}(_[A-Z]{2})?$/;

/**
 * La valeur est-elle une carte de locales déjà décodée ?
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isLocaleMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const keys = Object.keys(value);
    return keys.length > 0
        && keys.every((key) => LOCALE_KEY.test(key))
        && keys.every((key) => typeof value[key] === 'string');
}

/**
 * Rend une carte de locales quand la valeur en est une, fût-elle encodée en JSON.
 *
 * @param {*} value la valeur brute lue du référentiel
 * @returns {Object|null} la carte, ou `null` si ce n'en est pas une
 */
export function asLocaleMap(value) {
    if (isLocaleMap(value)) {
        return value;
    }
    if (typeof value !== 'string') {
        return null;
    }
    const text = value.trim();
    // Écarté avant de payer un `JSON.parse` : l'immense majorité des valeurs
    // sont du texte ordinaire.
    if (!text.startsWith('{') || !text.endsWith('}')) {
        return null;
    }
    try {
        const parsed = JSON.parse(text);
        return isLocaleMap(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}

/**
 * La valeur telle qu'on doit la **manipuler** : une carte de locales quand c'en
 * est une, la valeur d'origine sinon.
 *
 * À utiliser sur le chemin de lecture, pour que la suite du portail ne voie
 * jamais la forme encodée — ni à l'affichage, ni dans un champ de saisie.
 *
 * @param {*} value
 * @returns {*}
 */
export function recoverMlText(value) {
    return asLocaleMap(value) || value;
}

/**
 * La valeur telle qu'on doit l'**afficher** : une seule chaîne.
 *
 * La langue demandée d'abord, puis n'importe quelle autre non vide — un libellé
 * renseigné dans une seule langue doit se lire, même si ce n'est pas celle de
 * l'utilisateur. Mieux vaut le texte espagnol que rien du tout.
 *
 * @param {*} value
 * @param {string} [lang='fr'] la langue de l'utilisateur
 * @returns {*} une chaîne pour un multilingue, la valeur d'origine sinon
 */
export function readMlText(value, lang = 'fr') {
    const map = asLocaleMap(value);
    if (!map) {
        return value;
    }
    const exact = map[lang];
    if (exact) {
        return exact;
    }
    // `fr` doit répondre à une carte qui ne connaît que `fr_FR`, et l'inverse.
    const base = String(lang).slice(0, 2);
    const near = Object.keys(map).find((key) => key.slice(0, 2) === base && map[key]);
    if (near) {
        return map[near];
    }
    const any = Object.keys(map).find((key) => map[key]);
    return any ? map[any] : '';
}
