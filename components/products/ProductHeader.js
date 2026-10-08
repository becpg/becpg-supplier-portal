'use client';

/**
 * The identity band of a product sheet.
 *
 * Everything a supplier needs to be sure they are looking at the right item, in one
 * glance and in one screen width: name, code, ERP code, type, state, the client
 * subsidiary it belongs to, the referencing project when there is one, and the
 * completion per catalogue derived from `bcpg:entityScore`.
 *
 * It is read-only by construction — the portal's write path on a product is the
 * wizard, never this sheet (spec §4.2 "fiche produit (lecture …)").
 *
 * ## Type labels — the one piece of business vocabulary spelled out in the portal
 *
 * `bcpg:rawMaterial` is a repository qname, not a word a supplier knows, and
 * `GET /api/v1/entities/{id}` does not carry a translated type title today. So
 * {@link entityTypeLabel} resolves in this order:
 *
 *   1. `entity.typeLabel` — whatever the server sends, always preferred;
 *   2. the map below, for the handful of types the portal deals with;
 *   3. the qname's local name, so an unknown type is shown rather than swallowed.
 *
 * Step 2 is a **deliberate, temporary deviation from AGENTS.md rule 4** ("business
 * labels come translated from beCPG"), not a pattern to copy: it exists because
 * no endpoint returns the title yet. The fix is to have `lib/adapters/entities.js`
 * read `becpg/remote/dictionary?type={type}` (already allow-listed) and emit
 * `typeLabel` — after which this map can be deleted without touching a component.
 * Note that no *field*, *column* or *form* is hard-coded anywhere: those come
 * entirely from the definition, which is the invariant that actually matters.
 */

import Link from 'next/link';
import { useMessages } from '@/lib/messages';
import { Icon } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompletionMeter } from '@/components/products/CompletionMeter';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';
import { defineLabels, pickLabels } from '@/lib/i18n';

/** `workspace://SpacesStore/<uuid>` → `<uuid>`, for a portal route. */
function nodeRefUuid(nodeRef) {
    return String(nodeRef || '').split('/').pop();
}

function fill(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
        (vars[name] === undefined || vars[name] === null ? match : String(vars[name])),
    );
}

const LABELS = defineLabels('components/products/ProductHeader#LABELS', {
    fr: {
        code: 'Code',
        branch: 'Mise à jour en cours',
        branchFrom: 'Mise à jour de la version {version}',
        branchTitle: 'Cette fiche est une copie de travail créée pour le référencement.',
        branchTitleLocked:
            'Cette fiche est la copie de travail créée pour le référencement. '
            + 'La version validée existe côté client, mais elle ne vous est pas accessible en lecture.',
        erpCode: 'Code ERP',
        supplier: 'Fournisseur',
        subsidiary: 'Filiale',
        project: 'Projet',
        modified: 'Mise à jour',
        created: 'Créé le',
        version: 'Version',
        legalName: 'Dénomination légale',
        back: 'Mes produits',
        types: {
            'bcpg:rawMaterial': 'Matière première',
            'bcpg:finishedProduct': 'Produit fini',
            'bcpg:semiFinishedProduct': 'Semi-fini',
            'bcpg:localSemiFinishedProduct': 'Semi-fini local',
            'bcpg:packagingMaterial': 'Emballage',
            'bcpg:packagingKit': 'Kit d’emballage',
            'bcpg:supplier': 'Fournisseur',
            'bcpg:productSpecification': 'Cahier des charges',
            'qa:nc': 'Non-conformité',
        },
    },
    en: {
        code: 'Code',
        branch: 'Update in progress',
        branchFrom: 'Update of version {version}',
        branchTitle: 'This sheet is a working copy created for the referencing.',
        branchTitleLocked:
            'This sheet is the working copy created for the referencing. '
            + 'The approved version exists on the customer side, but you have no read access to it.',
        erpCode: 'ERP code',
        supplier: 'Supplier',
        subsidiary: 'Subsidiary',
        project: 'Project',
        modified: 'Updated',
        created: 'Created on',
        version: 'Version',
        legalName: 'Legal name',
        back: 'My products',
        types: {
            'bcpg:rawMaterial': 'Raw material',
            'bcpg:finishedProduct': 'Finished product',
            'bcpg:semiFinishedProduct': 'Semi-finished',
            'bcpg:localSemiFinishedProduct': 'Local semi-finished',
            'bcpg:packagingMaterial': 'Packaging',
            'bcpg:packagingKit': 'Packaging kit',
            'bcpg:supplier': 'Supplier',
            'bcpg:productSpecification': 'Specification',
            'qa:nc': 'Non-conformity',
        },
    },
});

function labelsFor(lang) {
    return pickLabels(LABELS, lang);
}

/**
 * Human label of an entity type. See the header for the resolution order.
 *
 * @param {string|Object|null} type qname (`bcpg:rawMaterial`), or the entity
 *        itself when it may carry a server-side `typeLabel`
 * @param {string} [lang='fr']
 * @returns {string}
 */
export function entityTypeLabel(type, lang = 'fr') {
    if (type && typeof type === 'object') {
        // An entity was passed: a label from beCPG always wins over our map.
        return type.typeLabel || entityTypeLabel(type.type, lang);
    }
    if (!type) {
        return '—';
    }
    const labels = labelsFor(lang);
    return labels.types[type] || (type.includes(':') ? type.split(':')[1] : type);
}

