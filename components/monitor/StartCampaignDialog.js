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
 * ## The scopes, which are the questions a quality manager asks
 *
 * | Scope | What is sent |
 * |---|---|
 * | the supplier record | the supplier itself |
 * | the supplier's whole park | every entity filed under that supplier |
 * | one entity | that entity |
 * | (from a supplier's own screen) | the supplier is fixed, only the scope is asked |
 *
 * A batch never rolls back — the route starts them one by one and reports each —
 * so the dialog stays open on a partial failure and names the entities that did
 * not start. Closing it on "some worked" would hide exactly the rows someone has
 * to act on.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, Spinner } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/StartCampaignDialog#LABELS', {
    fr: {
        title: 'Démarrer un projet',
        subtitle: 'Un projet de référencement par fiche, comme « Envoyer au fournisseur » dans beCPG.',
        supplier: 'Fournisseur',
        supplierPlaceholder: 'Choisir un fournisseur…',
        scope: 'Périmètre',
        scopeSupplier: 'La fiche fournisseur elle-même',
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
        countTruncated:
            'Seuls {count} produits sur {total} peuvent être listés ici : ce sont eux, et eux seuls, qui seront envoyés.',
        suppliersTruncated:
            'Seuls {count} fournisseurs sur {total} sont proposés. Démarrez le projet depuis la fiche du fournisseur s’il n’y figure pas.',
        atLeast: 'au moins {count}',
        loadFailed: 'La liste n’a pas pu être chargée.',
        retry: 'Réessayer',
    },
    en: {
        title: 'Start a project',
        subtitle: 'One referencing project per record, as "Send to supplier" does in beCPG.',
        supplier: 'Supplier',
        supplierPlaceholder: 'Pick a supplier…',
        scope: 'Scope',
        scopeSupplier: 'The supplier record itself',
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
        countTruncated:
            'Only {count} of {total} products can be listed here: those, and only those, will be sent.',
        suppliersTruncated:
            'Only {count} of {total} suppliers are offered. Start the project from the supplier’s page if it is not listed.',
        atLeast: 'at least {count}',
        loadFailed: 'The list could not be loaded.',
        retry: 'Retry',
    },
});

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])));
}

/** The route's own ceiling on `pageSize`. */
const PAGE_SIZE = 100;

/**
 * Safety stop for a listing that would keep answering `hasMoreItems`. The
 * routes serve a bounded window (a few hundred rows) and report `truncated`
 * past it, so this is never the limit that applies in practice.
 */
const MAX_PAGES = 10;

/**
 * Reads every page a listing route is willing to serve.
 *
 * "Every product of this supplier" has to mean every product: a first page of
 * 100 sent as the whole park would leave the rest without a project and
 * nobody the wiser. When the route stops before the end (`truncated`, or more
 * rows than it lets us page to) the result says so instead of passing the
 * prefix off as the whole.
 *
 * @param {(page: number) => Promise<{items?: Object[], pagination?: Object}>} fetchPage
 * @param {{maxPages?: number}} [options]
 * @returns {Promise<{items: Object[], complete: boolean, totalItems: number|null, totalAtLeast: number}>}
 *          `totalItems` is exact or `null`; `totalAtLeast` is always a proven floor
 */
export async function collectPages(fetchPage, { maxPages = MAX_PAGES } = {}) {
    const items = [];
    const seen = new Set();
    let pagination = {};
    for (let page = 1; page <= maxPages; page += 1) {
        const payload = await fetchPage(page);
        const rows = payload?.items ?? [];
        pagination = payload?.pagination ?? {};
        rows.filter((row) => !seen.has(row.nodeRef)).forEach((row) => {
            seen.add(row.nodeRef);
            items.push(row);
        });
        if (!pagination.hasMoreItems || pagination.truncated || rows.length === 0) {
            break;
        }
    }
    const complete = !pagination.hasMoreItems && !pagination.truncated;
    return {
        items,
        complete,
        totalItems: complete ? items.length : (pagination.totalItems ?? null),
        totalAtLeast: Math.max(items.length, Number(pagination.totalAtLeast) || 0),
    };
}

/**
 * `collectPages` over a portal route, re-run when the path or the params
 * change. `loading` is derived from the request key so no state is set
 * synchronously inside the effect.
 *
 * @param {string|null} path null while there is nothing to ask
 * @param {Object} params
 * @returns {{items: Object[], complete: boolean, totalItems: number|null, totalAtLeast: number,
 *            loading: boolean, error: Error|null, retry: Function}}
 */
