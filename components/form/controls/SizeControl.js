'use client';

/**
 * `size.ftl` — the size of a content, in bytes, **read-only by definition**.
 *
 * Worth stating plainly, because the name misleads: this is Alfresco's
 * `web-framework-commons` control that displays `Alfresco.util.formatFileSize`,
 * not a dimension editor. Its single parameter is `property`: when it is set,
 * the size is not the field's own value but is extracted from the *content URL*
 * of another property, which carries it as `…|size=12345|…`.
 *
 * There is no edit mode in the original template either — a file's size is a
 * consequence of the file, never something a supplier types. So this control
 * ignores `readOnly` on the way in: it is always read-only.
 *
 * Units are binary-prefixed decimal multiples, as Alfresco writes them (KB, MB,
 * GB), and the number is formatted in the user's language.
 */

import { controlParams } from '@/components/form/validation';
import { formatNumber } from '@/lib/format';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

/** Steps of the human-readable scale, as Alfresco's `formatFileSize` uses them. */
const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB'];

const LABELS = {
    fr: { bytes: 'octets' },
    en: { bytes: 'bytes' },
};

/**
 * `12345` → `"12,1 KB"`.
 *
 * @param {number|string} value a byte count
 * @param {string} [lang='fr']
 * @returns {string|null} null when the value is not a number
 *
 * @example
 * formatFileSize(1048576, 'en'); // "1 MB"
 */
export function formatFileSize(value, lang = 'fr') {
    const bytes = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (!Number.isFinite(bytes) || bytes < 0) {
        return null;
    }
    let size = bytes;
    let step = 0;
    while (size >= 1024 && step < UNITS.length - 1) {
        size /= 1024;
        step += 1;
    }
    const unit = step === 0 ? (LABELS[lang] || LABELS.fr).bytes : UNITS[step];
    const formatted = formatNumber(size, lang, { maximumFractionDigits: step === 0 ? 0 : 1 });
    return `${formatted} ${unit}`;
}

/**
 * Reads the size out of an Alfresco content URL.
 *
 * `contentUrl=store://…|mimetype=application/pdf|size=12345|encoding=UTF-8`
 *
 * @param {*} value the content property's value
 * @returns {number|null}
 */
export function sizeFromContentUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const match = value.match(/size=(\d+)/);
    return match ? Number(match[1]) : null;
}

/**
 * @param {import('./index').ControlProps} props
 */
export function SizeControl({ field, value, displayValue, values, lang = 'fr', id }) {
    const params = controlParams(field);

    let bytes = value;
    if (params.property) {
        // The size lives in another property's content URL.
        const key = String(params.property);
        const candidates = [key, `prop_${key.replace(/:/g, '_')}`, key.replace(/:/g, '_')];
        const found = candidates
            .map((candidate) => (values && Object.prototype.hasOwnProperty.call(values, candidate) ? values[candidate] : null))
            .find((entry) => entry !== null && entry !== undefined);
        bytes = sizeFromContentUrl(typeof found === 'object' && found ? found.value : found);
    }

    const formatted = formatFileSize(bytes, lang);
    return (
        <ReadOnlyControl
            field={field}
            value={null}
            displayValue={formatted || displayValue || ''}
            lang={lang}
            id={id}
        />
    );
}

SizeControl.alwaysReadOnly = true;
SizeControl.handlesRepeating = true;