/** One `dt`/`dd` pair; renders nothing when there is no value. */
function Fact({ label, children, icon }) {
    if (children === null || children === undefined || children === '' || children === '—') {
        return null;
    }
    return (
        <div className="min-w-0">
            <dt className="flex items-center gap-1 text-[0.6875rem] uppercase tracking-wide text-[var(--becpg-dark-grey)]">
                {icon ? <Icon name={icon} size={12} /> : null}
                {label}
            </dt>
            <dd className="mt-0.5 break-words text-sm">{children}</dd>
        </div>
    );
}

/**
 * @param {Object} props
 * @param {Object} props.entity the payload of `GET /api/v1/entities/{id}`
 * @param {React.ReactNode} [props.actions] buttons rendered at the top right
 * @param {boolean} [props.loading]
 * @param {string} [props.backHref] renders a "back to the list" link above the title
 * @param {boolean} [props.showCompletion=true]
 * @param {React.ReactNode} [props.children] extra content under the facts (tabs, alerts)
 */
export function ProductHeader({
    entity,
    actions,
    loading = false,
    backHref,
    showCompletion = true,
    className = '',
    children,
}) {
    const { lang } = useMessages();
    const labels = labelsFor(lang);

    if (loading || !entity) {
        return (
            <Card padding="lg" className={className}>
                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <Skeleton width="60%" height={24} />
                        <div className="mt-3 flex gap-2">
                            <Skeleton width={90} height={20} radius="9999px" />
                            <Skeleton width={110} height={20} radius="9999px" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {Array.from({ length: 4 }, (_, index) => (
                                <Skeleton key={index} height={34} />
                            ))}
                        </div>
                    </div>
                    <Skeleton width={96} height={96} circle />
                </div>
            </Card>
        );
    }

    return (
        <Card padding="lg" className={className}>
            {backHref ? (
                <Link
                    href={backHref}
                    className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)]"
                >
                    <Icon name="arrow_back" size={14} />
                    {labels.back}
                </Link>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <h1 className="break-words text-lg font-medium leading-tight sm:text-xl">
                        {entity.name || '—'}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="pill pill-neutral pill-no-dot pill-sm">
                            <Icon name="category" size={12} />
                            <span>{entityTypeLabel(entity, lang)}</span>
                        </span>
                        {entity.state ? <StatusPill status={entity.state} size="sm" /> : null}
                        {entity.code ? (
                            <span className="pill pill-info pill-no-dot pill-sm" title={labels.code}>
                                <Icon name="tag" size={12} />
                                <span className="tabular-nums">{entity.code}</span>
                            </span>
                        ) : null}
                        {/*
                         * Referencing a product cuts a **branch** off the validated
                         * version, so this sheet and the version the customer has
                         * approved are two entries that look like two products.
                         * Measured on dev: 48 of the 58 products this account sees
                         * are branches, and nothing said so.
                         *
                         * The validated version is linked **only when the account can
                         * actually read it**. Measured on dev: of the 48 branches, the
                         * origin is readable for 11 and refused for 37 (`#AccessDenied`
                         * on the association, 401 on the node). So both cases are real,
                         * and a link to a 401 is worse than plain text — the locked case
                         * says so in its tooltip instead of pretending the page exists.
                         */}
                        {entity.branch ? (
                            entity.branch.originReadable ? (
                                <Link
                                    href={`/products/${nodeRefUuid(entity.branch.origin.nodeRef)}`}
                                    className="pill pill-warn pill-no-dot pill-sm hover:underline"
                                    title={labels.branchTitle}
                                >
                                    <Icon name="call_split" size={12} />
                                    <span>
                                        {entity.branch.versionLabel
                                            ? fill(labels.branchFrom, { version: entity.branch.versionLabel })
                                            : labels.branch}
                                    </span>
                                    <Icon name="open_in_new" size={12} />
                                </Link>
                            ) : (
                                <span className="pill pill-warn pill-no-dot pill-sm" title={labels.branchTitleLocked}>
                                    <Icon name="call_split" size={12} />
                                    <span>
                                        {entity.branch.versionLabel
                                            ? fill(labels.branchFrom, { version: entity.branch.versionLabel })
                                            : labels.branch}
                                    </span>
                                </span>
                            )
                        ) : null}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {showCompletion ? <CompletionMeter completion={entity.completion} /> : null}
                    {actions ? (
                        <div className="flex flex-col items-stretch gap-2">{actions}</div>
                    ) : null}
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--becpg-grey)] pt-4 sm:grid-cols-3 lg:grid-cols-4">
                <Fact label={labels.legalName}>{entity.legalName}</Fact>
                <Fact label={labels.erpCode} icon="qr_code_2">
                    {entity.erpCode}
                </Fact>
                <Fact label={labels.supplier} icon="local_shipping">
                    {entity.supplier ? entity.supplier.name : null}
                </Fact>
                <Fact label={labels.subsidiary} icon="apartment">
                    {entity.subsidiary ? entity.subsidiary.name : null}
                </Fact>
                <Fact label={labels.project} icon="assignment">
                    {entity.project ? entity.project.name : null}
                </Fact>
                <Fact label={labels.version} icon="history">
                    {entity.version}
                </Fact>
                <Fact label={labels.modified} icon="update">
                    {entity.modified ? formatDate(entity.modified, lang) : null}
                </Fact>
                <Fact label={labels.created} icon="event_available">
                    {entity.created ? formatDate(entity.created, lang) : null}
                </Fact>
            </dl>

            {children}
        </Card>
    );
}
