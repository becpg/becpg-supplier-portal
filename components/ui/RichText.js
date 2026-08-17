'use client';

/**
 * Renders text that was authored in Share — a comment, a note, a requirement
 * message — as the structure its markup described, never as HTML.
 *
 * beCPG stores these bodies as HTML: Alfresco's comment editor wraps everything
 * in `<p>`, and a note authored in Share carries `<br>`, `<b>` and `<ul>`. Put
 * straight into a React text node, that reaches the screen as the literal string
 * `<p>T1</p>`, which is exactly what a supplier saw in the discussion panel and
 * in "Remarques de votre client".
 *
 * The fix is deliberately *not* `dangerouslySetInnerHTML`. There is none in this
 * codebase, and a panel that displays content written by another party — the
 * customer, or another supplier's user — is the last place to introduce one:
 * every one of these strings is untrusted repository content. So
 * {@link richTextLines} turns the markup into lines, bullets and a closed set of
 * inline marks — bold, italic, underline, a validated colour — and this
 * component renders those as real elements. A customer who colours a question
 * title in Share keeps his colour here; a customer who writes a `<script>` keeps
 * nothing.
 *
 * @param {Object} props
 * @param {string|null} props.value the stored body, HTML or plain
 * @param {string} [props.className] applied to the wrapper
 * @param {string} [props.emptyText] rendered when there is nothing to show;
 *        omit to render nothing at all
 * @param {boolean} [props.inline] render phrasing content only, for a `<legend>`
 *        or a `<label>` where a paragraph would be invalid markup
 *
 * @example
 * <RichText value={message.content} className="text-sm" />
 */

import { richTextLines } from '@/lib/format';

/**
 * One run of text with the marks that were open around it.
 *
 * `<strong>` / `<em>` / `<u>` are real elements rather than classes: they carry
 * the emphasis to a screen reader too, which a `font-weight` would not. The
 * colour goes through React's `style` — never a stylesheet string — and
 * {@link richTextLines} has already refused anything that is not a plain colour
 * value.
 */
function Span({ span }) {
    let node = span.text;
    if (span.bold) {
        node = <strong>{node}</strong>;
    }
    if (span.italic) {
        node = <em>{node}</em>;
    }
    if (span.underline) {
        node = <u>{node}</u>;
    }
    return span.color ? <span style={{ color: span.color }}>{node}</span> : node;
}

/** The runs of a line, or its plain text when nothing is marked. */
function Line({ line }) {
    if (!Array.isArray(line.spans) || line.spans.length === 0) {
        return line.text;
    }
    return line.spans.map((span, index) => <Span key={index} span={span} />);
}

export function RichText({ value, className = '', emptyText = null, inline = false }) {
    const lines = richTextLines(value);

    if (lines.length === 0) {
        return emptyText ? <p className={className}>{emptyText}</p> : null;
    }

    /*
     * `inline` exists for the places where a paragraph is invalid markup — a
     * `<legend>`, a `<label>`, a table cell that must stay on one line. Same
     * marks, no block element, lines joined by a space.
     */
    if (inline) {
        return (
            <span className={className}>
                {lines.map((line, index) => (
                    <span key={index}>
                        {index > 0 ? ' ' : null}
                        <Line line={line} />
                    </span>
                ))}
            </span>
        );
    }

    return (
        <div className={className}>
            {lines.map((line, index) =>
                line.bullet ? (
                    <p key={index} className="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span className="min-w-0 break-words"><Line line={line} /></span>
                    </p>
                ) : (
                    <p key={index} className="break-words">
                        <Line line={line} />
                    </p>
                ),
            )}
        </div>
    );
}
