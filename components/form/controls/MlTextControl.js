'use client';

/**
 * `d:mltext` — one value per language.
 *
 * A multilingual property is not a string: in the repository it is an `MLText`,
 * a map of locale → text, and a supplier who fills only the French box has not
 * filled the English one. Rendering it as a single input is how a translation
 * gets silently overwritten, so the control shows what it really is.
 *
 * Layout, in one line: **the current language first, the others folded**. The
 * language the user works in is always the first box, editable straight away;
 * the other languages are one tap away behind a counter. That keeps a form of
 * twenty multilingual fields readable on a 360px screen while never hiding the
 * fact that translations exist.
 *
 * Value in: a `{ locale: text }` map, or a plain string — which is read as the
 * current language, because that is what a repository upgrade or a legacy
 * import produces. Value out: **always** a map, which
 * `lib/adapters/forms.js#toFormValue` serialises for the form processor.
 *
 * The list of languages comes from the definition when it says something
 * (`locales` / `languages` control parameters), from the portal's own supported
 * languages otherwise, and always includes every locale the value already
 * carries — a language nobody configured but somebody translated must not
 * disappear.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { SUPPORTED_LANGS } from '@/config/messages';
import { controlParams, lengthBounds, toNumber } from '@/components/form/validation';
import { ReadOnlyControl } from '@/components/form/controls/ReadOnlyControl';

const LABELS = {
    fr: { more: '{count} autre(s) langue(s)', less: 'Masquer les autres langues' },
    en: { more: '{count} other language(s)', less: 'Hide the other languages' },
};

/**
 * Normalises any value into a `{ locale: text }` map.
 *
 * @param {*} value
 * @param {string} lang the current language, used when the value is a bare string
 * @returns {Object<string, string>}
 */
export function toLocaleMap(value, lang) {
    if (value === null || value === undefined || value === '') {
        return {};
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        if ('value' in value) {
            return toLocaleMap(value.value, lang);
        }
        const map = {};
        for (const [locale, text] of Object.entries(value)) {
            if (text !== null && text !== undefined) {
                map[locale] = String(text);
            }
        }
        return map;
    }
    const text = String(value);
    if (text.startsWith('{')) {
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return toLocaleMap(parsed, lang);
            }
        }
        catch {
            // A sentence that happens to start with a brace.
        }
    }
    return { [lang]: text };
}

/**
 * The languages to offer, current one first.
 *
 * @param {Object} field
 * @param {Object} valueMap
 * @param {string} lang
 * @returns {string[]}
 */
export function localesFor(field, valueMap, lang) {
    const params = controlParams(field);
    const declared = params.locales || params.languages;
    const configured = Array.isArray(declared)
        ? declared.map((entry) => String(entry))
        : typeof declared === 'string'
          ? declared.split(',').map((entry) => entry.trim()).filter(Boolean)
          : SUPPORTED_LANGS;

    const all = [...configured, ...Object.keys(valueMap || {})];
    const seen = new Set();
    const unique = [];
    for (const locale of all) {
        const key = String(locale);
        if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(key);
        }
    }

    const isCurrent = (locale) => String(locale).toLowerCase().replace('-', '_').startsWith(lang);
    const current = unique.filter(isCurrent);
    const others = unique.filter((locale) => !isCurrent(locale));
    return [...current, ...others];
}

/**
 * A human name for a locale code, with the code as the fallback.
 *
 * @param {string} locale
 * @param {string} lang
 * @returns {string}
 */
export function localeName(locale, lang) {
    const code = String(locale).replace('_', '-');
    try {
        const name = new Intl.DisplayNames([lang], { type: 'language' }).of(code);
        if (name && name.toLowerCase() !== code.toLowerCase()) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }
    catch {
        // Intl.DisplayNames is unavailable or the code is not a language tag.
    }
    return code.toUpperCase();
}

/**
 * One language box.
 *
 * @param {Object} props
 */