function useAllPages(path, params) {
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState({ key: null, result: null, error: null });
    const key = path ? JSON.stringify([path, params, attempt]) : null;

    useEffect(() => {
        if (!key) {
            return undefined;
        }
        let cancelled = false;
        collectPages((page) => api.get(path, { params: { ...params, page, pageSize: PAGE_SIZE } }))
            .then((result) => {
                if (!cancelled) {
                    setState({ key, result, error: null });
                }
            })
            .catch((error) => {
                console.error('Start campaign dialog: listing failed', { path, status: error?.status });
                if (!cancelled) {
                    setState({ key, result: null, error });
                }
            });
        return () => {
            cancelled = true;
        };
        // `key` already carries path and params, by value.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const current = key && state.key === key ? state : { result: null, error: null };
    return {
        items: current.result?.items ?? [],
        complete: current.result?.complete ?? true,
        totalItems: current.result?.totalItems ?? null,
        totalAtLeast: current.result?.totalAtLeast ?? 0,
        loading: Boolean(key) && state.key !== key,
        error: current.error,
        retry: () => setAttempt((value) => value + 1),
    };
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
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();

    const [supplierRef, setSupplierRef] = useState(supplier ? supplier.nodeRef : '');
    const [scope, setScope] = useState(SCOPE_SUPPLIER);
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
        setScope(SCOPE_SUPPLIER);
        setEntityRef('');
        setFailures([]);
    }
    // Forgotten on close, or reopening on the same supplier would skip the
    // reset above and show the previous attempt's failures.
    if (!session && openedFor !== null) {
        setOpenedFor(null);
    }

    // Only while the dialog is open: none of this is worth a request otherwise.
    const suppliers = useAllPages(open && !supplier ? 'monitor/suppliers' : null, NO_PARAMS);
    const processes = useApi(open ? 'process/start' : null);
    const entityParams = useMemo(() => ({ supplier: supplierRef }), [supplierRef]);
    const entities = useAllPages(open && supplierRef ? 'entities' : null, entityParams);

    const processOptions = useMemo(
        () => ((processes.data && processes.data.processes) || []).map((entry) => ({
            value: entry.id || entry.nodeRef,
            label: entry.label || entry.name || entry.id || entry.nodeRef,
        })),
        [processes.data],
    );

    // Derived, never stored: the first template stands as the proposal until
    // someone picks one, so an instance publishing a single one asks nothing.
    const selectedProcess = process || (processOptions.length > 0 ? processOptions[0].value : '');

    const entityItems = entities.items;
    const totalLabel = (listing) => (listing.totalItems === null
        ? fill(labels.atLeast, { count: listing.totalAtLeast })
        : listing.totalItems);

    const targets = scopeTargets({ scope, supplierRef, entityRef, entityItems });

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
                            options={suppliers.items.map((row) => ({
                                value: row.nodeRef,
                                label: [row.code, row.name].filter(Boolean).join(' — '),
                            }))}
                        />
                        <ListingNotice
                            listing={suppliers}
                            labels={labels}
                            truncatedText={fill(labels.suppliersTruncated, {
                                count: suppliers.items.length,
                                total: totalLabel(suppliers),
                            })}
                        />
                    </Field>
                )}

                <Field label={labels.scope} required>
                    <div className="flex flex-col gap-1.5">
                        {[[SCOPE_SUPPLIER, labels.scopeSupplier], ['all', labels.scopeAll], ['one', labels.scopeOne]].map(([value, text]) => (
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
                {scope !== SCOPE_SUPPLIER && supplierRef && !entities.loading && !entities.error && entityItems.length === 0 ? (
                    <p className="text-xs text-[var(--status-warn)]">{labels.noEntity}</p>
                ) : null}
                {scope !== SCOPE_SUPPLIER && supplierRef ? (
                    <ListingNotice
                        listing={entities}
                        labels={labels}
                        truncatedText={fill(labels.countTruncated, {
                            count: entityItems.length,
                            total: totalLabel(entities),
                        })}
                    />
                ) : null}
                {scope === 'all' && entityItems.length > 0 && entities.complete ? (
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

const NO_PARAMS = Object.freeze({});

/** The scope that sends the supplier record itself, as Share does from a supplier. */
const SCOPE_SUPPLIER = 'supplier';

/**
 * The records a scope sends: the supplier, every product of the supplier, or one.
 *
 * @param {{scope: string, supplierRef: string, entityRef: string, entityItems: Object[]}} params
 * @returns {string[]}
 */
function scopeTargets({ scope, supplierRef, entityRef, entityItems }) {
    if (scope === SCOPE_SUPPLIER) {
        return supplierRef ? [supplierRef] : [];
    }
    if (scope === 'one') {
        return entityRef ? [entityRef] : [];
    }
    return entityItems.map((entity) => entity.nodeRef);
}

/**
 * What a listing could not deliver: its failure, with a retry, or the warning
 * that it stopped before the end. Icon and text, never colour alone.
 *
 * @param {Object} props
 * @param {{loading: boolean, error: Error|null, complete: boolean, retry: Function}} props.listing
 * @param {Object} props.labels
 * @param {string} props.truncatedText
 */
function ListingNotice({ listing, labels, truncatedText }) {
    if (listing.loading) {
        return null;
    }
    if (listing.error) {
        return (
            <p role="alert" className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--status-danger)]">
                <Icon name="error_outline" size={14} />
                <span>{labels.loadFailed}</span>
                <Button variant="subtle" size="sm" icon="refresh" onClick={listing.retry}>
                    {labels.retry}
                </Button>
            </p>
        );
    }
    if (!listing.complete) {
        return (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--status-warn)]">
                <Icon name="warning_amber" size={14} className="mt-px shrink-0" />
                <span>{truncatedText}</span>
            </p>
        );
    }
    return null;
}
