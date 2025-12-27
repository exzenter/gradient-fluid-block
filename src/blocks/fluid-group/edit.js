/**
 * Fluid Gradient Group Block - Editor Component
 */

import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InnerBlocks,
    InspectorControls,
    BlockControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    ToggleControl,
    RangeControl,
    SelectControl,
    TextControl,
    ToolbarGroup,
    ToolbarButton,
    Button,
} from '@wordpress/components';
import { useState, createElement } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import InitialShapesModal from './components/InitialShapesModal';
import ScrollAnimationsModal from './components/ScrollAnimationsModal';

// Inline visibility icons
const visibilityIcon = createElement('svg', {
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24
}, createElement('path', {
    d: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'
}));

const visibilityOffIcon = createElement('svg', {
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24
}, createElement('path', {
    d: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'
}));

export default function Edit({ attributes, setAttributes, clientId }) {
    const { enableFluid, fluidSettings, initialShapes } = attributes;
    const [hideInEditor, setHideInEditor] = useState(false);
    const [shapesModalOpen, setShapesModalOpen] = useState(false);
    const [scrollModalOpen, setScrollModalOpen] = useState(false);

    // Check if block has inner blocks to apply compact mode
    const hasInnerBlocks = useSelect((select) => {
        const { getBlockOrder } = select('core/block-editor');
        return getBlockOrder(clientId).length > 0;
    }, [clientId]);

    // Compact mode: when block has no inner blocks, shrink to 200px to avoid editor issues
    const isCompactMode = !hasInnerBlocks;

    const updateFluidSetting = (key, value) => {
        setAttributes({
            fluidSettings: {
                ...fluidSettings,
                [key]: value,
            },
        });
    };

    // Helper for updating elementInteraction nested settings
    const updateElementInteraction = (key, value) => {
        setAttributes({
            fluidSettings: {
                ...fluidSettings,
                elementInteraction: {
                    ...fluidSettings.elementInteraction,
                    [key]: value,
                },
            },
        });
    };

    // Helper for updating scrollAnimations nested settings
    const updateScrollAnimations = (key, value) => {
        setAttributes({
            fluidSettings: {
                ...fluidSettings,
                scrollAnimations: {
                    ...fluidSettings.scrollAnimations,
                    [key]: value,
                },
            },
        });
    };

    // Get element interaction settings with defaults
    const elemInteraction = fluidSettings.elementInteraction || {};
    const scrollAnimations = fluidSettings.scrollAnimations || { enabled: false, rules: [] };

    const blockProps = useBlockProps({
        className: `fgb-fluid-group ${enableFluid ? 'has-fluid-background' : ''} ${hideInEditor ? 'fgb-hidden-in-editor' : ''} ${isCompactMode ? 'fgb-compact-mode' : ''}`,
        style: isCompactMode ? { height: '200px', minHeight: '200px', maxHeight: '200px' } : undefined,
    });

    return (
        <>
            <BlockControls>
                <ToolbarGroup>
                    <ToolbarButton
                        icon={hideInEditor ? visibilityOffIcon : visibilityIcon}
                        label={hideInEditor ? __('Show Block', 'fluid-gradient-block') : __('Hide Block', 'fluid-gradient-block')}
                        onClick={() => setHideInEditor(!hideInEditor)}
                        isPressed={hideInEditor}
                    />
                </ToolbarGroup>
            </BlockControls>

            <InspectorControls>
                <PanelBody title={__('Fluid Background', 'fluid-gradient-block')} initialOpen={true}>
                    <ToggleControl
                        label={__('Enable Fluid Dynamics', 'fluid-gradient-block')}
                        checked={enableFluid}
                        onChange={(value) => setAttributes({ enableFluid: value })}
                        help={enableFluid
                            ? __('WebGL fluid animation is enabled', 'fluid-gradient-block')
                            : __('Enable interactive fluid background', 'fluid-gradient-block')
                        }
                    />
                </PanelBody>

                {enableFluid && (
                    <>
                        <PanelBody title={__('Simulation', 'fluid-gradient-block')} initialOpen={false}>
                            <RangeControl
                                label={__('Simulation Resolution', 'fluid-gradient-block')}
                                value={fluidSettings.simResolution}
                                onChange={(value) => updateFluidSetting('simResolution', value)}
                                min={32}
                                max={256}
                                step={16}
                            />
                            <RangeControl
                                label={__('Dye Resolution', 'fluid-gradient-block')}
                                value={fluidSettings.dyeResolution}
                                onChange={(value) => updateFluidSetting('dyeResolution', value)}
                                min={256}
                                max={2048}
                                step={128}
                            />
                        </PanelBody>

                        <PanelBody title={__('Behavior', 'fluid-gradient-block')} initialOpen={false}>
                            <RangeControl
                                label={__('Density Dissipation', 'fluid-gradient-block')}
                                value={fluidSettings.densityDissipation}
                                onChange={(value) => updateFluidSetting('densityDissipation', value)}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Velocity Dissipation', 'fluid-gradient-block')}
                                value={fluidSettings.velocityDissipation}
                                onChange={(value) => updateFluidSetting('velocityDissipation', value)}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Pressure', 'fluid-gradient-block')}
                                value={fluidSettings.pressure}
                                onChange={(value) => updateFluidSetting('pressure', value)}
                                min={0}
                                max={1}
                                step={0.05}
                            />
                            <RangeControl
                                label={__('Curl (Vorticity)', 'fluid-gradient-block')}
                                value={fluidSettings.curl}
                                onChange={(value) => updateFluidSetting('curl', value)}
                                min={0}
                                max={100}
                            />
                            <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
                            <ToggleControl
                                label={__('Calm Down Mode', 'fluid-gradient-block')}
                                checked={fluidSettings.calmDown}
                                onChange={(value) => updateFluidSetting('calmDown', value)}
                                help={__('Reduce jiggle after period of no input', 'fluid-gradient-block')}
                            />
                            {fluidSettings.calmDown && (
                                <>
                                    <RangeControl
                                        label={__('Calm Down Delay (ms)', 'fluid-gradient-block')}
                                        value={fluidSettings.calmDownDelay ?? 2000}
                                        onChange={(value) => updateFluidSetting('calmDownDelay', value)}
                                        min={500}
                                        max={10000}
                                        step={500}
                                        help={__('Time after last input before calming starts', 'fluid-gradient-block')}
                                    />
                                    <RangeControl
                                        label={__('Damping Strength', 'fluid-gradient-block')}
                                        value={fluidSettings.calmDownStrength ?? 0.9}
                                        onChange={(value) => updateFluidSetting('calmDownStrength', value)}
                                        min={0.5}
                                        max={0.99}
                                        step={0.01}
                                        help={__('Lower = faster calming (more damping)', 'fluid-gradient-block')}
                                    />
                                </>
                            )}
                        </PanelBody>

                        <PanelBody title={__('Mouse Input', 'fluid-gradient-block')} initialOpen={false}>
                            <RangeControl
                                label={__('Splat Radius', 'fluid-gradient-block')}
                                value={fluidSettings.splatRadius}
                                onChange={(value) => updateFluidSetting('splatRadius', value)}
                                min={0.05}
                                max={1}
                                step={0.05}
                            />
                            <RangeControl
                                label={__('Splat Force', 'fluid-gradient-block')}
                                value={fluidSettings.splatForce}
                                onChange={(value) => updateFluidSetting('splatForce', value)}
                                min={0}
                                max={50000}
                                step={500}
                            />
                            <RangeControl
                                label={__('Projection Distance', 'fluid-gradient-block')}
                                value={fluidSettings.projectionDistance || 1}
                                onChange={(value) => updateFluidSetting('projectionDistance', value)}
                                min={0.5}
                                max={5}
                                step={0.25}
                                help={__('How far colors shoot in mouse direction', 'fluid-gradient-block')}
                            />
                        </PanelBody>

                        <PanelBody title={__('Bloom Effect', 'fluid-gradient-block')} initialOpen={false}>
                            <ToggleControl
                                label={__('Enable Bloom', 'fluid-gradient-block')}
                                checked={fluidSettings.bloom}
                                onChange={(value) => updateFluidSetting('bloom', value)}
                            />
                            {fluidSettings.bloom && (
                                <>
                                    <RangeControl
                                        label={__('Bloom Intensity', 'fluid-gradient-block')}
                                        value={fluidSettings.bloomIntensity}
                                        onChange={(value) => updateFluidSetting('bloomIntensity', value)}
                                        min={0}
                                        max={2}
                                        step={0.1}
                                    />
                                    <RangeControl
                                        label={__('Bloom Threshold', 'fluid-gradient-block')}
                                        value={fluidSettings.bloomThreshold}
                                        onChange={(value) => updateFluidSetting('bloomThreshold', value)}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                    />
                                </>
                            )}
                        </PanelBody>

                        <PanelBody title={__('Colors', 'fluid-gradient-block')} initialOpen={false}>
                            <RangeControl
                                label={__('Color Saturation', 'fluid-gradient-block')}
                                value={fluidSettings.colorSaturation}
                                onChange={(value) => updateFluidSetting('colorSaturation', value)}
                                min={0}
                                max={5}
                                step={0.1}
                            />
                            <RangeControl
                                label={__('Color Brightness', 'fluid-gradient-block')}
                                value={fluidSettings.colorBrightness}
                                onChange={(value) => updateFluidSetting('colorBrightness', value)}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                            <RangeControl
                                label={__('Saturation Boost', 'fluid-gradient-block')}
                                value={fluidSettings.saturationBoost || 1}
                                onChange={(value) => updateFluidSetting('saturationBoost', value)}
                                min={1}
                                max={3}
                                step={0.1}
                                help={__('Boost saturation for more vivid colors', 'fluid-gradient-block')}
                            />
                            <SelectControl
                                label={__('Color Mode', 'fluid-gradient-block')}
                                value={fluidSettings.colorMode || 'rainbow'}
                                options={[
                                    { label: 'Full Rainbow (Random)', value: 'rainbow' },
                                    { label: 'Limited Hue Range', value: 'huerange' },
                                    { label: 'Smooth Gradient', value: 'gradient' },
                                    { label: 'Single Color', value: 'single' },
                                ]}
                                onChange={(value) => {
                                    setAttributes({
                                        fluidSettings: {
                                            ...fluidSettings,
                                            colorMode: value,
                                            rainbowMode: value !== 'single',
                                        },
                                    });
                                }}
                            />
                            {(fluidSettings.colorMode === 'rainbow' || fluidSettings.colorMode === 'huerange' || !fluidSettings.colorMode) && (
                                <RangeControl
                                    label={__('Color Change Distance', 'fluid-gradient-block')}
                                    value={fluidSettings.colorChangeDistance || 0}
                                    onChange={(value) => updateFluidSetting('colorChangeDistance', value)}
                                    min={0}
                                    max={500}
                                    step={10}
                                    help={__('Pixels to move before new color (0 = every frame)', 'fluid-gradient-block')}
                                />
                            )}
                            {fluidSettings.colorMode === 'huerange' && (
                                <>
                                    <RangeControl
                                        label={__('Hue Min (°)', 'fluid-gradient-block')}
                                        value={fluidSettings.hueMin ?? 0}
                                        onChange={(value) => updateFluidSetting('hueMin', value)}
                                        min={0}
                                        max={360}
                                        step={5}
                                        help={__('0=Red, 60=Yellow, 120=Green, 180=Cyan, 240=Blue, 300=Magenta', 'fluid-gradient-block')}
                                    />
                                    <RangeControl
                                        label={__('Hue Max (°)', 'fluid-gradient-block')}
                                        value={fluidSettings.hueMax ?? 360}
                                        onChange={(value) => updateFluidSetting('hueMax', value)}
                                        min={0}
                                        max={360}
                                        step={5}
                                    />
                                </>
                            )}
                            {fluidSettings.colorMode === 'gradient' && (
                                <RangeControl
                                    label={__('Gradient Speed', 'fluid-gradient-block')}
                                    value={fluidSettings.gradientSpeed ?? 0.5}
                                    onChange={(value) => updateFluidSetting('gradientSpeed', value)}
                                    min={0.01}
                                    max={10}
                                    step={0.01}
                                    help={__('How fast colors shift through the spectrum', 'fluid-gradient-block')}
                                />
                            )}
                            {fluidSettings.colorMode === 'single' && (
                                <div className="components-base-control">
                                    <label className="components-base-control__label">
                                        {__('Fixed Color', 'fluid-gradient-block')}
                                    </label>
                                    <input
                                        type="color"
                                        value={fluidSettings.fixedColor || '#ff00ff'}
                                        onChange={(e) => updateFluidSetting('fixedColor', e.target.value)}
                                        style={{ width: '100%', height: '36px', cursor: 'pointer' }}
                                    />
                                </div>
                            )}
                            <ToggleControl
                                label={__('Prevent Overblending', 'fluid-gradient-block')}
                                checked={fluidSettings.preventOverblending}
                                onChange={(value) => updateFluidSetting('preventOverblending', value)}
                                help={__('Clamps max color intensity to prevent white-out', 'fluid-gradient-block')}
                            />
                            {fluidSettings.preventOverblending && (
                                <RangeControl
                                    label={__('Max Color Intensity', 'fluid-gradient-block')}
                                    value={fluidSettings.maxColorIntensity || 1}
                                    onChange={(value) => updateFluidSetting('maxColorIntensity', value)}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                            )}
                            <ToggleControl
                                label={__('Dark Fluid Mode', 'fluid-gradient-block')}
                                checked={fluidSettings.darkMode}
                                onChange={(value) => updateFluidSetting('darkMode', value)}
                                help={__('Creates dark fluid effect (use with light background)', 'fluid-gradient-block')}
                            />
                            <RangeControl
                                label={__('Fade Speed', 'fluid-gradient-block')}
                                value={fluidSettings.fadeSpeed || 1}
                                onChange={(value) => updateFluidSetting('fadeSpeed', value)}
                                min={0.01}
                                max={15}
                                step={0.01}
                                help={__('How quickly colors fade out (higher = faster)', 'fluid-gradient-block')}
                            />
                            <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
                            <SelectControl
                                label={__('Cursor Mode', 'fluid-gradient-block')}
                                value={fluidSettings.cursorMode || 'default'}
                                options={[
                                    { label: 'Default', value: 'default' },
                                    { label: 'Hidden', value: 'hidden' },
                                    { label: 'Dot', value: 'dot' },
                                    { label: 'Crosshair', value: 'crosshair' },
                                ]}
                                onChange={(value) => updateFluidSetting('cursorMode', value)}
                                help={__('Choose how the cursor appears over the block', 'fluid-gradient-block')}
                            />
                            {fluidSettings.cursorMode === 'dot' && (
                                <>
                                    <RangeControl
                                        label={__('Dot Size', 'fluid-gradient-block')}
                                        value={fluidSettings.dotCursor?.size ?? 10}
                                        onChange={(value) => setAttributes({
                                            fluidSettings: {
                                                ...fluidSettings,
                                                dotCursor: { ...fluidSettings.dotCursor, size: value }
                                            }
                                        })}
                                        min={4}
                                        max={50}
                                        step={2}
                                    />
                                    <div className="components-base-control">
                                        <label className="components-base-control__label">
                                            {__('Dot Color', 'fluid-gradient-block')}
                                        </label>
                                        <input
                                            type="color"
                                            value={fluidSettings.dotCursor?.color || '#ffffff'}
                                            onChange={(e) => setAttributes({
                                                fluidSettings: {
                                                    ...fluidSettings,
                                                    dotCursor: { ...fluidSettings.dotCursor, color: e.target.value }
                                                }
                                            })}
                                            style={{ width: '100%', height: '36px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </>
                            )}
                            {fluidSettings.cursorMode === 'crosshair' && (
                                <>
                                    <RangeControl
                                        label={__('Line Thickness', 'fluid-gradient-block')}
                                        value={fluidSettings.crosshairCursor?.thickness ?? 1}
                                        onChange={(value) => setAttributes({
                                            fluidSettings: {
                                                ...fluidSettings,
                                                crosshairCursor: { ...fluidSettings.crosshairCursor, thickness: value }
                                            }
                                        })}
                                        min={1}
                                        max={10}
                                        step={1}
                                    />
                                    <div className="components-base-control">
                                        <label className="components-base-control__label">
                                            {__('Line Color', 'fluid-gradient-block')}
                                        </label>
                                        <input
                                            type="color"
                                            value={fluidSettings.crosshairCursor?.color || '#ffffff'}
                                            onChange={(e) => setAttributes({
                                                fluidSettings: {
                                                    ...fluidSettings,
                                                    crosshairCursor: { ...fluidSettings.crosshairCursor, color: e.target.value }
                                                }
                                            })}
                                            style={{ width: '100%', height: '36px', cursor: 'pointer' }}
                                        />
                                    </div>
                                </>
                            )}
                            <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
                            <ToggleControl
                                label={__('Sibling Hover Mode', 'fluid-gradient-block')}
                                checked={fluidSettings.siblingHoverMode}
                                onChange={(value) => updateFluidSetting('siblingHoverMode', value)}
                                help={__('Track mouse through overlapping sibling elements. Use when content is placed outside the block but visually overlays it (e.g., sticky layouts).', 'fluid-gradient-block')}
                            />
                        </PanelBody>

                        <PanelBody title={__('Blend Mode', 'fluid-gradient-block')} initialOpen={false}>
                            <SelectControl
                                label={__('Canvas Blend Mode', 'fluid-gradient-block')}
                                value={fluidSettings.blendMode || 'normal'}
                                options={[
                                    { label: 'Normal', value: 'normal' },
                                    { label: 'Multiply', value: 'multiply' },
                                    { label: 'Screen', value: 'screen' },
                                    { label: 'Overlay', value: 'overlay' },
                                    { label: 'Darken', value: 'darken' },
                                    { label: 'Lighten', value: 'lighten' },
                                    { label: 'Color Dodge', value: 'color-dodge' },
                                    { label: 'Color Burn', value: 'color-burn' },
                                    { label: 'Hard Light', value: 'hard-light' },
                                    { label: 'Soft Light', value: 'soft-light' },
                                    { label: 'Difference', value: 'difference' },
                                    { label: 'Exclusion', value: 'exclusion' },
                                    { label: 'Hue', value: 'hue' },
                                    { label: 'Saturation', value: 'saturation' },
                                    { label: 'Color', value: 'color' },
                                    { label: 'Luminosity', value: 'luminosity' },
                                ]}
                                onChange={(value) => updateFluidSetting('blendMode', value)}
                            />
                            <ToggleControl
                                label={__('Negative Bloom', 'fluid-gradient-block')}
                                checked={fluidSettings.negativeBloom}
                                onChange={(value) => updateFluidSetting('negativeBloom', value)}
                                help={__('Inverts colors for a dark glow effect', 'fluid-gradient-block')}
                            />
                        </PanelBody>

                        <PanelBody title={__('Element Interaction', 'fluid-gradient-block')} initialOpen={false}>
                            <ToggleControl
                                label={__('Enable Element Interaction', 'fluid-gradient-block')}
                                checked={elemInteraction.enabled}
                                onChange={(value) => updateElementInteraction('enabled', value)}
                                help={__('Allow DOM elements to interact with fluid', 'fluid-gradient-block')}
                            />
                            {elemInteraction.enabled && (
                                <>
                                    <TextControl
                                        label={__('CSS Selectors', 'fluid-gradient-block')}
                                        value={elemInteraction.selectors || ''}
                                        onChange={(value) => updateElementInteraction('selectors', value)}
                                        placeholder=".my-class, #my-id"
                                        help={__('Comma-separated CSS selectors for interacting elements', 'fluid-gradient-block')}
                                    />
                                    <ToggleControl
                                        label={__('Track on Scroll', 'fluid-gradient-block')}
                                        checked={elemInteraction.trackScroll}
                                        onChange={(value) => updateElementInteraction('trackScroll', value)}
                                        help={__('Update element positions on page scroll', 'fluid-gradient-block')}
                                    />
                                    <SelectControl
                                        label={__('Interaction Mode', 'fluid-gradient-block')}
                                        value={elemInteraction.mode || 'hardCorner'}
                                        options={[
                                            { label: 'Hard Corner (Blocks fluid)', value: 'hardCorner' },
                                            { label: 'Soft Edge (Gradual fade)', value: 'softEdge' },
                                            { label: 'Force Field (Repels fluid)', value: 'forceField' },
                                            { label: 'Attract Field (Pulls fluid)', value: 'attractField' },
                                            { label: 'Turbulence (Creates swirls)', value: 'turbulence' },
                                        ]}
                                        onChange={(value) => updateElementInteraction('mode', value)}
                                    />
                                    {elemInteraction.mode === 'softEdge' && (
                                        <RangeControl
                                            label={__('Soft Edge Radius', 'fluid-gradient-block')}
                                            value={elemInteraction.softEdgeRadius ?? 20}
                                            onChange={(value) => updateElementInteraction('softEdgeRadius', value)}
                                            min={5}
                                            max={100}
                                            step={5}
                                            help={__('Fade distance in pixels', 'fluid-gradient-block')}
                                        />
                                    )}
                                    {elemInteraction.mode === 'forceField' && (
                                        <>
                                            <RangeControl
                                                label={__('Force Strength', 'fluid-gradient-block')}
                                                value={elemInteraction.forceFieldStrength ?? 50}
                                                onChange={(value) => updateElementInteraction('forceFieldStrength', value)}
                                                min={10}
                                                max={200}
                                                step={10}
                                            />
                                            <RangeControl
                                                label={__('Force Radius', 'fluid-gradient-block')}
                                                value={elemInteraction.forceFieldRadius ?? 80}
                                                onChange={(value) => updateElementInteraction('forceFieldRadius', value)}
                                                min={20}
                                                max={300}
                                                step={10}
                                                help={__('Distance of force effect in pixels', 'fluid-gradient-block')}
                                            />
                                        </>
                                    )}
                                    {elemInteraction.mode === 'attractField' && (
                                        <>
                                            <RangeControl
                                                label={__('Attract Strength', 'fluid-gradient-block')}
                                                value={elemInteraction.attractFieldStrength ?? 50}
                                                onChange={(value) => updateElementInteraction('attractFieldStrength', value)}
                                                min={10}
                                                max={200}
                                                step={10}
                                            />
                                            <RangeControl
                                                label={__('Attract Radius', 'fluid-gradient-block')}
                                                value={elemInteraction.attractFieldRadius ?? 80}
                                                onChange={(value) => updateElementInteraction('attractFieldRadius', value)}
                                                min={20}
                                                max={300}
                                                step={10}
                                            />
                                        </>
                                    )}
                                    {elemInteraction.mode === 'turbulence' && (
                                        <>
                                            <RangeControl
                                                label={__('Turbulence Intensity', 'fluid-gradient-block')}
                                                value={elemInteraction.turbulenceIntensity ?? 30}
                                                onChange={(value) => updateElementInteraction('turbulenceIntensity', value)}
                                                min={5}
                                                max={100}
                                                step={5}
                                            />
                                            <RangeControl
                                                label={__('Turbulence Scale', 'fluid-gradient-block')}
                                                value={elemInteraction.turbulenceScale ?? 50}
                                                onChange={(value) => updateElementInteraction('turbulenceScale', value)}
                                                min={10}
                                                max={200}
                                                step={10}
                                            />
                                        </>
                                    )}
                                    <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
                                    <ToggleControl
                                        label={__('Affect New Splats', 'fluid-gradient-block')}
                                        checked={elemInteraction.affectNewSplats !== false}
                                        onChange={(value) => updateElementInteraction('affectNewSplats', value)}
                                        help={__('Apply effects to new fluid being created', 'fluid-gradient-block')}
                                    />
                                    <ToggleControl
                                        label={__('Affect Existing Fluid', 'fluid-gradient-block')}
                                        checked={elemInteraction.affectExistingFluid}
                                        onChange={(value) => updateElementInteraction('affectExistingFluid', value)}
                                        help={__('Apply effects to fluid already on canvas', 'fluid-gradient-block')}
                                    />
                                    <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
                                    <ToggleControl
                                        label={__('Edge Glow', 'fluid-gradient-block')}
                                        checked={elemInteraction.edgeGlow}
                                        onChange={(value) => updateElementInteraction('edgeGlow', value)}
                                        help={__('Add a color glow around element edges', 'fluid-gradient-block')}
                                    />
                                    {elemInteraction.edgeGlow && (
                                        <>
                                            <RangeControl
                                                label={__('Glow Intensity', 'fluid-gradient-block')}
                                                value={elemInteraction.edgeGlowIntensity ?? 0.5}
                                                onChange={(value) => updateElementInteraction('edgeGlowIntensity', value)}
                                                min={0.1}
                                                max={2}
                                                step={0.1}
                                            />
                                            <RangeControl
                                                label={__('Glow Distance', 'fluid-gradient-block')}
                                                value={elemInteraction.edgeGlowDistance ?? 15}
                                                onChange={(value) => updateElementInteraction('edgeGlowDistance', value)}
                                                min={5}
                                                max={50}
                                                step={5}
                                            />
                                            <ToggleControl
                                                label={__('Match Fluid Colors', 'fluid-gradient-block')}
                                                checked={elemInteraction.edgeGlowMatchFluid}
                                                onChange={(value) => updateElementInteraction('edgeGlowMatchFluid', value)}
                                            />
                                            {!elemInteraction.edgeGlowMatchFluid && (
                                                <div className="components-base-control">
                                                    <label className="components-base-control__label">
                                                        {__('Glow Color', 'fluid-gradient-block')}
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={elemInteraction.edgeGlowColor || '#ffffff'}
                                                        onChange={(e) => updateElementInteraction('edgeGlowColor', e.target.value)}
                                                        style={{ width: '100%', height: '36px', cursor: 'pointer' }}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </PanelBody>

                        <PanelBody title={__('Scroll Animations', 'fluid-gradient-block')} initialOpen={false}>
                            <p style={{ fontSize: '12px', color: '#757575', marginBottom: '12px' }}>
                                {__('Animate fluid settings based on page scroll position.', 'fluid-gradient-block')}
                            </p>
                            <ToggleControl
                                label={__('Enable Scroll Animations', 'fluid-gradient-block')}
                                checked={scrollAnimations.enabled}
                                onChange={(value) => updateScrollAnimations('enabled', value)}
                            />
                            <RangeControl
                                label={__('CSS Saturate Filter (%)', 'fluid-gradient-block')}
                                value={fluidSettings.cssSaturate ?? 100}
                                onChange={(value) => updateFluidSetting('cssSaturate', value)}
                                min={0}
                                max={300}
                                step={5}
                                help={__('Apply CSS saturate filter to canvas colors', 'fluid-gradient-block')}
                            />
                            <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                                <strong>{scrollAnimations.rules?.length || 0}</strong> {__('animation rule(s) configured', 'fluid-gradient-block')}
                            </p>
                            <Button
                                variant="secondary"
                                onClick={() => setScrollModalOpen(true)}
                                style={{ width: '100%' }}
                            >
                                {__('Edit Animation Rules', 'fluid-gradient-block')}
                            </Button>
                        </PanelBody>

                        <PanelBody title={__('Initial Shapes', 'fluid-gradient-block')} initialOpen={false}>
                            <p style={{ fontSize: '12px', color: '#757575', marginBottom: '12px' }}>
                                {__('Configure shapes that fire on page load to create dynamic starting patterns.', 'fluid-gradient-block')}
                            </p>
                            <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                                <strong>{(initialShapes || []).length}</strong> {__('shape(s) configured', 'fluid-gradient-block')}
                            </p>
                            <Button
                                variant="secondary"
                                onClick={() => setShapesModalOpen(true)}
                                style={{ width: '100%' }}
                            >
                                {__('Edit Initial Shapes', 'fluid-gradient-block')}
                            </Button>
                        </PanelBody>
                    </>
                )}
            </InspectorControls>

            <InitialShapesModal
                isOpen={shapesModalOpen}
                onClose={() => setShapesModalOpen(false)}
                shapes={initialShapes || []}
                onSave={(shapes) => setAttributes({ initialShapes: shapes })}
            />

            <ScrollAnimationsModal
                isOpen={scrollModalOpen}
                onClose={() => setScrollModalOpen(false)}
                scrollAnimations={scrollAnimations}
                fluidSettings={fluidSettings}
                onSave={(animations) => setAttributes({
                    fluidSettings: {
                        ...fluidSettings,
                        scrollAnimations: animations,
                    }
                })}
            />

            <div {...blockProps}>
                {hideInEditor ? (
                    <div className="fgb-collapsed-placeholder">
                        <span>{__('Fluid Gradient Group (hidden)', 'fluid-gradient-block')}</span>
                        <button
                            type="button"
                            className="fgb-show-button"
                            onClick={() => setHideInEditor(false)}
                        >
                            {__('Show', 'fluid-gradient-block')}
                        </button>
                    </div>
                ) : (
                    <>
                        {enableFluid && (
                            <div className="fgb-fluid-preview">
                                <span>{__('Fluid Background Active', 'fluid-gradient-block')}</span>
                            </div>
                        )}
                        <InnerBlocks
                            templateLock={false}
                            renderAppender={InnerBlocks.DefaultBlockAppender}
                        />
                    </>
                )}
            </div>
        </>
    );
}

