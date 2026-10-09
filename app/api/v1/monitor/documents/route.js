/**
 * `GET /api/v1/monitor/documents` — the **supplier × document-type matrix**
 * (spec §4.6.3).
 *
 * This is the view quality teams print before an audit: one line per supplier,
 * one column per document type, and in each cell what the auditor asks for —
 * expected / provided / valid until / expired / refused.
 *
 * The matrix costs nothing to build because `DocumentFormulationHandler` already
 * materialises the expected documents on every entity (spec §5.4.2): a cell is a
 * row that exists, `bcpg:documentState = Simulation` meaning "expected, not
 * provided". An **empty cell is information too** — that document type does not
 * apply to that supplier, since beCPG only materialises the types that match.
 *
 * When several documents of the same type hang on one supplier (one per
 * product), the cell shows the **worst** of them: an auditor must see the
 * problem, not an average.
 *
 * Access: monitoring groups only, `ExternalUser` gets 403 (adapter-enforced).
 * Cost: 1 park query + 1 document scan + 1 entity → supplier join ≈ 3
 * queries, fixed. Filter by `documentType` to keep a large park inside the
 * scan window (`truncated: true` says when it did not fit).
 *
 * Query:
 *   - filters — `family`, `subFamily`, `site`, `subsidiary`, `market`,
 *     `state`, `q`
 *   - `documentType` — restrict to one `bcpg:documentTypeRef` nodeRef
 *   - `mandatoryOnly=true` — only `bcpg:documentIsMandatory`
 *   - `page`, `pageSize` (≤ 100)
 *   - `format=csv` — the printable export, one line per supplier of the whole
 *     matrix; `page` and `pageSize` are ignored
 *   - `refresh=true`
 *
 * @example
 * fetch('/api/v1/monitor/documents?mandatoryOnly=true');
 * fetch('/api/v1/monitor/documents?documentType=workspace://SpacesStore/…&format=csv');
 */

import { NextResponse } from 'next/server';
import {
    buildDocumentMatrix,
    documentMatrixToCsv,
    parseMonitorFilters,
    toCsv,
} from '@/lib/adapters/monitor';
import { AuthError, toApiResponse } from '@/lib/errors';
import { resolveLang } from '@/lib/lang';
import { getLiveSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, private' };

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function GET(request) {
    try {
        const session = await getLiveSession();
        if (!session) {
            throw new AuthError('No portal session');
        }

        const params = new URL(request.url).searchParams;
        const isCsv = String(params.get('format') || '').toLowerCase() === 'csv';

        const matrix = await buildDocumentMatrix({
            session,
            filters: parseMonitorFilters(params),
            documentType: params.get('documentType') || undefined,
            mandatoryOnly: params.get('mandatoryOnly') === 'true',
            page: params.get('page'),
            pageSize: params.get('pageSize'),
            // The export is the whole matrix, not a page of it.
            exportAll: isCsv,
            lang: await resolveLang(session),
            refresh: params.get('refresh') === 'true',
        });

        if (!isCsv) {
            return NextResponse.json(matrix, { status: 200, headers: NO_STORE });
        }

        const lang = await resolveLang();
        const { columns, rows } = documentMatrixToCsv(matrix, lang);
        const stamp = matrix.generatedAt.slice(0, 10);
        return new NextResponse(toCsv(columns, rows), {
            status: 200,
            headers: {
                ...NO_STORE,
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="document-compliance-${stamp}.csv"`,
                // Tells the UI the export was cut, so it can warn instead of
                // handing an auditor a silently incomplete file.
                'X-Portal-Truncated': String(
                    matrix.pagination.truncated || matrix.pagination.hasMoreItems,
                ),
            },
        });
    }
    catch (error) {
        return toApiResponse(error, { route: '/api/v1/monitor/documents', method: 'GET' });
    }
}
