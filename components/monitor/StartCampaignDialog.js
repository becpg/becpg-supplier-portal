'use client';

/**
 * **Démarrer une campagne** — the referencing project, started from the
 * monitoring space.
 *
 * ## What beCPG actually does, and why the portal composes two calls
 *
 * A campaign is a *referencing project per entity*: `SupplierPortalServiceImpl`
 * branches the entity into the supplier's space, creates the project from a
 * template and assigns the supplier's accounts to its tasks. Share submits that
 * to `becpg/workflow/start-process?script=create-supplier-project.js`, and two of
 * the fields it posts — the project name and the accounts — are **computed by
 * beCPG**, not by the caller.
 *
 * `POST /api/v1/process/start` already composes exactly that (the `defs=true`
 * call first, the start after), one project per entity, reporting per entity. So
 * this dialog invents nothing: it chooses *what* to send and shows *what came
 * back*.
 *
 * ## The three scopes, which are the three questions a quality manager asks
 *
 * | Scope | What is sent |
 * |---|---|
 * | the supplier's whole park | every entity filed under that supplier |
 * | one entity | that entity |
 * | (from a supplier's own screen) | the supplier is fixed, only the scope is asked |
 *
 * A batch never rolls back — the route starts them one by one and reports each —
 * so the dialog stays open on a partial failure and names the entities that did
 * not start. Closing it on "some worked" would hide exactly the rows someone has
 * to act on.
 */

import { useMemo, useState } from 'react';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Démarrer un projet',
        subtitle: 'Un projet de référencement par produit, comme « Envoyer au fournisseur » dans beCPG.',
        supplier: 'Fournisseur',
        supplierPlaceholder: 'Choisir un fournisseur…',
        scope: 'Périmètre',
        scopeAll: 'Tous les produits de ce fournisseur',
        scopeOne: 'Un produit en particulier',
        entity: 'Produit',
        entityPlaceholder: 'Choisir un produit…',
        process: 'Modèle de projet',
        processPlaceholder: 'Choisir un modèle…',
        start: 'Démarrer',
        cancel: 'Annuler',
        starting: 'Démarrage…',
        noEntity: 'Aucun produit n’est rattaché à ce fournisseur : rien à envoyer.',
        noProcess: 'Aucun modèle de projet n’est ouvert au portail sur cette instance.',
        countAll: '{count} produit(s) seront envoyés, un projet par produit.',
        done: '{count} projet(s) démarré(s)',
        partial: '{done} démarrée(s), {failed} en échec',
        failedTitle: 'Ces produits n’ont pas démarré',
    },
    en: {
        title: 'Start a project',
        subtitle: 'One referencing project per product, as "Send to supplier" does in beCPG.',
        supplier: 'Supplier',
        supplierPlaceholder: 'Pick a supplier…',
        scope: 'Scope',
        scopeAll: 'Every product of this supplier',
        scopeOne: 'One product',
        entity: 'Product',
        entityPlaceholder: 'Pick a product…',
        process: 'Project template',
        processPlaceholder: 'Pick a template…',
        start: 'Start',
        cancel: 'Cancel',
        starting: 'Starting…',
        noEntity: 'No product is attached to this supplier: nothing to send.',
        noProcess: 'No project template is open to the portal on this instance.',
        countAll: '{count} product(s) will be sent, one project each.',
        done: '{count} project(s) started',
        partial: '{done} started, {failed} failed',
        failedTitle: 'These products did not start',
    },
};

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {{nodeRef: string, name: string}|null} [props.supplier] fixed supplier — the
 *        dialog then asks for the scope only
 * @param {Function} [props.onStarted] called once at least one project was created
 */
