'use client';

/**
 * The colours of the cockpit charts, named by meaning and resolved from the CSS
 * tokens of `app/globals.css`. ECharts draws on a canvas and cannot read a CSS
 * variable, so the tokens are read once from the document and handed over as
 * plain colours; the HTML legends use the variables themselves, so a legend
 * swatch and its series can never drift apart.
 */

/** Meaning to CSS token. */
export const TOKENS = Object.freeze({
    ink: '--becpg-ink',
    muted: '--becpg-muted',
    line: '--becpg-line',
    grey: '--becpg-grey',
    surface: '--becpg-page-surface',
    blue: '--becpg-blue',
    blueLight: '--becpg-blue-light',
    teal: '--becpg-teal',
    tealLight: '--becpg-teal-light',
    orange: '--becpg-orange',
    orangeDeep: '--becpg-orange-deep',
    ok: '--status-ok',
    warn: '--status-warn',
    danger: '--status-danger',
    neutral: '--becpg-field-border',
    darkGrey: '--becpg-darkGrey',
});

/** Approval status to colour meaning. */
export const APPROVAL_TONES = Object.freeze({
    approved: 'ok',
    inProgress: 'tealLight',
    toRenew: 'orange',
    suspended: 'danger',
});

/** Document status to colour meaning. */
export const DOCUMENT_TONES = Object.freeze({
    valid: 'ok',
    expiring: 'teal',
    toValidate: 'blueLight',
    expired: 'orange',
    refused: 'warn',
    missing: 'danger',
});

/** Cube task state to colour meaning; an unknown state is drawn neutral. */
export const TASK_STATE_TONES = Object.freeze({
    planned: 'blueLight',
    inProgress: 'teal',
    completed: 'ok',
    cancelled: 'neutral',
    refused: 'danger',
    onHold: 'warn',
});

/** Categorical colours of the supplier families, cycled when there are more. */
export const FAMILY_TONES = Object.freeze(['teal', 'blueLight', 'blue', 'tealLight', 'neutral', 'darkGrey']);

/**
 * The CSS `var()` of a colour meaning, for HTML swatches.
 *
 * @param {string} tone a key of {@link TOKENS}
 * @returns {string}
 */
export function cssVar(tone) {
    return `var(${TOKENS[tone] || TOKENS.neutral})`;
}

/**
 * Every colour meaning resolved against the document, for the canvas.
 *
 * @returns {Object.<string, string>} meaning to colour
 */
export function readPalette() {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(Object.entries(TOKENS).map(([tone, token]) => [tone, style.getPropertyValue(token).trim()]));
}

/**
 * The colour meaning of the n-th family.
 *
 * @param {number} index
 * @returns {string}
 */
export function familyTone(index) {
    return FAMILY_TONES[index % FAMILY_TONES.length];
}
