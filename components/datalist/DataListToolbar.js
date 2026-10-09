'use client';

/**
 * The bar above the grid: what the list is, how many rows it holds, how to
 * search it, and — only when the server allows it — how to add to it.
 *
 * The "add" button is not hidden behind a permission check written here: it
 * reflects `list.canCreate`, which comes from the row-level `userAccess.create`
 * the repository computed (`AbstractDataListExtractor`). A frozen list therefore
 * loses its add button because beCPG says so, not because the portal guessed.
 */

import { Button, Icon, IconButton, Spinner } from '@/components/ui/Button';
import { SEARCH_SLOT_CLASS, SearchInput } from '@/components/ui/Field';
import { StatusPill } from '@/components/ui/StatusPill';
import { useDataListLabels } from '@/components/datalist/useDataList';

/**
 * @param {Object} props
 * @param {Object} props.list the `useDataList` instance
 * @param {React.ReactNode|null} [props.title] falls back to the step title from beCPG; `null` shows none
 * @param {React.ReactNode} [props.description]
 * @param {Function} [props.onAdd] `() => void`; omitted ⇒ no add button
 * @param {Function} [props.onShowShortcuts] opens the keyboard help
 * @param {React.ReactNode} [props.actions] extra buttons (export, AI suggestions…)
 * @param {boolean} [props.showSearch=true]
 * @param {boolean} [props.compact=false] consultation: the title, the search and the
 *        count on one line, without the read-only marker nor the instructions, which
 *        speak to someone entering data
 */
export function DataListToolbar({
    list,
    title,
    description,
    onAdd,
    onShowShortcuts,
    actions,
    showSearch = true,
    compact = false,
}) {
    const label = useDataListLabels();
    // `null` and not `undefined`: the screen names the list itself.
    const heading = title === null ? null : (title ?? list.title);

    if (compact) {
        return (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {heading ? <h2 className="text-base font-medium text-[var(--becpg-blue)]">{heading}</h2> : null}
                {list.readOnlyReason === 'frozen' ? (
                    <StatusPill status="valid" tone="ok" icon="verified" size="sm" label={label('frozenTitle')} />
                ) : null}
                {showSearch ? (
                    <div className={SEARCH_SLOT_CLASS}>
                        <SearchInput value={list.filter} onChange={list.setFilter} placeholder={label('search')} />
                    </div>
                ) : null}
                <span className="inline-flex items-center gap-1 text-xs text-[var(--becpg-dark-grey)]">
                    {list.loading ? <Spinner size={12} /> : <Icon name="table_rows" size={14} />}
                    {label('rows', { count: list.total })}
                </span>
                {actions ? <div className="ms-auto flex items-center gap-2">{actions}</div> : null}
            </div>
        );
    }

    return (
        <div className="mb-3 flex flex-col gap-2">
            {heading || description ? (
                <div className="flex flex-wrap items-center gap-2">
                    {heading ? (
                        <h2 className="text-base font-medium text-[var(--becpg-blue)]">{heading}</h2>
                    ) : null}
                    {list.readOnly ? (
                        <StatusPill
                            status="readonly"
                            tone="neutral"
                            icon="lock"
                            size="sm"
                            label={label('readOnly')}
                        />
                    ) : null}
                    {description ? (
                        <p className="w-full text-sm text-[var(--becpg-dark-grey)]">{description}</p>
                    ) : null}
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                {showSearch ? (
                    <div className={SEARCH_SLOT_CLASS}>
                        <SearchInput
                            value={list.filter}
                            onChange={list.setFilter}
                            placeholder={label('search')}
                        />
                    </div>
                ) : null}

                <span className="hidden items-center gap-1 text-xs text-[var(--becpg-dark-grey)] sm:inline-flex">
                    {list.loading ? <Spinner size={12} /> : <Icon name="table_rows" size={14} />}
                    {label('rows', { count: list.total })}
                </span>


                <div className="ms-auto flex items-center gap-2">
                    {actions}
                    {onShowShortcuts ? (
                        <IconButton
                            icon="keyboard"
                            label={label('shortcuts')}
                            variant="outline"
                            onClick={onShowShortcuts}
                        />
                    ) : null}
                    <IconButton
                        icon="refresh"
                        label={label('retry')}
                        variant="outline"
                        onClick={() => list.refresh()}
                        disabled={list.loading}
                    />
                    {onAdd && list.canCreate ? (
                        <Button variant="primary" size="sm" icon="add" onClick={onAdd}>
                            <span className="hidden sm:inline">{label('addRow')}</span>
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/**
 * The explanation panel shown instead of the editing affordances when the list
 * cannot be written.
 *
 * This is a core mechanic of the supplier process, not a disabled state: a list
 * the customer validated is **frozen** (`datalists[].state === "Valid"`,
 * contracts §4) and no longer belongs to the supplier. Greying out the inputs
 * would leave the supplier wondering what he did wrong, so the reason is spelled
 * out, with the way out (ask for it to be reopened).
 *
 * @param {Object} props
 * @param {string|null} props.reason `frozen` | `readAccess` | `noAssignedTask` | `wizardReadOnly`
 */
export function ReadOnlyNotice({ reason }) {
    const label = useDataListLabels();

    const byReason = {
        frozen: { icon: 'verified', title: label('frozenTitle'), text: label('frozenText'), tone: 'accent' },
        readAccess: { icon: 'visibility', title: label('readAccessTitle'), text: label('readAccessText'), tone: 'muted' },
        noAssignedTask: { icon: 'assignment_late', title: label('noTaskTitle'), text: label('noTaskText'), tone: 'muted' },
        wizardReadOnly: { icon: 'lock', title: label('wizardReadOnlyTitle'), text: label('wizardReadOnlyText'), tone: 'muted' },
    };
    const notice = byReason[reason] || byReason.wizardReadOnly;
    const accent = notice.tone === 'accent';

    return (
        <div
            role="status"
            className={[
                'mb-3 flex items-start gap-3 rounded-xl border p-3',
                accent
                    ? 'border-[var(--becpg-orange)] bg-[var(--becpg-orange)]/8'
                    : 'border-[var(--becpg-grey)] bg-[var(--becpg-grey)]/40',
            ].join(' ')}
        >
            <Icon
                name={notice.icon}
                size={22}
                className={accent ? 'text-[var(--becpg-orange)]' : 'text-[var(--becpg-dark-grey)]'}
            />
            <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--becpg-blue)]">{notice.title}</p>
                <p className="mt-0.5 text-sm text-[var(--becpg-dark-grey)]">{notice.text}</p>
            </div>
        </div>
    );
}
