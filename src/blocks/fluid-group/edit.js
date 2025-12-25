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
} from '@wordpress/components';
import { useState, useRef, useEffect, createElement } from '@wordpress/element';

// Inline eye icon SVG (since @wordpress/icons may not be available)
const eyeIcon = createElement('svg', {
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24
}, createElement('path', {
    d: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'
}));

export default function Edit({ attributes, setAttributes }) {
    const { enableFluid, fluidSettings } = attributes;
    const [livePreview, setLivePreview] = useState(false);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

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

    // Get element interaction settings with defaults
    const elemInteraction = fluidSettings.elementInteraction || {};

    // Initialize fluid simulation when live preview is enabled
    useEffect(() => {
        let timeoutId;
        let cleanupFn = null;

        if (livePreview && enableFluid && canvasRef.current) {
            // Delay initialization to ensure canvas has proper dimensions
            timeoutId = setTimeout(() => {
                if (canvasRef.current) {
                    cleanupFn = initFluidSimulation(canvasRef.current, fluidSettings, animationRef);
                }
            }, 100);
        }

        return () => {
            // Cleanup timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Cleanup animation on unmount or when preview is disabled
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            // Additional cleanup if provided
            if (cleanupFn) {
                cleanupFn();
            }
        };
    }, [livePreview, enableFluid]);

    const blockProps = useBlockProps({
        className: `fgb-fluid-group ${enableFluid ? 'has-fluid-background' : ''}`,
    });

    return (
        <>
            {enableFluid && (
                <BlockControls>
                    <ToolbarGroup>
                        <ToolbarButton
                            icon={eyeIcon}
                            label={livePreview ? __('Stop Preview', 'fluid-gradient-block') : __('Live Preview', 'fluid-gradient-block')}
                            onClick={() => setLivePreview(!livePreview)}
                            isPressed={livePreview}
                        />
                    </ToolbarGroup>
                </BlockControls>
            )}

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
                            <RangeControl
                                label={__('Fade Speed', 'fluid-gradient-block')}
                                value={fluidSettings.fadeSpeed || 1}
                                onChange={(value) => updateFluidSetting('fadeSpeed', value)}
                                min={0.1}
                                max={3}
                                step={0.1}
                                help={__('How quickly colors fade out (higher = faster)', 'fluid-gradient-block')}
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
                            <ToggleControl
                                label={__('Hide Cursor', 'fluid-gradient-block')}
                                checked={fluidSettings.hideCursor}
                                onChange={(value) => updateFluidSetting('hideCursor', value)}
                                help={__('Hides the mouse cursor when hovering over the block', 'fluid-gradient-block')}
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
                    </>
                )}
            </InspectorControls>

            <div {...blockProps}>
                {enableFluid && livePreview && (
                    <canvas
                        ref={canvasRef}
                        className="fgb-fluid-canvas fgb-editor-canvas"
                        style={{
                            mixBlendMode: fluidSettings.blendMode || 'normal',
                            filter: fluidSettings.negativeBloom ? 'invert(1)' : 'none',
                        }}
                    />
                )}
                {enableFluid && !livePreview && (
                    <div className="fgb-fluid-preview">
                        <span>{__('Fluid Background Active (Click eye icon for preview)', 'fluid-gradient-block')}</span>
                    </div>
                )}
                <InnerBlocks
                    templateLock={false}
                    renderAppender={InnerBlocks.DefaultBlockAppender}
                />
            </div>
        </>
    );
}

/**
 * Minimal fluid simulation for editor preview
 */