export function StartCampaignDialog({ open, onClose, supplier = null, onStarted }) {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const toast = useToast();

    const [supplierRef, setSupplierRef] = useState(supplier ? supplier.nodeRef : '');
    const [scope, setScope] = useState('all');
    const [entityRef, setEntityRef] = useState('');
    const [process, setProcess] = useState('');
    const [starting, setStarting] = useState(false);
    const [failures, setFailures] = useState([]);

    /*
     * An opening starts from scratch -- adjusted DURING the render, not in an effect.
     *
     * Reopening the dialog on another supplier must not inherit the perimeter
     * nor the failures of the previous time. This is React's "adjust state on
     * prop change" pattern, the one `Wizard.js` already uses: an effect would
     * cost one more render with the stale state on screen.
     */
    const session = open ? (supplier ? supplier.nodeRef : 'any') : null;
    const [openedFor, setOpenedFor] = useState(null);
    if (session && openedFor !== session) {
        setOpenedFor(session);
        setSupplierRef(supplier ? supplier.nodeRef : '');
        setScope('all');
        setEntityRef('');
        setFailures([]);
    }

    // Only while the dialog is open: none of this is worth a request otherwise.
    const suppliers = useApi(open && !supplier ? 'monitor/suppliers' : null, {
        params: { pageSize: 100 },
    });
    const processes = useApi(open ? 'process/start' : null);
    const entities = useApi(open && supplierRef ? 'entities' : null, {
        params: { supplier: supplierRef, pageSize: 100 },
    });

    const processOptions = useMemo(
        () => ((processes.data && processes.data.processes) || []).map((entry) => ({
            value: entry.id || entry.nodeRef,
            label: entry.name || entry.id || entry.nodeRef,
        })),
        [processes.data],
    );

    // Derived, never stored: the first template stands as the proposal until
    // someone picks one, so an instance publishing a single one asks nothing.
    const selectedProcess = process || (processOptions.length > 0 ? processOptions[0].value : '');

    const entityItems = useMemo(
        () => ((entities.data && entities.data.items) || []),
        [entities.data],
    );

    const targets = scope === 'one'
        ? (entityRef ? [entityRef] : [])
        : entityItems.map((entity) => entity.nodeRef);

    const canStart = Boolean(supplierRef) && targets.length > 0 && Boolean(selectedProcess) && !starting;

    const start = async () => {
        setStarting(true);
        setFailures([]);
        try {
            const payload = await api.post('process/start', {
                process: selectedProcess,
                ...(targets.length === 1 ? { entityNodeRef: targets[0] } : { nodeRefs: targets }),
            });
            const results = (payload && payload.results) || [];
            const failed = results.filter((entry) => !entry.ok);
            const done = results.length - failed.length;
            setFailures(failed);
            if (failed.length === 0) {
                toast.success(fill(labels.done, { count: done }));
                if (onStarted) {
                    onStarted(payload);
                }
                onClose();
                return;
            }
            toast.error(new Error(fill(labels.partial, { done, failed: failed.length })));
            if (done > 0 && onStarted) {
                onStarted(payload);
            }
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setStarting(false);
        }
    };

    const nameOf = (entity) => [entity.code, entity.name].filter(Boolean).join(' — ');

    return (
        <Modal
            open={open}
            onClose={starting ? () => {} : onClose}
            title={labels.title}
            description={labels.subtitle}
            size="md"
            footer={(
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="subtle" onClick={onClose} disabled={starting}>
                        {labels.cancel}
                    </Button>
                    <Button icon="rocket_launch" onClick={start} disabled={!canStart} loading={starting}>
                        {starting ? labels.starting : labels.start}
                    </Button>
                </div>
            )}
        >
            <div className="flex flex-col gap-3">
                {supplier ? null : (
                    <Field label={labels.supplier} required>
                        <Select
                            value={supplierRef}
                            placeholder={labels.supplierPlaceholder}
                            onChange={(event) => {
                                setSupplierRef(event.target.value);
                                setEntityRef('');
                            }}
                            options={((suppliers.data && suppliers.data.items) || []).map((row) => ({
                                value: row.nodeRef,
                                label: [row.code, row.name].filter(Boolean).join(' — '),
                            }))}
                        />
                    </Field>
                )}

                <Field label={labels.scope} required>
                    <div className="flex flex-col gap-1.5">
                        {[['all', labels.scopeAll], ['one', labels.scopeOne]].map(([value, text]) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="campaign-scope"
                                    value={value}
                                    checked={scope === value}
                                    onChange={() => setScope(value)}
                                    className="h-4 w-4 accent-[var(--becpg-blue)]"
                                />
                                <span>{text}</span>
                            </label>
                        ))}
                    </div>
                </Field>

                {scope === 'one' ? (
                    <Field label={labels.entity} required>
                        <Select
                            value={entityRef}
                            placeholder={labels.entityPlaceholder}
                            onChange={(event) => setEntityRef(event.target.value)}
                            options={entityItems.map((entity) => ({
                                value: entity.nodeRef,
                                label: nameOf(entity),
                            }))}
                        />
                    </Field>
                ) : null}

                <Field label={labels.process} required>
                    <Select
                        value={selectedProcess}
                        placeholder={labels.processPlaceholder}
                        onChange={(event) => setProcess(event.target.value)}
                        options={processOptions}
                    />
                </Field>

                {/* What the button is about to do, in a sentence — a batch that
                    starts twenty projects must say twenty before, not after. */}
                {supplierRef && entities.loading ? (
                    <p className="flex items-center gap-1.5 text-xs text-[var(--becpg-dark-grey)]">
                        <Spinner size={13} />
                    </p>
                ) : null}
                {supplierRef && !entities.loading && entityItems.length === 0 ? (
                    <p className="text-xs text-[var(--status-warn)]">{labels.noEntity}</p>
                ) : null}
                {scope === 'all' && entityItems.length > 0 ? (
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {fill(labels.countAll, { count: entityItems.length })}
                    </p>
                ) : null}
                {!processes.loading && processOptions.length === 0 ? (
                    <p className="text-xs text-[var(--status-danger)]">{labels.noProcess}</p>
                ) : null}

                {failures.length > 0 ? (
                    <div className="rounded-lg bg-[var(--status-danger-bg)] p-2.5">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--status-danger)]">
                            <Icon name="error_outline" size={14} />
                            {labels.failedTitle}
                        </p>
                        <ul className="flex list-none flex-col gap-0.5 p-0 text-xs text-[var(--becpg-blue)]">
                            {failures.map((entry) => (
                                <li key={entry.entityNodeRef}>
                                    {(entityItems.find((item) => item.nodeRef === entry.entityNodeRef)
                                        ? nameOf(entityItems.find((item) => item.nodeRef === entry.entityNodeRef))
                                        : entry.entityNodeRef)}
                                    {entry.message ? ` — ${entry.message}` : ''}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
