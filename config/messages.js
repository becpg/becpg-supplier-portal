/**
 * Portal chrome strings — and nothing else.
 *
 * This is NOT an i18n system. Business labels (fields, datalists, catalogs,
 * questionnaires, step instructions, document types...) are already translated
 * inside beCPG and served in the user's locale by the forms and the dictionary.
 * The portal only owns the few keys of its own shell: navigation, buttons,
 * generic errors, status labels.
 *
 * Rule of thumb: if a client could want to rename it, it belongs in beCPG, not here.
 * Keep this file under ~60 keys.
 *
 * Usage:
 *   import { t } from '@/config/messages';
 *   t('fr', 'nav.tasks');
 *   t('fr', 'error.http', { status: 404 });
 */

export const SUPPORTED_LANGS = ['fr', 'en'];

export const DEFAULT_LANG = 'fr';

/** Cookie carrying the portal chrome language (readable by the client, no secret). */
export const LANG_COOKIE = 'becpg_portal_lang';

/** Event dispatched on the window when the language changes client-side. */
export const LANG_CHANGE_EVENT = 'portallangchange';

export const messages = {
    fr: {
        // --- Application ---
        'app.title': 'Portail Fournisseur',
        'app.shortTitle': 'Portail',
        'app.tenantSuffix': 'espace fournisseur',
        'app.description': 'Portail fournisseur beCPG — référencement, documents et conformité',

        // --- Navigation (supplier space) ---
        'nav.dashboard': 'Tableau de bord',
        'nav.tasks': 'Mes tâches',
        'nav.products': 'Mes produits',
        'nav.documents': 'Mes documents',
        'nav.company': 'Ma fiche',
        'nav.specs': 'Cahiers des charges',
        'nav.messages': 'Discussions',
        'nav.notifications': 'Notifications',
        'nav.help': 'Aide',

        // --- Navigation (monitoring space) ---
        'nav.monitor': 'Pilotage',
        'nav.monitor.suppliers': 'Fournisseurs',
        'nav.monitor.documents': 'Conformité documentaire',
        'nav.monitor.campaigns': 'Campagnes',
        'nav.monitor.quality': 'Non-conformités',
        'nav.monitor.reports': 'Rapports',
        // The same tasks as on the supplier side, under the name an internal user
        // gives them: he is not validating his own file there, he is moving a
        // supplier's file forward.
        'nav.monitor.tasks': 'Mes tâches',

        // --- Account ---
        'account.profile': 'Mon profil',
        'account.language': 'Langue',
        'account.login': 'Se connecter',
        'account.logout': 'Se déconnecter',
        'account.tenant': 'Client',
        'account.suppliers': 'Mes fiches fournisseur',
        'account.allSuppliers': 'Tous les fournisseurs',

        // --- Actions ---
        'action.save': 'Enregistrer',
        'action.cancel': 'Annuler',
        'action.close': 'Fermer',
        'action.back': 'Retour',
        'action.next': 'Suivant',
        'action.previous': 'Précédent',
        'action.submit': 'Envoyer',
        'action.confirm': 'Confirmer',
        'action.delete': 'Supprimer',
        'action.download': 'Télécharger',
        'action.upload': 'Déposer un fichier',
        'action.retry': 'Réessayer',
        'action.search': 'Rechercher',
        'action.filter': 'Filtrer',
        'action.reset': 'Réinitialiser',
        'action.export': 'Exporter',
        'action.sign': 'Signer',
        'action.showMore': '+{count} de plus',
        'action.showLess': 'Voir moins',

        // --- AI suggestions ---
        // What an extracted value would overwrite, said in words: a strikethrough
        // beside the new value is invisible in greyscale and to a screen reader.
        'suggestion.replaces': 'Remplace {value}',

        // --- Generic states ---
        'state.loading': 'Chargement…',
        'state.saving': 'Enregistrement…',
        'state.saved': 'Enregistré',
        'state.empty': 'Aucun élément à afficher',
        'state.noResults': 'Aucun résultat pour cette recherche',
        'state.required': 'Champ obligatoire',
        'state.of': '{from}-{to} sur {total}',
        'state.page': 'Page {page} sur {pages}',
        // beCPG cannot always count a result set (see `formatTotal()`): say so
        // rather than print a number that is not one.
        'state.atLeast': 'au moins {total}',

        // --- Errors ---
        'error.title': 'Une erreur est survenue',
        'error.generic': 'Une erreur est survenue. Merci de réessayer.',
        'error.network': 'Connexion impossible au serveur.',
        'error.upstream': 'beCPG a renvoyé une erreur. Réessayez ; si cela persiste, signalez-le à votre administrateur.',
        'error.unauthorized': 'Votre session a expiré. Merci de vous reconnecter.',
        'error.forbidden': "Vous n'avez pas les droits nécessaires pour cette action.",
        'error.notFound': "Cette page ou cet élément n'existe pas.",
        'error.tenant': "Aucun client n'est associé à votre compte.",
        'error.upload': "Le dépôt du fichier a échoué.",
        'error.http': 'Erreur {status} : {message}',

        // --- Approval status (§5.4.3) ---
        'status.approved': 'Agréé',
        'status.inProgress': 'En cours',
        'status.toRenew': 'À renouveler',
        'status.suspended': 'Suspendu',

        // --- Document / task status ---
        'status.valid': 'Valide',
        'status.expiring': 'Expire bientôt',
        'status.expired': 'Expiré',
        'status.missing': 'Manquant',
        'status.validityMissing': 'Validité à renseigner',
        'status.rejected': 'Refusé',
        'status.pending': 'En attente',
        'status.completed': 'Terminé',
        'status.late': 'En retard',
        'status.draft': 'Brouillon',
        'status.notApplicable': 'Non applicable',

        // --- Test instance banner ---
        'test.banner': 'Instance de TEST — les données saisies ici ne sont pas contractuelles',
        'test.badge': 'Test',
    },
    en: {
        // --- Application ---
        'app.title': 'Supplier Portal',
        'app.shortTitle': 'Portal',
        'app.tenantSuffix': 'supplier space',
        'app.description': 'beCPG supplier portal — referencing, documents and compliance',

        // --- Navigation (supplier space) ---
        'nav.dashboard': 'Dashboard',
        'nav.tasks': 'My tasks',
        'nav.products': 'My products',
        'nav.documents': 'My documents',
        'nav.company': 'My company',
        'nav.specs': 'Specifications',
        'nav.messages': 'Discussions',
        'nav.notifications': 'Notifications',
        'nav.help': 'Help',

        // --- Navigation (monitoring space) ---
        'nav.monitor': 'Monitoring',
        'nav.monitor.suppliers': 'Suppliers',
        'nav.monitor.documents': 'Document compliance',
        'nav.monitor.campaigns': 'Campaigns',
        'nav.monitor.quality': 'Non-conformities',
        'nav.monitor.reports': 'Reports',
        /* See the note on the French key. */
        'nav.monitor.tasks': 'My tasks',

        // --- Account ---
        'account.profile': 'My profile',
        'account.language': 'Language',
        'account.login': 'Sign in',
        'account.logout': 'Sign out',
        'account.tenant': 'Customer',
        'account.suppliers': 'My supplier records',
        'account.allSuppliers': 'All suppliers',

        // --- Actions ---
        'action.save': 'Save',
        'action.cancel': 'Cancel',
        'action.close': 'Close',
        'action.back': 'Back',
        'action.next': 'Next',
        'action.previous': 'Previous',
        'action.submit': 'Submit',
        'action.confirm': 'Confirm',
        'action.delete': 'Delete',
        'action.download': 'Download',
        'action.upload': 'Upload a file',
        'action.retry': 'Retry',
        'action.search': 'Search',
        'action.filter': 'Filter',
        'action.reset': 'Reset',
        'action.export': 'Export',
        'action.sign': 'Sign',
        'action.showMore': '{count} more',
        'action.showLess': 'Show less',

        // --- AI suggestions ---
        'suggestion.replaces': 'Replaces {value}',

        // --- Generic states ---
        'state.loading': 'Loading…',
        'state.saving': 'Saving…',
        'state.saved': 'Saved',
        'state.empty': 'Nothing to display',
        'state.noResults': 'No result for this search',
        'state.required': 'Required field',
        'state.of': '{from}-{to} of {total}',
        'state.page': 'Page {page} of {pages}',
        'state.atLeast': 'at least {total}',

        // --- Errors ---
        'error.title': 'Something went wrong',
        'error.generic': 'Something went wrong. Please try again.',
        'error.network': 'Unable to reach the server.',
        'error.upstream': 'beCPG returned an error. Try again; if it persists, report it to your administrator.',
        'error.unauthorized': 'Your session has expired. Please sign in again.',
        'error.forbidden': 'You are not allowed to perform this action.',
        'error.notFound': 'This page or item does not exist.',
        'error.tenant': 'No customer is associated with your account.',
        'error.upload': 'The file upload failed.',
        'error.http': 'Error {status}: {message}',

        // --- Approval status (§5.4.3) ---
        'status.approved': 'Approved',
        'status.inProgress': 'In progress',
        'status.toRenew': 'To renew',
        'status.suspended': 'Suspended',

        // --- Document / task status ---
        'status.valid': 'Valid',
        'status.expiring': 'Expiring soon',
        'status.expired': 'Expired',
        'status.missing': 'Missing',
        'status.validityMissing': 'Validity to be filled in',
        'status.rejected': 'Rejected',
        'status.pending': 'Pending',
        'status.completed': 'Completed',
        'status.late': 'Late',
        'status.draft': 'Draft',
        'status.notApplicable': 'Not applicable',

        // --- Test instance banner ---
        'test.banner': 'TEST instance — data entered here is not contractual',
        'test.badge': 'Test',
    },
};

/**
 * Normalises any incoming locale ('fr_FR', 'EN-gb', undefined...) to a supported lang.
 *
 * @param {string} [lang] raw locale
 * @returns {string} one of SUPPORTED_LANGS
 */
export function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') {
        return DEFAULT_LANG;
    }
    const code = lang.toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LANGS.includes(code) ? code : DEFAULT_LANG;
}

/**
 * Resolves a chrome message.
 *
 * Falls back to the default language, then to the key itself so a missing key is
 * visible in the UI instead of rendering an empty string.
 *
 * @param {string} lang language code
 * @param {string} key message key (e.g. 'nav.tasks')
 * @param {Object} [vars] values interpolated into `{placeholders}`
 * @returns {string} the resolved message
 */
export function t(lang, key, vars) {
    const code = normalizeLang(lang);
    const dict = messages[code] || messages[DEFAULT_LANG];
    let value = dict[key];

    if (value === undefined) {
        value = messages[DEFAULT_LANG][key];
    }
    if (value === undefined) {
        return key;
    }
    if (!vars) {
        return value;
    }

    return value.replace(/\{(\w+)\}/g, (match, name) => {
        const replacement = vars[name];
        return replacement === undefined || replacement === null ? match : String(replacement);
    });
}
