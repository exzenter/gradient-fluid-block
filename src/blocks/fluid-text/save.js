/**
 * Fluid Gradient Text Block - Save Component
 */

import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const {
        text,
        textMode,
        fontFamily,
        fontWeight,
        letterSpacing,
        fontSize,
        fontSizeMin,
        fontSizeMax,
        lineHeight,
        textAlign,
        enableHeading,
        headingLevel,
        fluidSettings,
        initialShapes,
    } = attributes;

    const textSettings = {
        text,
        mode: textMode,
        fontFamily,
        fontWeight,
        letterSpacing,
        fontSize,
        fontSizeMin,
        fontSizeMax,
        lineHeight,
        textAlign,
    };

    // Build font-size CSS value
    let fontSizeCSS = fontSize;
    if (fontSizeMin && fontSizeMax) {
        fontSizeCSS = `clamp(${fontSizeMin}, ${fontSize}, ${fontSizeMax})`;
    }

    const sizerStyle = {
        fontSize: fontSizeCSS,
        fontFamily,
        fontWeight,
        letterSpacing,
        lineHeight,
        textAlign,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };

    const HeadingTag = headingLevel || 'h2';

    const blockProps = useBlockProps.save({
        className: `fgb-fluid-text fgb-fluid-text--${textMode}`,
        'data-fluid-enabled': 'true',
        'data-fluid-settings': JSON.stringify(fluidSettings),
        'data-text-settings': JSON.stringify(textSettings),
        'data-initial-shapes': initialShapes?.length ? JSON.stringify(initialShapes) : undefined,
    });

    return (
        <div {...blockProps}>
            <canvas className="fgb-fluid-text-canvas" aria-hidden="true" />
            <div className="fgb-fluid-text-sizer" style={sizerStyle} aria-hidden="true">
                {text}
            </div>
            {enableHeading && (
                <HeadingTag className="fgb-fluid-text-seo screen-reader-text">
                    {text}
                </HeadingTag>
            )}
        </div>
    );
}
