'use client';

/**
 * « Démarrer une non-conformité » — starts beCPG's non-conformity workflow on a
 * supplier, from the monitoring space (`POST /api/v1/monitor/quality/start`).
 *
 * The fields are those of beCPG's own start form: supplier, product, batch,
 * priority, due date and description. beCPG files the NC, numbers it and opens
 * its analysis task; the portal only starts the workflow.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { collectPages } from '@/components/monitor/StartCampaignDialog';
import { ncHref } from '@/components/monitor/NonConformityList';
import { api } from '@/lib/client';
import { useMessages } from '@/lib/messages';
import { defineLabels, pickLabels } from '@/lib/i18n';

const LABELS = defineLabels('components/monitor/StartNcDialog#LABELS', {
    fr: {
        title: 'Démarrer une non-conformité',
        supplier: 'Fournisseur',
        supplierPlaceholder: 'Choisir un fournisseur…',
        product: 'Produit',
        productNone: 'Aucun produit en particulier',
        batch: 'Lot',
        priority: 'Priorité',
        priorities: { 1: 'Haute (bloquante)', 2: 'Moyenne', 3: 'Basse' },
        dueDate: 'Échéance',
        description: 'Description',
        cancel: 'Annuler',
        start: 'Démarrer',
        started: 'Non-conformité démarrée : beCPG l’enregistre et ouvre son analyse.',
    },
    en: {
        title: 'Start a non-conformity',
        supplier: 'Supplier',
        supplierPlaceholder: 'Pick a supplier…',
        product: 'Product',
        productNone: 'No product in particular',
        batch: 'Batch',
        priority: 'Priority',
        priorities: { 1: 'High (blocking)', 2: 'Medium', 3: 'Low' },
        dueDate: 'Due date',
        description: 'Description',
        cancel: 'Cancel',
        start: 'Start',
        started: 'Non-conformity started: beCPG files it and opens its analysis.',
    },
});

/** What is filed under a supplier and is not a product: it cannot be the NC's product. */
const NOT_PRODUCTS = new Set(['qa:nc', 'bcpg:supplier']);

/** Pages of a listing read for a picker. */
const PAGE_SIZE = 100;
const DEFAULT_PRIORITY = '2';
const NO_PARAMS = Object.freeze({});

/** Every row a listing route serves, while `path` is set. */
function useListing(path, params) {
    const [state, setState] = useState({ key: null, items: [] });
    const key = path ? JSON.stringify([path, params]) : null;
    useEffect(() => {
        if (!key) {
            return undefined;
        }
        let cancelled = false;
        collectPages((page) => api.get(path, { params: { ...params, page, pageSize: PAGE_SIZE } }))
            .then((result) => {
                if (!cancelled) {
                    setState({ key, items: result.items });
                }
            })
            .catch((error) => {
                console.error('Start NC dialog: listing failed', { path, status: error?.status });
            });
        return () => {
            cancelled = true;
        };
        // `key` carries path and params by value.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return { items: state.key === key ? state.items : [], loading: Boolean(key) && state.key !== key };
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {{nodeRef: string, name: string}|null} [props.supplier] fixed supplier
 * @param {Function} [props.onStarted]
 */
export function StartNcDialog({ open, onClose, supplier = null, onStarted }) {
    const { lang } = useMessages();
    const labels = pickLabels(LABELS, lang);
    const toast = useToast();
    const router = useRouter();
    const [form, setForm] = useState({ supplier: '', product: '', batch: '', priority: DEFAULT_PRIORITY, dueDate: '', description: '' });
    const [busy, setBusy] = useState(false);

    // Each opening starts from an empty form, on the fixed supplier when there is one.
    const session = open ? (supplier ? supplier.nodeRef : 'any') : null;
    const [openedFor, setOpenedFor] = useState(null);
    if (session !== openedFor) {
        setOpenedFor(session);
        if (session) {
            setForm({ supplier: supplier ? supplier.nodeRef : '', product: '', batch: '', priority: DEFAULT_PRIORITY, dueDate: '', description: '' });
        }
    }

    const suppliers = useListing(open && !supplier ? 'monitor/suppliers' : null, NO_PARAMS);
    const productParams = useMemo(() => ({ supplier: form.supplier }), [form.supplier]);
    const products = useListing(open && form.supplier ? 'entities' : null, productParams);
    const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value, ...(name === 'supplier' ? { product: '' } : {}) }));
    const ready = Boolean(form.supplier) && form.description.trim() !== '' && !busy;

    const start = async () => {
        setBusy(true);
        try {
            const payload = await api.post('monitor/quality/start', {
                supplier: form.supplier,
                product: form.product || undefined,
                batch: form.batch || undefined,
                priority: Number(form.priority),
                dueDate: form.dueDate || undefined,
                description: form.description.trim(),
            });
            toast.success(labels.started);
            onStarted?.(payload);
            onClose();
            // The NC opens right away: in the list a new one sorts last, as the
            // youngest of the open ones.
            if (payload?.nc?.nodeRef) {
                router.push(ncHref(payload.nc.nodeRef));
            }
        }
        catch (error) {
            toast.error(error);
        }
        finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={busy ? () => {} : onClose}
            title={labels.title}
            description={supplier ? supplier.name : undefined}
            size="md"
            footer={(
                <ButtonGroup>
                    <Button variant="outline" onClick={onClose} disabled={busy}>{labels.cancel}</Button>
                    <Button variant="primary" icon="report_problem" onClick={start} disabled={!ready} loading={busy}>{labels.start}</Button>
                </ButtonGroup>
            )}
        >
            <div className="flex flex-col gap-3">
                {supplier ? null : (
                    <Field label={labels.supplier} required id="nc-supplier">
                        <Select
                            id="nc-supplier"
                            value={form.supplier}
                            placeholder={labels.supplierPlaceholder}
                            onChange={set('supplier')}
                            options={suppliers.items.map((row) => ({ value: row.nodeRef, label: [row.code, row.name].filter(Boolean).join(' · ') }))}
                        />
                    </Field>
                )}
                <Field label={labels.product} id="nc-product">
                    <Select
                        id="nc-product"
                        value={form.product}
                        onChange={set('product')}
                        disabled={!form.supplier}
                        options={[
                            { value: '', label: labels.productNone },
                            ...products.items.filter((row) => !NOT_PRODUCTS.has(row.type)).map((row) => ({ value: row.nodeRef, label: [row.code, row.name].filter(Boolean).join(' · ') })),
                        ]}
                    />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label={labels.priority} id="nc-priority">
                        <Select
                            id="nc-priority"
                            value={form.priority}
                            onChange={set('priority')}
                            options={Object.entries(labels.priorities).map(([value, label]) => ({ value, label }))}
                        />
                    </Field>
                    <Field label={labels.dueDate} id="nc-due">
                        <Input id="nc-due" type="date" value={form.dueDate} onChange={set('dueDate')} />
                    </Field>
                    <Field label={labels.batch} id="nc-batch">
                        <Input id="nc-batch" value={form.batch} onChange={set('batch')} maxLength={100} />
                    </Field>
                </div>
                <Field label={labels.description} required id="nc-description">
                    <Textarea id="nc-description" rows={5} maxLength={4000} value={form.description} onChange={set('description')} />
                </Field>
            </div>
        </Modal>
    );
}
