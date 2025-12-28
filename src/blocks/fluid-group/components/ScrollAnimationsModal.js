/**
 * Scroll Animations Modal Component
 * Allows users to create scroll-based animation rules for fluid settings
 */

import { __ } from '@wordpress/i18n';
import {
    Modal,
    Button,
    TextControl,
    SelectControl,
    RangeControl,
    ToggleControl,
    Flex,
    FlexItem,
    FlexBlock,
    Card,
    CardBody,
    CardHeader,
    __experimentalHeading as Heading,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

// Available properties for scroll animations
const ANIMATABLE_PROPERTIES = [
    { label: 'Color Saturation', value: 'colorSaturation', min: 0, max: 5, step: 0.1 },
    { label: 'Color Brightness', value: 'colorBrightness', min: 0, max: 1, step: 0.01 },
    { label: 'Fade Speed', value: 'fadeSpeed', min: 0, max: 15, step: 0.01 },
    { label: 'Curl (Vorticity)', value: 'curl', min: 0, max: 100, step: 1 },
    { label: 'Splat Radius', value: 'splatRadius', min: 0, max: 1, step: 0.01 },
    { label: 'Splat Force', value: 'splatForce', min: 0, max: 50000, step: 500 },
    { label: 'Projection Distance', value: 'projectionDistance', min: 0.5, max: 5, step: 0.25 },
    { label: 'CSS Saturate Filter (%)', value: 'cssSaturate', min: 0, max: 300, step: 5 },
    { label: 'Animation Speed', value: 'animationSpeed', min: 0, max: 3, step: 0.01 },
];

// Generate unique ID
const generateId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get property config by value
const getPropertyConfig = (propertyValue) => {
    return ANIMATABLE_PROPERTIES.find(p => p.value === propertyValue) || ANIMATABLE_PROPERTIES[0];
};

export default function ScrollAnimationsModal({ isOpen, onClose, scrollAnimations, onSave, fluidSettings }) {
    const [localAnimations, setLocalAnimations] = useState(scrollAnimations || { enabled: false, rules: [] });
    const [editingRule, setEditingRule] = useState(null);

    // Update local state
    const updateAnimations = (updates) => {
        setLocalAnimations(prev => ({ ...prev, ...updates }));
    };

    // Add new rule
    const addRule = () => {
        const newRule = {
            id: generateId(),
            property: 'colorSaturation',
            scrollStart: 0,
            scrollEnd: 500,
            valueStart: 1,
            valueEnd: 0.5,
        };
        updateAnimations({
            rules: [...localAnimations.rules, newRule],
        });
        setEditingRule(newRule.id);
    };

    // Update a specific rule
    const updateRule = (ruleId, updates) => {
        updateAnimations({
            rules: localAnimations.rules.map(rule =>
                rule.id === ruleId ? { ...rule, ...updates } : rule
            ),
        });
    };

    // Delete a rule
    const deleteRule = (ruleId) => {
        updateAnimations({
            rules: localAnimations.rules.filter(rule => rule.id !== ruleId),
        });
        if (editingRule === ruleId) {
            setEditingRule(null);
        }
    };

    // Handle save
    const handleSave = () => {
        onSave(localAnimations);
        onClose();
    };

    // Handle cancel
    const handleCancel = () => {
        setLocalAnimations(scrollAnimations || { enabled: false, rules: [] });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            title={__('Scroll Animations', 'fluid-gradient-block')}
            onRequestClose={handleCancel}
            style={{ maxWidth: '700px', width: '100%' }}
        >
            <div style={{ marginBottom: '20px' }}>
                <ToggleControl
                    label={__('Enable Scroll Animations', 'fluid-gradient-block')}
                    checked={localAnimations.enabled}
                    onChange={(value) => updateAnimations({ enabled: value })}
                    help={__('Animate fluid settings based on page scroll position', 'fluid-gradient-block')}
                />
            </div>

            {localAnimations.enabled && (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <Heading level={4} style={{ marginBottom: '10px' }}>
                            {__('Animation Rules', 'fluid-gradient-block')}
                        </Heading>
                        <p style={{ fontSize: '12px', color: '#757575', marginBottom: '12px' }}>
                            {__('Define how settings change as the user scrolls. Values interpolate linearly between scroll positions.', 'fluid-gradient-block')}
                        </p>
                    </div>

                    {/* Rules List */}
                    {localAnimations.rules.map((rule, index) => {
                        const propConfig = getPropertyConfig(rule.property);
                        const isEditing = editingRule === rule.id;

                        return (
                            <Card
                                key={rule.id}
                                style={{ marginBottom: '12px' }}
                                isBorderless={false}
                            >
                                <CardHeader
                                    style={{ cursor: 'pointer', padding: '12px 16px' }}
                                    onClick={() => setEditingRule(isEditing ? null : rule.id)}
                                >
                                    <Flex align="center">
                                        <FlexBlock>
                                            <strong>Rule {index + 1}:</strong>{' '}
                                            {propConfig.label}{' '}
                                            <span style={{ color: '#757575' }}>
                                                ({rule.scrollStart}px → {rule.scrollEnd}px: {rule.valueStart} → {rule.valueEnd})
                                            </span>
                                        </FlexBlock>
                                        <FlexItem>
                                            <Button
                                                isDestructive
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteRule(rule.id);
                                                }}
                                            >
                                                {__('Delete', 'fluid-gradient-block')}
                                            </Button>
                                        </FlexItem>
                                    </Flex>
                                </CardHeader>

                                {isEditing && (
                                    <CardBody style={{ borderTop: '1px solid #ddd' }}>
                                        <SelectControl
                                            label={__('Property', 'fluid-gradient-block')}
                                            value={rule.property}
                                            options={ANIMATABLE_PROPERTIES.map(p => ({
                                                label: p.label,
                                                value: p.value,
                                            }))}
                                            onChange={(value) => {
                                                const newConfig = getPropertyConfig(value);
                                                updateRule(rule.id, {
                                                    property: value,
                                                    valueStart: fluidSettings[value] ?? newConfig.min,
                                                    valueEnd: newConfig.min,
                                                });
                                            }}
                                        />

                                        <Flex style={{ marginBottom: '16px' }}>
                                            <FlexBlock>
                                                <TextControl
                                                    label={__('Scroll Start (px)', 'fluid-gradient-block')}
                                                    type="number"
                                                    value={rule.scrollStart}
                                                    onChange={(value) => updateRule(rule.id, { scrollStart: parseInt(value) || 0 })}
                                                />
                                            </FlexBlock>
                                            <FlexBlock style={{ marginLeft: '12px' }}>
                                                <TextControl
                                                    label={__('Scroll End (px)', 'fluid-gradient-block')}
                                                    type="number"
                                                    value={rule.scrollEnd}
                                                    onChange={(value) => updateRule(rule.id, { scrollEnd: parseInt(value) || 0 })}
                                                />
                                            </FlexBlock>
                                        </Flex>

                                        <RangeControl
                                            label={__('Value Start', 'fluid-gradient-block')}
                                            value={rule.valueStart}
                                            onChange={(value) => updateRule(rule.id, { valueStart: value })}
                                            min={propConfig.min}
                                            max={propConfig.max}
                                            step={propConfig.step}
                                        />

                                        <RangeControl
                                            label={__('Value End', 'fluid-gradient-block')}
                                            value={rule.valueEnd}
                                            onChange={(value) => updateRule(rule.id, { valueEnd: value })}
                                            min={propConfig.min}
                                            max={propConfig.max}
                                            step={propConfig.step}
                                        />
                                    </CardBody>
                                )}
                            </Card>
                        );
                    })}

                    <Button
                        variant="secondary"
                        onClick={addRule}
                        style={{ marginTop: '8px' }}
                    >
                        {__('+ Add Animation Rule', 'fluid-gradient-block')}
                    </Button>
                </>
            )}

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
                <Flex justify="flex-end">
                    <FlexItem>
                        <Button variant="tertiary" onClick={handleCancel}>
                            {__('Cancel', 'fluid-gradient-block')}
                        </Button>
                    </FlexItem>
                    <FlexItem>
                        <Button variant="primary" onClick={handleSave}>
                            {__('Save', 'fluid-gradient-block')}
                        </Button>
                    </FlexItem>
                </Flex>
            </div>
        </Modal>
    );
}
