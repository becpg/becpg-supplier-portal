/**
 * The task types returned by `/api/v1/tasks` (`task.type`), with their icon and
 * label, so every screen that names a task type uses the same vocabulary.
 */

import { defineLabels, pickLabels } from '@/lib/i18n';

export const TASK_TYPE_META = {
    wizard: defineLabels('components/dashboard/taskTypes#TASK_TYPE_META.wizard', { icon: 'edit_note', fr: 'Assistant', en: 'Wizard' }),
    signature: defineLabels('components/dashboard/taskTypes#TASK_TYPE_META.signature', { icon: 'draw', fr: 'Signature', en: 'Signature' }),
    document: defineLabels('components/dashboard/taskTypes#TASK_TYPE_META.document', { icon: 'upload_file', fr: 'Document', en: 'Document' }),
    review: defineLabels('components/dashboard/taskTypes#TASK_TYPE_META.review', { icon: 'visibility', fr: 'Revue', en: 'Review' }),
    workflow: defineLabels('components/dashboard/taskTypes#TASK_TYPE_META.workflow', { icon: 'account_tree', fr: 'Workflow', en: 'Workflow' }),
};

/**
 * @param {string} type
 * @param {string} lang
 * @returns {string} the label of the type, the raw type when unknown, a dash when absent
 */
export function taskTypeLabel(type, lang) {
    const meta = TASK_TYPE_META[type];
    if (!meta) {
        return type || '—';
    }
    return pickLabels(meta, lang);
}
