'use client';

/**
 * `/specs` — the applicable *cahiers des charges*, read-only and downloadable
 * (spec §4.2).
 *
 * A specification is attached to an entity through `bcpg:productSpecifications`,
 * and that association is only readable **from** the entity — there is no query
 * that goes the other way (the same source-association limitation the tasks
 * adapter documents for `pjt:projectEntity`). So the page composes what exists:
 * it lists the supplier's entities once, then reads each one's specifications
 * with a bounded fan-out, and merges the result — one row per specification,
 * carrying the products it applies to.
 *
 * That fan-out is the reason the list appears progressively: results are shown
 * as they land rather than after the last one, so a supplier with forty products
 * does not stare at a spinner. The concurrency cap keeps the portal from opening
 * forty sockets at once against beCPG.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { Card } from '@/components/ui/Card';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/EmptyState';
import { SpecPanel } from '@/components/specs/SpecPanel';
import { useSession } from '@/components/providers/SessionProvider';
import { api, useApi } from '@/lib/client';
import { useMessages } from '@/lib/messages';

const LABELS = {
    fr: {
        title: 'Cahiers des charges',
        subtitle: 'Les documents de référence que le client applique à vos produits',
        stats: {
            specs: 'Cahiers des charges',
            products: 'Produits couverts',
        },
        loading: 'Analyse de vos produits… {done} / {total}',
        empty: 'Aucun cahier des charges',
        emptyHint:
            'Aucun cahier des charges n’est associé à vos produits. Le client vous en communiquera un s’il en applique un.',
    },
    en: {
        title: 'Specifications',
        subtitle: 'The reference documents the customer applies to your products',
        stats: {
            specs: 'Specifications',
            products: 'Covered products',
        },
        loading: 'Scanning your products… {done} / {total}',
        empty: 'No specification',
        emptyHint:
            'No specification is attached to your products. The customer will share one if any applies.',
    },
};

/** Parallel reads against beCPG. Four is enough to feel instant, small enough to stay polite. */
const CONCURRENCY = 4;

/** Entities scanned at most — beyond that the page would be a crawler, not a screen. */
const MAX_ENTITIES = 60;

function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) =>
        vars[key] === undefined || vars[key] === null ? match : String(vars[key]),
    );
}

