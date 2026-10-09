'use client';

/**
 * One ECharts chart, loaded on demand.
 *
 * ECharts (and ECharts GL for a 3D chart) is imported inside an effect, so it
 * never reaches the server bundle nor the supplier space: only a monitoring
 * screen that draws a chart downloads it. The chart is drawn without animation,
 * complete at rest, and redrawn when its container resizes.
 *
 * The option is built by a function that receives the resolved palette
 * (`readPalette()`) and the ECharts namespace, so a chart never hard-codes a
 * colour the design tokens already hold.
 */

import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { readPalette } from '@/components/monitor/cockpit/palette';

/** Text style every chart shares. */
const BASE_OPTION = Object.freeze({
    animation: false,
    textStyle: { fontFamily: 'Roboto, sans-serif' },
});

const STATUS = Object.freeze({ loading: 'loading', ready: 'ready', fallback: 'fallback', failed: 'failed' });

let echartsLoader = null;
let glLoader = null;

/** The ECharts namespace, imported once per page. */
function loadEcharts() {
    echartsLoader ??= import('echarts');
    return echartsLoader;
}

/** ECharts with the GL extension registered on it. */
function loadEchartsGl() {
    glLoader ??= loadEcharts().then(async (echarts) => {
        await import('echarts-gl');
        return echarts;
    });
    return glLoader;
}

/** Whether this browser can draw WebGL at all. */
function hasWebGl() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    }
    catch {
        return false;
    }
}

/**
 * Loads the library a chart needs: GL when asked and possible, 2D otherwise.
 *
 * @param {boolean} wantsGl
 * @returns {Promise<{echarts: Object, gl: boolean}>}
 */
async function loadLibrary(wantsGl) {
    if (wantsGl && hasWebGl()) {
        try {
            return { echarts: await loadEchartsGl(), gl: true };
        }
        catch (error) {
            console.warn('cockpit.chart: ECharts GL could not be loaded, drawing the 2D fallback', error?.message);
        }
    }
    return { echarts: await loadEcharts(), gl: false };
}

/**
 * Draws or redraws the chart on `node`.
 *
 * @returns {Object} the ECharts instance
 */
function draw({ node, instance, echarts, build }) {
    const chart = instance || echarts.init(node, null, { renderer: 'canvas' });
    chart.setOption({ ...BASE_OPTION, ...build(readPalette(), echarts) }, true);
    return chart;
}

/**
 * Keeps an ECharts instance on a node in step with `build`.
 *
 * @returns {string} one of {@link STATUS}
 */
function useEchart({ nodeRef, build, fallback, gl, onClick }) {
    const [status, setStatus] = useState(STATUS.loading);
    const instance = useRef(null);
    const click = useRef(onClick);

    useEffect(() => {
        click.current = onClick;
    });

    useEffect(() => {
        let cancelled = false;
        loadLibrary(gl)
            .then(({ echarts, gl: drawnInGl }) => {
                if (cancelled || !nodeRef.current) {
                    return;
                }
                const builder = gl && !drawnInGl ? fallback : build;
                if (!builder) {
                    setStatus(STATUS.failed);
                    return;
                }
                instance.current = draw({ node: nodeRef.current, instance: instance.current, echarts, build: builder });
                instance.current.off('click');
                instance.current.on('click', (event) => click.current?.(event));
                setStatus(gl && !drawnInGl ? STATUS.fallback : STATUS.ready);
            })
            .catch((error) => {
                console.error('cockpit.chart: ECharts could not be loaded', error?.message);
                if (!cancelled) {
                    setStatus(STATUS.failed);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [nodeRef, build, fallback, gl]);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => instance.current?.resize());
        observer.observe(node);
        return () => observer.disconnect();
    }, [nodeRef]);

    useEffect(() => () => {
        instance.current?.dispose();
        instance.current = null;
    }, []);

    return status;
}

/**
 * @param {Object} props
 * @param {(palette: Object, echarts: Object) => Object} props.build the ECharts
 *        option; keep it stable (module scope or `useCallback`) or the chart redraws
 *        on every render
 * @param {string} props.label accessible description of the chart
 * @param {number} [props.height=300] px
 * @param {boolean} [props.gl] draws with ECharts GL when WebGL is available
 * @param {Function} [props.fallback] 2D option builder used when `gl` cannot be honoured
 * @param {Function} [props.onClick] ECharts click event handler
 * @param {React.ReactNode} [props.failedLabel] shown when the library could not load
 */
export function Chart({ build, label, height = 300, gl = false, fallback, onClick, failedLabel, className = '' }) {
    const nodeRef = useRef(null);
    const status = useEchart({ nodeRef, build, fallback, gl, onClick });
    return (
        <div className={`relative ${className}`} style={{ height }}>
            <div ref={nodeRef} role="img" aria-label={label} className="h-full w-full" />
            {status === STATUS.loading ? (
                <Skeleton className="absolute inset-0" height="100%" radius="0.75rem" />
            ) : null}
            {status === STATUS.failed ? (
                <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-[var(--becpg-muted)]">
                    {failedLabel}
                </p>
            ) : null}
        </div>
    );
}