function initFluidSimulation(canvas, userSettings, animationRef) {
    const config = {
        SIM_RESOLUTION: Math.min(userSettings.simResolution ?? 128, 64), // Lower res for editor
        DYE_RESOLUTION: Math.min(userSettings.dyeResolution ?? 1024, 512), // Lower res for editor
        DENSITY_DISSIPATION: userSettings.densityDissipation ?? 0.97,
        VELOCITY_DISSIPATION: userSettings.velocityDissipation ?? 0.98,
        PRESSURE: userSettings.pressure ?? 0.8,
        PRESSURE_ITERATIONS: 10, // Fewer iterations for editor
        CURL: userSettings.curl ?? 30,
        SPLAT_RADIUS: userSettings.splatRadius ?? 0.25,
        SPLAT_FORCE: userSettings.splatForce ?? 6000,
        PROJECTION_DISTANCE: userSettings.projectionDistance ?? 1,
        FADE_SPEED: userSettings.fadeSpeed ?? 1,
        BLOOM: false, // Disable bloom in editor for performance
        BLOOM_INTENSITY: 0,
        BLOOM_THRESHOLD: 0.6,
    };

    const colorSettings = {
        saturation: userSettings.colorSaturation ?? 1.0,
        brightness: userSettings.colorBrightness ?? 0.15,
        saturationBoost: userSettings.saturationBoost ?? 1.0,
        fixedColor: userSettings.fixedColor ?? '#ff00ff',
        rainbowMode: userSettings.rainbowMode !== false,
        preventOverblending: userSettings.preventOverblending ?? false,
        maxColorIntensity: userSettings.maxColorIntensity ?? 1.0,
        darkMode: userSettings.darkMode ?? false,
    };

    // Get WebGL context
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) {
        gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    }
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Resize canvas - use multiple methods to get dimensions
    const container = canvas.parentElement;
    const rect = canvas.getBoundingClientRect();

    // Try multiple ways to get dimensions
    let width = rect.width || container?.offsetWidth || container?.clientWidth || 400;
    let height = rect.height || container?.offsetHeight || container?.clientHeight || 200;

    // Minimum dimensions
    width = Math.max(width, 200);
    height = Math.max(height, 100);

    canvas.width = width;
    canvas.height = height;

    console.log('Editor preview canvas:', width, 'x', height);

    let halfFloat, formatRGBA, formatRG, formatR;
    if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        halfFloat = gl.HALF_FLOAT;
        formatRGBA = { internalFormat: gl.RGBA16F, format: gl.RGBA };
        formatRG = { internalFormat: gl.RG16F, format: gl.RG };
        formatR = { internalFormat: gl.R16F, format: gl.RED };
    } else {
        const ext = gl.getExtension('OES_texture_half_float');
        halfFloat = ext ? ext.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
        formatRGBA = formatRG = formatR = { internalFormat: gl.RGBA, format: gl.RGBA };
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Simple shaders
    const baseVS = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const displayFS = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main() {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

    const splatFS = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main() {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `;

    const clearFS = `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main() {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `;

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function createProgram(vs, fs) {
        const v = compileShader(gl.VERTEX_SHADER, vs);
        const f = compileShader(gl.FRAGMENT_SHADER, fs);
        if (!v || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, v);
        gl.attachShader(p, f);
        gl.linkProgram(p);
        const uniforms = {};
        const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const name = gl.getActiveUniform(p, i).name;
            uniforms[name] = gl.getUniformLocation(p, name);
        }
        return { program: p, uniforms };
    }

    const displayProg = createProgram(baseVS, displayFS);
    const splatProg = createProgram(baseVS, splatFS);
    const clearProg = createProgram(baseVS, clearFS);

    if (!displayProg || !splatProg || !clearProg) return;

    // Vertex buffer
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    function createFBO(w, h) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, formatRGBA.internalFormat, w, h, 0, formatRGBA.format, halfFloat, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { texture: tex, fbo, width: w, height: h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
    }

    function createDoubleFBO(w, h) {
        let f1 = createFBO(w, h), f2 = createFBO(w, h);
        return {
            get read() { return f1; },
            get write() { return f2; },
            swap() { const t = f1; f1 = f2; f2 = t; }
        };
    }

    const dyeRes = Math.min(config.DYE_RESOLUTION, canvas.width, canvas.height);
    const dye = createDoubleFBO(dyeRes, dyeRes);

    function blit(target) {
        if (!target) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function HSVtoRGB(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return { r, g, b };
    }

    function hexToRGB(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 0, b: 1 };
    }

    function generateColor() {
        let c;
        if (colorSettings.rainbowMode) {
            const sat = Math.min(colorSettings.saturation * colorSettings.saturationBoost, 1.0);
            c = HSVtoRGB(Math.random(), sat, 1.0);
        } else {
            c = hexToRGB(colorSettings.fixedColor);
        }
        c.r *= colorSettings.brightness;
        c.g *= colorSettings.brightness;
        c.b *= colorSettings.brightness;
        if (colorSettings.preventOverblending) {
            const max = colorSettings.maxColorIntensity;
            c.r = Math.min(c.r, max);
            c.g = Math.min(c.g, max);
            c.b = Math.min(c.b, max);
        }
        if (colorSettings.darkMode) {
            c.r = -c.r;
            c.g = -c.g;
            c.b = -c.b;
        }
        return c;
    }

    function splat(x, y, dx, dy, color) {
        gl.useProgram(splatProg.program);
        gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0));
        gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(splatProg.uniforms.point, x, y);
        gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b);
        gl.uniform1f(splatProg.uniforms.radius, config.SPLAT_RADIUS / 100);
        blit(dye.write);
        dye.swap();
    }

    // Mouse handling
    let pointer = { x: 0, y: 0, px: 0, py: 0, down: false };

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.x = (e.clientX - rect.left) / rect.width;
        pointer.y = 1 - (e.clientY - rect.top) / rect.height;
        const dx = (pointer.x - pointer.px) * config.SPLAT_FORCE * config.PROJECTION_DISTANCE;
        const dy = (pointer.y - pointer.py) * config.SPLAT_FORCE * config.PROJECTION_DISTANCE;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            splat(pointer.x, pointer.y, dx, dy, generateColor());
        }
    });

    // Animation loop
    function update() {
        // Apply dissipation
        gl.useProgram(clearProg.program);
        gl.uniform1i(clearProg.uniforms.uTexture, dye.read.attach(0));
        gl.uniform1f(clearProg.uniforms.value, config.DENSITY_DISSIPATION / config.FADE_SPEED);
        blit(dye.write);
        dye.swap();

        // Display
        gl.useProgram(displayProg.program);
        gl.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0));
        blit(null);

        animationRef.current = requestAnimationFrame(update);
    }

    update();
}