export default function SpecsPage() {
    const { lang } = useMessages();
    const labels = LABELS[lang] || LABELS.fr;
    const session = useSession();

    const products = useApi('entities', { params: { pageSize: MAX_ENTITIES } });

    const [nonce, setNonce] = useState(0);

    /** Entities to scan: the supplier's own record first, then its products. */
    const targets = useMemo(() => {
        const items = (products.data && products.data.items) || [];
        const list = items.map((item) => ({
            id: item.uuid,
            nodeRef: item.nodeRef,
            name: item.name,
            code: item.code,
        }));
        const supplier = session.supplier;
        if (supplier && supplier.uuid && !list.some((entry) => entry.nodeRef === supplier.nodeRef)) {
            list.unshift({
                id: supplier.uuid,
                nodeRef: supplier.nodeRef,
                name: supplier.name,
                code: supplier.code,
            });
        }
        return list.slice(0, MAX_ENTITIES);
    }, [products.data, session.supplier]);

    // Keyed on the entity set (and on the retry counter): a refresh of the
    // product list re-runs the scan, a re-render does not.
    const scanKey = useMemo(() => targets.map((entry) => entry.id).join('|'), [targets]);
    const runKey = `${scanKey}#${nonce}`;
    const alive = useRef(true);

    // The run key is part of the state, so a new scan resets the accumulator
    // *during render* rather than from inside the effect — an effect that calls
    // setState synchronously costs a second render pass on every navigation
    // (the same pattern `useApi` uses in lib/client.js).
    const [state, setState] = useState({
        key: runKey,
        specs: {},
        done: 0,
        total: targets.length,
        error: null,
        scanning: Boolean(scanKey),
    });
    if (state.key !== runKey) {
        setState({
            key: runKey,
            specs: {},
            done: 0,
            total: targets.length,
            error: null,
            scanning: Boolean(scanKey),
        });
    }

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    useEffect(() => {
        if (!scanKey) {
            return undefined;
        }

        const controller = new AbortController();
        let cancelled = false;

        const queue = [...targets];
        const worker = async () => {
            while (queue.length > 0 && !cancelled) {
                const target = queue.shift();
                let payload = null;
                try {
                    payload = await api.get(`entities/${target.id}/specs`, { signal: controller.signal });
                }
                catch (error) {
                    // One unreadable product must not empty the page: its specs
                    // are simply absent, exactly like beCPG's own ACL filtering.
                    if (error && error.name === 'AbortError') {
                        return;
                    }
                    payload = null;
                }
                if (cancelled || !alive.current) {
                    return;
                }
                setState((previous) => {
                    // A result that lands after the scan was superseded is dropped.
                    if (previous.key !== runKey) {
                        return previous;
                    }
                    const specs = { ...previous.specs };
                    ((payload && payload.specifications) || []).forEach((specification) => {
                        const key = specification.nodeRef;
                        const existing = specs[key];
                        specs[key] = existing
                            ? { ...existing, appliesTo: [...existing.appliesTo, target] }
                            : { ...specification, appliesTo: [target] };
                    });
                    return { ...previous, specs, done: previous.done + 1 };
                });
            }
        };

        Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker))
            .then(() => {
                if (!cancelled && alive.current) {
                    setState((previous) =>
                        previous.key === runKey ? { ...previous, scanning: false } : previous,
                    );
                }
            })
            .catch((error) => {
                if (!cancelled && alive.current) {
                    setState((previous) =>
                        previous.key === runKey ? { ...previous, scanning: false, error } : previous,
                    );
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
        // `targets` is derived from `scanKey`; depending on it too would re-run
        // the scan on every render, since the memo returns a new array identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runKey, scanKey]);

    const specifications = useMemo(() => Object.values(state.specs), [state.specs]);

    const retry = useCallback(() => {
        products.refresh();
        setNonce((value) => value + 1);
    }, [products]);

    const coveredProducts = useMemo(() => {
        const set = new Set();
        specifications.forEach((specification) =>
            (specification.appliesTo || []).forEach((entry) => set.add(entry.nodeRef)),
        );
        return set.size;
    }, [specifications]);

    if (products.error) {
        return (
            <AppShell title={labels.title}>
                <ErrorState error={products.error} onRetry={retry} />
            </AppShell>
        );
    }

    const scanning = products.loading || state.scanning;

    return (
        <AppShell title={labels.title} fullWidth>
            <p className="mb-4 text-sm text-[var(--becpg-dark-grey)]">{labels.subtitle}</p>

            <StatGrid columns={2} className="mb-4">
                <StatCard
                    label={labels.stats.specs}
                    value={specifications.length}
                    icon="menu_book"
                    tone={specifications.length ? 'info' : 'neutral'}
                    index={0}
                />
                <StatCard
                    label={labels.stats.products}
                    value={coveredProducts}
                    icon="inventory_2"
                    tone="neutral"
                    index={1}
                />
            </StatGrid>

            {scanning && state.total > 0 ? (
                <Card padding="sm" variant="muted" className="mb-3">
                    <p className="text-xs text-[var(--becpg-dark-grey)]">
                        {fill(labels.loading, { done: state.done, total: state.total })}
                    </p>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--becpg-grey)]">
                        <div
                            className="h-full rounded-full bg-[var(--becpg-blue-light)] transition-[width] duration-300"
                            style={{ width: `${Math.round((state.done / state.total) * 100)}%` }}
                        />
                    </div>
                </Card>
            ) : null}

            <SpecPanel
                specifications={specifications}
                variant="list"
                title={null}
                loading={products.loading && specifications.length === 0}
                error={state.error}
                onRetry={retry}
                emptyMessage={labels.emptyHint}
            />
        </AppShell>
    );
}