function LocaleInput({ locale, lang, text, rows, maxLength, invalid, onChange, id, autoFocus }) {
    const name = localeName(locale, lang);
    const shared = {
        id,
        value: text,
        onChange: (event) => onChange(event.target.value),
        maxLength,
        invalid,
        'aria-label': name,
        autoFocus,
    };
    return (
        <div className="flex items-start gap-2">
            <span
                className="mt-2 w-9 shrink-0 text-xs font-medium uppercase text-[var(--becpg-dark-grey)]"
                title={name}
            >
                {String(locale).slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
                {rows ? <Textarea rows={rows} {...shared} /> : <Input type="text" autoComplete="off" {...shared} />}
            </div>
        </div>
    );
}

/**
 * @param {import('./index').ControlProps} props
 */
export function MlTextControl({
    field,
    value,
    displayValue,
    onChange,
    readOnly = false,
    error,
    id,
    lang = 'fr',
    invalid = false,
    // Context props of the contract: never DOM attributes, so they are
    // consumed here rather than forwarded with `...rest`.
    values,
    formId,
    itemType,
    listId,
    entityNodeRef,
    ...rest
}) {
    const [expanded, setExpanded] = useState(false);
    const labels = LABELS[lang] || LABELS.fr;

    const map = toLocaleMap(value, lang);
    const locales = localesFor(field, map, lang);

    if (readOnly) {
        return <ReadOnlyControl field={field} value={value} displayValue={displayValue} lang={lang} id={id} />;
    }

    const params = controlParams(field);
    const configuredRows = toNumber(params.rows);
    const rows = configuredRows === null ? 0 : Math.max(2, Math.min(20, Math.round(configuredRows)));
    const maxLength = lengthBounds(field).max;

    const primary = locales[0];
    const others = locales.slice(1);
    const filledOthers = others.filter((locale) => map[locale]).length;

    const setLocale = (locale, text) => {
        const next = { ...map };
        if (text === '') {
            delete next[locale];
        }
        else {
            next[locale] = text;
        }
        onChange(next);
    };

    return (
        <div id={`${id}-group`} className="flex flex-col gap-2" {...rest}>
            {primary ? (
                <LocaleInput
                    id={id}
                    locale={primary}
                    lang={lang}
                    text={map[primary] || ''}
                    rows={rows}
                    maxLength={maxLength === null ? undefined : maxLength}
                    invalid={Boolean(error) || invalid}
                    onChange={(text) => setLocale(primary, text)}
                />
            ) : null}

            {others.length > 0 ? (
                <>
                    {expanded
                        ? others.map((locale) => (
                              <LocaleInput
                                  key={locale}
                                  id={`${id}-${locale}`}
                                  locale={locale}
                                  lang={lang}
                                  text={map[locale] || ''}
                                  rows={rows}
                                  maxLength={maxLength === null ? undefined : maxLength}
                                  invalid={false}
                                  onChange={(text) => setLocale(locale, text)}
                              />
                          ))
                        : null}
                    <button
                        type="button"
                        onClick={() => setExpanded((open) => !open)}
                        aria-expanded={expanded}
                        className="inline-flex items-center gap-1 self-start rounded-md px-1 py-1 text-xs text-[var(--becpg-blue-light)] hover:text-[var(--becpg-orange)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--becpg-orange)]"
                    >
                        <Icon name={expanded ? 'expand_less' : 'translate'} size={14} />
                        {expanded
                            ? labels.less
                            : labels.more.replace('{count}', String(others.length))}
                        {!expanded && filledOthers > 0 ? (
                            <span className="rounded-full bg-[var(--becpg-blue-lighter)] px-1.5 text-[10px] text-[var(--becpg-blue)]">
                                {filledOthers}
                            </span>
                        ) : null}
                    </button>
                </>
            ) : null}
        </div>
    );
}

MlTextControl.fullWidth = true;
