'use client';

/**
 * The words of the cockpit legends: approval statuses, document statuses, task
 * states and non-conformity ages. Shared by every tab, so one status reads the
 * same on each of them.
 */

import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const VOCABULARY = defineLabels('components/monitor/cockpit/vocabulary#VOCABULARY', {
    fr: {
        approval: {
            approved: 'Agréés',
            inProgress: 'En cours',
            toRenew: 'À renouveler',
            suspended: 'Suspendus',
        },
        documents: {
            valid: 'Valides',
            expiring: 'Expirent bientôt',
            toValidate: 'À valider',
            expired: 'Expirés',
            refused: 'Refusés',
            missing: 'Manquants',
        },
        taskStates: {
            planned: 'Planifiées',
            inProgress: 'En cours',
            completed: 'Terminées',
            cancelled: 'Annulées',
            refused: 'Refusées',
            onHold: 'En attente',
        },
        ncAges: {
            under3Months: '< 3 mois',
            from3To12Months: '3-12 mois',
            from1To2Years: '1-2 ans',
            over2Years: '> 2 ans',
        },
        nc: {
            blocking: 'Bloquantes',
            nonBlocking: 'Non bloquantes',
        },
        noFamily: 'Sans famille',
        noSubFamily: 'Sans sous-famille',
    },
    en: {
        approval: {
            approved: 'Approved',
            inProgress: 'In progress',
            toRenew: 'To renew',
            suspended: 'Suspended',
        },
        documents: {
            valid: 'Valid',
            expiring: 'Expiring soon',
            toValidate: 'To validate',
            expired: 'Expired',
            refused: 'Refused',
            missing: 'Missing',
        },
        taskStates: {
            planned: 'Planned',
            inProgress: 'In progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            refused: 'Refused',
            onHold: 'On hold',
        },
        ncAges: {
            under3Months: '< 3 months',
            from3To12Months: '3-12 months',
            from1To2Years: '1-2 years',
            over2Years: '> 2 years',
        },
        nc: {
            blocking: 'Blocking',
            nonBlocking: 'Non-blocking',
        },
        noFamily: 'No family',
        noSubFamily: 'No sub-family',
    },
});

/** Document statuses of the matrix, best first: the stacking order of the charts. */
export const DOCUMENT_STATUSES = Object.freeze(['valid', 'expiring', 'toValidate', 'expired', 'refused', 'missing']);

/** Approval statuses in the order every chart stacks them. */
export const APPROVAL_ORDER = Object.freeze(['approved', 'inProgress', 'toRenew', 'suspended']);

/**
 * The cockpit vocabulary in the reader's language.
 *
 * @returns {Object}
 */
export function useVocabulary() {
    const { lang } = useMessages();
    return pickLabels(VOCABULARY, lang);
}
