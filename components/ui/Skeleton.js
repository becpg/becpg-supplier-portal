'use client';

/**
 * Loading placeholders.
 *
 * Every shape reuses the `.skeleton*` classes from globals.css, so the shimmer
 * (and its `prefers-reduced-motion` opt-out) is defined in exactly one place.
 * Skeletons are `aria-hidden`: a screen reader announces the busy region, not
 * the grey boxes.
 */

/**
 * A single placeholder block.
 *
 * @param {Object} props
 * @param {string|number} [props.width] CSS width (`'70%'`, `120`)
 * @param {string|number} [props.height] CSS height
 * @param {boolean} [props.circle] renders a disc
 * @param {string} [props.radius] CSS border-radius override
 */
export function Skeleton({ width, height, circle = false, radius, className = '', style }) {
    const size = (value) => (typeof value === 'number' ? `${value}px` : value);
    return (
        <span
            className={`skeleton block ${circle ? 'skeleton-circle' : ''} ${className}`}
            style={{
                width: size(width),
                height: size(height),
                borderRadius: circle ? '9999px' : radius,
                ...style,
            }}
            aria-hidden="true"
        />
    );
}

/**
 * A paragraph of placeholder lines of alternating length.
 *
 * @param {Object} props
 * @param {number} [props.lines=3]
 * @param {string} [props.lastLineWidth='45%']
 */
export function SkeletonText({ lines = 3, lastLineWidth = '45%', className = '' }) {
    const widths = ['92%', '70%', '84%', '62%'];
    return (
        <div className={className} aria-hidden="true">
            {Array.from({ length: lines }, (_, index) => (
                <span
                    key={index}
                    className="skeleton skeleton-text block"
                    style={{ width: index === lines - 1 ? lastLineWidth : widths[index % widths.length] }}
                />
            ))}
        </div>
    );
}

/**
 * Placeholder for a Card / StatCard.
 *
 * @param {Object} props
 * @param {number} [props.lines=2]
 * @param {boolean} [props.withTitle=true]
 */
export function SkeletonCard({ lines = 2, withTitle = true, className = '' }) {
    return (
        <div
            className={`rounded-xl border border-[var(--becpg-blue-lighter)] bg-white p-4 shadow-[var(--becpg-shadow-raised)] ${className}`}
            aria-hidden="true"
        >
            {withTitle ? <span className="skeleton skeleton-title block" /> : null}
            <SkeletonText lines={lines} />
        </div>
    );
}

/**
 * Placeholder for a DataTable — a grid above md, stacked cards below.
 *
 * It draws the datagrid's *chrome* for real (the white card, the
 * `--becpg-blue-lighter` outline, the blue header row closed by the orange rule,
 * the zebra) and only shimmers the cells. The previous version was a bare grid of
 * grey bars, so the table visibly "arrived" and re-laid the page out on load;
 * now the frame is already in place and only the content fades in.
 *
 * @param {Object} props
 * @param {number} [props.rows=5]
 * @param {number} [props.columns=4]
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
    const template = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
    return (
        <div className={className} aria-hidden="true">
            <div className="hidden overflow-hidden rounded-xl border border-[var(--becpg-blue-lighter)] bg-white shadow-[var(--becpg-shadow-raised)] md:block">
                <div
                    className="grid gap-3 border-b-2 border-[var(--becpg-top-bar-border-color)] bg-[var(--becpg-blue)] px-3 py-3"
                    style={template}
                >
                    {Array.from({ length: columns }, (_, index) => (
                        <span
                            key={index}
                            className="block h-3 rounded-full bg-white/25"
                            style={{ width: '60%' }}
                        />
                    ))}
                </div>
                {Array.from({ length: rows }, (_, rowIndex) => (
                    <div
                        key={rowIndex}
                        className={`grid items-center gap-3 px-3 py-2 ${
                            rowIndex % 2 === 1 ? 'bg-[var(--becpg-row-zebra)]' : ''
                        }`}
                        style={template}
                    >
                        {Array.from({ length: columns }, (_, colIndex) => (
                            <span key={colIndex} className="skeleton skeleton-text block" />
                        ))}
                    </div>
                ))}
            </div>
            <div className="md:hidden">
                {Array.from({ length: Math.min(rows, 3) }, (_, index) => (
                    <SkeletonCard key={index} className="mb-3" lines={2} />
                ))}
            </div>
        </div>
    );
}

/**
 * Placeholder for a list of rows (tasks, documents, notifications).
 *
 * @param {Object} props
 * @param {number} [props.rows=4]
 * @param {boolean} [props.withAvatar=false]
 */
export function SkeletonList({ rows = 4, withAvatar = false, className = '' }) {
    return (
        <div className={className} aria-hidden="true">
            {Array.from({ length: rows }, (_, index) => (
                <div
                    key={index}
                    className="mb-2 flex items-center gap-3 rounded-lg border border-[var(--becpg-blue-lighter)] bg-white p-3"
                >
                    {withAvatar ? <Skeleton circle width={36} height={36} /> : null}
                    <div className="min-w-0 flex-1">
                        <span className="skeleton skeleton-text block" style={{ width: '55%' }} />
                        <span className="skeleton skeleton-text block" style={{ width: '30%' }} />
                    </div>
                    <Skeleton width={64} height={20} radius="9999px" />
                </div>
            ))}
        </div>
    );
}

/**
 * Wraps content in a live region while it loads: renders `fallback` when
 * `loading`, the children otherwise. Keeps `aria-busy` on a single node.
 *
 * @param {Object} props
 * @param {boolean} props.loading
 * @param {React.ReactNode} props.fallback
 */
export function Loading({ loading, fallback, children, className = '' }) {
    return (
        <div className={className} aria-busy={loading || undefined} aria-live="polite">
            {loading ? fallback : children}
        </div>
    );
}
