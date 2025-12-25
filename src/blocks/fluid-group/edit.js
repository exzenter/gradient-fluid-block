/**
 * Fluid Gradient Group Block - Editor Component
 */

import { __ } from '@wordpress/i18n';
import {
    useBlockProps,
    InnerBlocks,
    InspectorControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    ToggleControl,
    RangeControl,
    SelectControl,
    Button,
    TextareaControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

const PRESETS = [
    { label: 'Default', value: 'default' },
    { label: 'Dreamy', value: 'dreamy' },
    { label: 'Intense', value: 'intense' },
    { label: 'Smoke', value: 'smoke' },
    { label: 'Water', value: 'water' },
    { label: 'Fire', value: 'fire' },
    { label: 'Black on White', value: 'blackonwhite' },
    { label: 'Neon', value: 'neon' },
];

const PRESET_VALUES = {
    default: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.97,
        velocityDissipation: 0.98,
        pressure: 0.8,
        curl: 30,
        splatRadius: 0.25,
        splatForce: 6000,
        bloom: true,
        bloomIntensity: 0.8,
        bloomThreshold: 0.6,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    dreamy: {
        simResolution: 64,
        dyeResolution: 512,
        densityDissipation: 0.99,
        velocityDissipation: 0.995,
        pressure: 0.6,
        curl: 5,
        splatRadius: 0.5,
        splatForce: 3000,
        bloom: true,
        bloomIntensity: 1.5,
        bloomThreshold: 0.3,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    intense: {
        simResolution: 256,
        dyeResolution: 2048,
        densityDissipation: 0.94,
        velocityDissipation: 0.95,
        pressure: 0.9,
        curl: 80,
        splatRadius: 0.15,
        splatForce: 15000,
        bloom: true,
        bloomIntensity: 1.2,
        bloomThreshold: 0.4,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    smoke: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.995,
        velocityDissipation: 0.99,
        pressure: 0.7,
        curl: 10,
        splatRadius: 0.4,
        splatForce: 4000,
        bloom: true,
        bloomIntensity: 0.5,
        bloomThreshold: 0.7,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    water: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.98,
        velocityDissipation: 0.96,
        pressure: 0.9,
        curl: 40,
        splatRadius: 0.3,
        splatForce: 8000,
        bloom: true,
        bloomIntensity: 0.6,
        bloomThreshold: 0.5,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    fire: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.92,
        velocityDissipation: 0.94,
        pressure: 0.5,
        curl: 60,
        splatRadius: 0.2,
        splatForce: 10000,
        bloom: true,
        bloomIntensity: 1.8,
        bloomThreshold: 0.2,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: false,
    },
    blackonwhite: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.97,
        velocityDissipation: 0.98,
        pressure: 0.8,
        curl: 30,
        splatRadius: 0.25,
        splatForce: 6000,
        bloom: false,
        bloomIntensity: 0.5,
        bloomThreshold: 0.6,
        colorSaturation: 1.0,
        colorBrightness: 0.15,
        rainbowMode: true,
        darkMode: true,
    },
    neon: {
        simResolution: 128,
        dyeResolution: 1024,
        densityDissipation: 0.95,
        velocityDissipation: 0.97,
        pressure: 0.8,
        curl: 40,
        splatRadius: 0.3,
        splatForce: 8000,
        bloom: true,
        bloomIntensity: 2.0,
        bloomThreshold: 0.2,
        colorSaturation: 1.0,
        colorBrightness: 0.25,
        rainbowMode: true,
        darkMode: false,
    },
};

export default function Edit({ attributes, setAttributes }) {
    const { enableFluid, fluidSettings } = attributes;
    const [importValue, setImportValue] = useState('');
    const [showImport, setShowImport] = useState(false);

    const updateFluidSetting = (key, value) => {
        setAttributes({
            fluidSettings: {
                ...fluidSettings,
                [key]: value,
            },
        });
    };

    const applyPreset = (presetName) => {
        const preset = PRESET_VALUES[presetName];
        if (preset) {
            setAttributes({
                fluidSettings: {
                    ...fluidSettings,
                    ...preset,
                    preset: presetName,
                },
            });
        }
    };

    const exportSettings = () => {
        const exportData = {
            version: '1.0',
            fluidSettings: fluidSettings,
        };
        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        alert(__('Settings copied to clipboard!', 'fluid-gradient-block'));
    };

    const importSettings = () => {
        try {
            const data = JSON.parse(importValue);
            if (data.fluidSettings) {
                setAttributes({ fluidSettings: { ...fluidSettings, ...data.fluidSettings } });
                setShowImport(false);
                setImportValue('');
            } else {
                alert(__('Invalid settings format', 'fluid-gradient-block'));
            }
        } catch (e) {
            alert(__('Invalid JSON', 'fluid-gradient-block'));
        }
    };

    const blockProps = useBlockProps({
        className: `fgb-fluid-group ${enableFluid ? 'has-fluid-background' : ''}`,
    });

    return (
        <>
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
                        <PanelBody title={__('Presets', 'fluid-gradient-block')} initialOpen={false}>
                            <SelectControl
                                label={__('Choose Preset', 'fluid-gradient-block')}
                                value={fluidSettings.preset || 'default'}
                                options={PRESETS}
                                onChange={(value) => applyPreset(value)}
                            />
                        </PanelBody>

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
                                min={0.9}
                                max={1}
                                step={0.005}
                            />
                            <RangeControl
                                label={__('Velocity Dissipation', 'fluid-gradient-block')}
                                value={fluidSettings.velocityDissipation}
                                onChange={(value) => updateFluidSetting('velocityDissipation', value)}
                                min={0.9}
                                max={1}
                                step={0.005}
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
                                min={1000}
                                max={20000}
                                step={500}
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
                                max={1}
                                step={0.05}
                            />
                            <RangeControl
                                label={__('Color Brightness', 'fluid-gradient-block')}
                                value={fluidSettings.colorBrightness}
                                onChange={(value) => updateFluidSetting('colorBrightness', value)}
                                min={0.05}
                                max={0.5}
                                step={0.01}
                            />
                            <ToggleControl
                                label={__('Rainbow Mode', 'fluid-gradient-block')}
                                checked={fluidSettings.rainbowMode}
                                onChange={(value) => updateFluidSetting('rainbowMode', value)}
                            />
                            <ToggleControl
                                label={__('Dark Fluid Mode', 'fluid-gradient-block')}
                                checked={fluidSettings.darkMode}
                                onChange={(value) => updateFluidSetting('darkMode', value)}
                                help={__('Creates dark fluid effect (use with light background)', 'fluid-gradient-block')}
                            />
                        </PanelBody>

                        <PanelBody title={__('Import / Export', 'fluid-gradient-block')} initialOpen={false}>
                            <Button variant="secondary" onClick={exportSettings} style={{ marginBottom: '10px', width: '100%' }}>
                                {__('Copy Settings', 'fluid-gradient-block')}
                            </Button>

                            {!showImport ? (
                                <Button variant="secondary" onClick={() => setShowImport(true)} style={{ width: '100%' }}>
                                    {__('Paste Settings', 'fluid-gradient-block')}
                                </Button>
                            ) : (
                                <>
                                    <TextareaControl
                                        label={__('Paste JSON here', 'fluid-gradient-block')}
                                        value={importValue}
                                        onChange={setImportValue}
                                        rows={4}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button variant="primary" onClick={importSettings}>
                                            {__('Import', 'fluid-gradient-block')}
                                        </Button>
                                        <Button variant="secondary" onClick={() => { setShowImport(false); setImportValue(''); }}>
                                            {__('Cancel', 'fluid-gradient-block')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </PanelBody>
                    </>
                )}
            </InspectorControls>

            <div {...blockProps}>
                {enableFluid && (
                    <div className="fgb-fluid-preview">
                        <span>{__('Fluid Background Active', 'fluid-gradient-block')}</span>
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
