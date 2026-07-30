import pkg from '@/package.json';

// Liveness / readiness probe (Docker HEALTHCHECK, k8s startup+readiness+liveness).
// Deliberately cheap and dependency-free: it must answer even when beCPG, IDS or
// becpg-ai are down, otherwise a back end outage would roll the whole portal.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PORTAL_VERSION is stamped at build time by the Dockerfile / Cloud Build
// (`<_VERSION>-<short sha>`); package.json is the fallback for local runs.
const VERSION = process.env.PORTAL_VERSION || pkg.version || 'dev';

export async function GET() {
    return Response.json(
        {
            status: 'ok',
            version: VERSION
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
        }
    );
}

export async function HEAD() {
    return new Response(null, {
        status: 200,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
    });
}
