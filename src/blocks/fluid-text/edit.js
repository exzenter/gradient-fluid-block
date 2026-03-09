/**
 * Fluid Gradient Text Block - Editor Component
 */

import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InspectorControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    ToggleControl,
    RangeControl,
    SelectControl,
    TextControl,
    TextareaControl,
    Button,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

export default function Edit({ attributes, setAttributes }) {
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

    const updateFluidSetting = (key, value) => {
        setAttributes({
            fluidSettings: {
                ...fluidSettings,
                [key]: value,
            },
        });
    };

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

    // Build font-size CSS for preview
    let fontSizeCSS = fontSize;
    if (fontSizeMin && fontSizeMax) {
        fontSizeCSS = `clamp(${fontSizeMin}, ${fontSize}, ${fontSizeMax})`;
    }

    const previewStyle = {
        fontSize: fontSizeCSS,
        fontFamily,
        fontWeight,
        letterSpacing,
        lineHeight,
        textAlign,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };

    const blockProps = useBlockProps({
        className: 'fgb-fluid-text-editor',
    });

    return (
        <>
            <InspectorControls>
                {/* Text Settings */}
                <PanelBody title={__('Text', 'fluid-gradient-block')} initialOpen={true}>
                    <TextareaControl
                        label={__('Text Content', 'fluid-gradient-block')}
                        value={text}
                        onChange={(val) => setAttributes({ text: val })}
                        rows={3}
                    />
                    <SelectControl
                        label={__('Mode', 'fluid-gradient-block')}
                        value={textMode}
                        options={[
                            { label: __('Fill (Gradient on Text)', 'fluid-gradient-block'), value: 'fill' },
                            { label: __('Knockout (Text cuts out)', 'fluid-gradient-block'), value: 'knockout' },
                        ]}
                        onChange={(val) => setAttributes({ textMode: val })}
                    />
                </PanelBody>

                {/* Typography */}
                <PanelBody title={__('Typography', 'fluid-gradient-block')} initialOpen={true}>
                    <TextControl
                        label={__('Font Family', 'fluid-gradient-block')}
                        value={fontFamily}
                        onChange={(val) => setAttributes({ fontFamily: val })}
                        help={__('e.g. Inter, Arial, Georgia, sans-serif', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Font Weight', 'fluid-gradient-block')}
                        value={fontWeight}
                        onChange={(val) => setAttributes({ fontWeight: val })}
                        help={__('e.g. 400, 700, bold, 900', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Letter Spacing', 'fluid-gradient-block')}
                        value={letterSpacing}
                        onChange={(val) => setAttributes({ letterSpacing: val })}
                        help={__('e.g. 0px, 2px, -0.5px, 0.1em', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Font Size (preferred)', 'fluid-gradient-block')}
                        value={fontSize}
                        onChange={(val) => setAttributes({ fontSize: val })}
                        help={__('e.g. 5vw, 48px, 3rem', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Font Size Min (for clamp)', 'fluid-gradient-block')}
                        value={fontSizeMin}
                        onChange={(val) => setAttributes({ fontSizeMin: val })}
                        help={__('e.g. 24px, 1.5rem', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Font Size Max (for clamp)', 'fluid-gradient-block')}
                        value={fontSizeMax}
                        onChange={(val) => setAttributes({ fontSizeMax: val })}
                        help={__('e.g. 96px, 6rem', 'fluid-gradient-block')}
                    />
                    <TextControl
                        label={__('Line Height', 'fluid-gradient-block')}
                        value={lineHeight}
                        onChange={(val) => setAttributes({ lineHeight: val })}
                        help={__('e.g. 1.2, 1.5, normal', 'fluid-gradient-block')}
                    />
                    <SelectControl
                        label={__('Text Align', 'fluid-gradient-block')}
                        value={textAlign}
                        options={[
                            { label: __('Left', 'fluid-gradient-block'), value: 'left' },
                            { label: __('Center', 'fluid-gradient-block'), value: 'center' },
                            { label: __('Right', 'fluid-gradient-block'), value: 'right' },
                        ]}
                        onChange={(val) => setAttributes({ textAlign: val })}
                    />
                </PanelBody>

                {/* SEO / Accessibility */}
                <PanelBody title={__('SEO / Accessibility', 'fluid-gradient-block')} initialOpen={false}>
                    <ToggleControl
                        label={__('Enable Heading for SEO', 'fluid-gradient-block')}
                        checked={enableHeading}
                        onChange={(val) => setAttributes({ enableHeading: val })}
                        help={__('Adds a screen-reader-only heading element for SEO and accessibility.', 'fluid-gradient-block')}
                    />
                    {enableHeading && (
                        <SelectControl
                            label={__('Heading Level', 'fluid-gradient-block')}
                            value={headingLevel}
                            options={[
                                { label: 'H1', value: 'h1' },
                                { label: 'H2', value: 'h2' },
                                { label: 'H3', value: 'h3' },
                                { label: 'H4', value: 'h4' },
                                { label: 'H5', value: 'h5' },
                                { label: 'H6', value: 'h6' },
                            ]}
                            onChange={(val) => setAttributes({ headingLevel: val })}
                        />
                    )}
                </PanelBody>

                {/* Simulation Settings */}
                <PanelBody title={__('Simulation', 'fluid-gradient-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Sim Resolution', 'fluid-gradient-block')}
                        value={fluidSettings.simResolution}
                        onChange={(val) => updateFluidSetting('simResolution', val)}
                        min={32}
                        max={256}
                        step={1}
                    />
                    <RangeControl
                        label={__('Dye Resolution', 'fluid-gradient-block')}
                        value={fluidSettings.dyeResolution}
                        onChange={(val) => updateFluidSetting('dyeResolution', val)}
                        min={128}
                        max={2048}
                        step={1}
                    />
                </PanelBody>

                {/* Behavior */}
                <PanelBody title={__('Behavior', 'fluid-gradient-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Density Dissipation', 'fluid-gradient-block')}
                        value={fluidSettings.densityDissipation}
                        onChange={(val) => updateFluidSetting('densityDissipation', val)}
                        min={0.9}
                        max={0.9999}
                        step={0.0001}
                    />
                    <RangeControl
                        label={__('Velocity Dissipation', 'fluid-gradient-block')}
                        value={fluidSettings.velocityDissipation}
                        onChange={(val) => updateFluidSetting('velocityDissipation', val)}
                        min={0.9}
                        max={1.0}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Pressure', 'fluid-gradient-block')}
                        value={fluidSettings.pressure}
                        onChange={(val) => updateFluidSetting('pressure', val)}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Curl', 'fluid-gradient-block')}
                        value={fluidSettings.curl}
                        onChange={(val) => updateFluidSetting('curl', val)}
                        min={0}
                        max={100}
                        step={1}
                    />
                    <RangeControl
                        label={__('Fade Speed', 'fluid-gradient-block')}
                        value={fluidSettings.fadeSpeed}
                        onChange={(val) => updateFluidSetting('fadeSpeed', val)}
                        min={0}
                        max={20}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Animation Speed', 'fluid-gradient-block')}
                        value={fluidSettings.animationSpeed}
                        onChange={(val) => updateFluidSetting('animationSpeed', val)}
                        min={0}
                        max={5}
                        step={0.1}
                    />
                    <ToggleControl
                        label={__('Calm Down', 'fluid-gradient-block')}
                        checked={fluidSettings.calmDown}
                        onChange={(val) => updateFluidSetting('calmDown', val)}
                    />
                    {fluidSettings.calmDown && (
                        <>
                            <RangeControl
                                label={__('Calm Down Delay (ms)', 'fluid-gradient-block')}
                                value={fluidSettings.calmDownDelay}
                                onChange={(val) => updateFluidSetting('calmDownDelay', val)}
                                min={500}
                                max={10000}
                                step={100}
                            />
                            <RangeControl
                                label={__('Calm Down Strength', 'fluid-gradient-block')}
                                value={fluidSettings.calmDownStrength}
                                onChange={(val) => updateFluidSetting('calmDownStrength', val)}
                                min={0.5}
                                max={1}
                                step={0.01}
                            />
                        </>
                    )}
                </PanelBody>

                {/* Mouse Input */}
                <PanelBody title={__('Mouse Input', 'fluid-gradient-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Splat Radius', 'fluid-gradient-block')}
                        value={fluidSettings.splatRadius}
                        onChange={(val) => updateFluidSetting('splatRadius', val)}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Splat Force', 'fluid-gradient-block')}
                        value={fluidSettings.splatForce}
                        onChange={(val) => updateFluidSetting('splatForce', val)}
                        min={0}
                        max={20000}
                        step={100}
                    />
                    <RangeControl
                        label={__('Projection Distance', 'fluid-gradient-block')}
                        value={fluidSettings.projectionDistance}
                        onChange={(val) => updateFluidSetting('projectionDistance', val)}
                        min={0}
                        max={5}
                        step={0.1}
                    />
                </PanelBody>

                {/* Bloom */}
                <PanelBody title={__('Bloom Effect', 'fluid-gradient-block')} initialOpen={false}>
                    <ToggleControl
                        label={__('Enable Bloom', 'fluid-gradient-block')}
                        checked={fluidSettings.bloom}
                        onChange={(val) => updateFluidSetting('bloom', val)}
                    />
                    {fluidSettings.bloom && (
                        <>
                            <RangeControl
                                label={__('Bloom Intensity', 'fluid-gradient-block')}
                                value={fluidSettings.bloomIntensity}
                                onChange={(val) => updateFluidSetting('bloomIntensity', val)}
                                min={0}
                                max={3}
                                step={0.1}
                            />
                            <RangeControl
                                label={__('Bloom Threshold', 'fluid-gradient-block')}
                                value={fluidSettings.bloomThreshold}
                                onChange={(val) => updateFluidSetting('bloomThreshold', val)}
                                min={0}
                                max={1}
                                step={0.1}
                            />
                        </>
                    )}
                </PanelBody>

                {/* Colors */}
                <PanelBody title={__('Colors', 'fluid-gradient-block')} initialOpen={false}>
                    <RangeControl
                        label={__('Color Saturation', 'fluid-gradient-block')}
                        value={fluidSettings.colorSaturation}
                        onChange={(val) => updateFluidSetting('colorSaturation', val)}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Color Brightness', 'fluid-gradient-block')}
                        value={fluidSettings.colorBrightness}
                        onChange={(val) => updateFluidSetting('colorBrightness', val)}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <RangeControl
                        label={__('Saturation Boost', 'fluid-gradient-block')}
                        value={fluidSettings.saturationBoost}
                        onChange={(val) => updateFluidSetting('saturationBoost', val)}
                        min={0}
                        max={3}
                        step={0.1}
                    />
                    <SelectControl
                        label={__('Color Mode', 'fluid-gradient-block')}
                        value={fluidSettings.colorMode}
                        options={[
                            { label: __('Rainbow', 'fluid-gradient-block'), value: 'rainbow' },
                            { label: __('Hue Range', 'fluid-gradient-block'), value: 'huerange' },
                            { label: __('Gradient', 'fluid-gradient-block'), value: 'gradient' },
                            { label: __('Single Color', 'fluid-gradient-block'), value: 'single' },
                        ]}
                        onChange={(val) => updateFluidSetting('colorMode', val)}
                    />
                    {fluidSettings.colorMode === 'single' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}>
                                {__('Fixed Color', 'fluid-gradient-block')}
                            </label>
                            <input
                                type="color"
                                value={fluidSettings.fixedColor}
                                onChange={(e) => updateFluidSetting('fixedColor', e.target.value)}
                            />
                        </div>
                    )}
                    {fluidSettings.colorMode === 'huerange' && (
                        <>
                            <RangeControl
                                label={__('Hue Min', 'fluid-gradient-block')}
                                value={fluidSettings.hueMin}
                                onChange={(val) => updateFluidSetting('hueMin', val)}
                                min={0}
                                max={360}
                                step={1}
                            />
                            <RangeControl
                                label={__('Hue Max', 'fluid-gradient-block')}
                                value={fluidSettings.hueMax}
                                onChange={(val) => updateFluidSetting('hueMax', val)}
                                min={0}
                                max={360}
                                step={1}
                            />
                        </>
                    )}
                    {fluidSettings.colorMode === 'gradient' && (
                        <RangeControl
                            label={__('Gradient Speed', 'fluid-gradient-block')}
                            value={fluidSettings.gradientSpeed}
                            onChange={(val) => updateFluidSetting('gradientSpeed', val)}
                            min={0}
                            max={5}
                            step={0.1}
                        />
                    )}
                    <RangeControl
                        label={__('Color Change Distance', 'fluid-gradient-block')}
                        value={fluidSettings.colorChangeDistance}
                        onChange={(val) => updateFluidSetting('colorChangeDistance', val)}
                        min={0}
                        max={500}
                        step={1}
                    />
                    <ToggleControl
                        label={__('Dark Mode', 'fluid-gradient-block')}
                        checked={fluidSettings.darkMode}
                        onChange={(val) => updateFluidSetting('darkMode', val)}
                    />
                    <ToggleControl
                        label={__('Prevent Overblending', 'fluid-gradient-block')}
                        checked={fluidSettings.preventOverblending}
                        onChange={(val) => updateFluidSetting('preventOverblending', val)}
                    />
                    {fluidSettings.preventOverblending && (
                        <RangeControl
                            label={__('Max Color Intensity', 'fluid-gradient-block')}
                            value={fluidSettings.maxColorIntensity}
                            onChange={(val) => updateFluidSetting('maxColorIntensity', val)}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    )}
                </PanelBody>

                {/* Blend Mode */}
                <PanelBody title={__('Blend Mode', 'fluid-gradient-block')} initialOpen={false}>
                    <SelectControl
                        label={__('CSS Blend Mode', 'fluid-gradient-block')}
                        value={fluidSettings.blendMode}
                        options={[
                            { label: 'Normal', value: 'normal' },
                            { label: 'Screen', value: 'screen' },
                            { label: 'Multiply', value: 'multiply' },
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
                        onChange={(val) => updateFluidSetting('blendMode', val)}
                    />
                    <ToggleControl
                        label={__('Negative Bloom', 'fluid-gradient-block')}
                        checked={fluidSettings.negativeBloom}
                        onChange={(val) => updateFluidSetting('negativeBloom', val)}
                    />
                    <RangeControl
                        label={__('CSS Saturate (%)', 'fluid-gradient-block')}
                        value={fluidSettings.cssSaturate}
                        onChange={(val) => updateFluidSetting('cssSaturate', val)}
                        min={0}
                        max={300}
                        step={1}
                    />
                </PanelBody>
            </InspectorControls>

            <div {...blockProps}>
                <div className={`fgb-fluid-text-editor-preview ${textMode === 'knockout' ? 'mode-knockout' : ''}`}>
                    <span className="fgb-fluid-text-mode-label">
                        {textMode === 'fill' ? __('Fill', 'fluid-gradient-block') : __('Knockout', 'fluid-gradient-block')}
                    </span>
                    <div
                        className="fgb-fluid-text-editor-text"
                        style={previewStyle}
                    >
                        {text || __('Enter text...', 'fluid-gradient-block')}
                    </div>
                </div>
            </div>
        </>
    );
}
