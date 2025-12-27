/**
 * Fluid Gradient Group Block - Save Component
 */

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const { enableFluid, fluidSettings, tagName, initialShapes } = attributes;
    const TagName = tagName || 'div';

    const blockProps = useBlockProps.save({
        className: `fgb-fluid-group ${enableFluid ? 'has-fluid-background' : ''}`,
        'data-fluid-enabled': enableFluid ? 'true' : 'false',
        'data-fluid-settings': enableFluid ? JSON.stringify(fluidSettings) : undefined,
        'data-initial-shapes': enableFluid && initialShapes?.length ? JSON.stringify(initialShapes) : undefined,
    });

    return (
        <TagName {...blockProps}>
            {enableFluid && <canvas className="fgb-fluid-canvas" />}
            <div className="fgb-fluid-content">
                <InnerBlocks.Content />
            </div>
        </TagName>
    );
}
