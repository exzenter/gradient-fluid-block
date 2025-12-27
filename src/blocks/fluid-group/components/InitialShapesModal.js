/**
 * Initial Shapes Editor Modal
 * Visual editor for configuring shapes that fire on page load
 */

import { __ } from '@wordpress/i18n';
import { useState, useCallback } from '@wordpress/element';
import {
    Modal,
    Button,
    RangeControl,
    SelectControl,
    ToggleControl,
    TextControl,
    __experimentalNumberControl as NumberControl,
} from '@wordpress/components';

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Shape type definitions
const SHAPE_TYPES = {
    stroke: { label: 'Stroke', icon: '━' },
    circle: { label: 'Circle', icon: '○' },
    ellipse: { label: 'Ellipse', icon: '⬭' },
    rectangle: { label: 'Rectangle', icon: '□' },
    path: { label: 'Draw Path', icon: '✏' },
    svg: { label: 'SVG Path', icon: '✎' },
};

// Default shape properties by type
const getDefaultShape = (type) => {
    const base = {
        id: generateId(),
        type,
        x: 50,
        y: 50,
        colorMode: 'gradient', // 'gradient' or 'fixed'
        color: '#ff6b6b', // used when colorMode is 'fixed'
        colorSpeed: 1, // how fast colors cycle in gradient mode
        randomizeColor: true, // randomize color on each repeat
        force: 1, // force multiplier (1 = normal, higher = more intense fluid)
        timing: { delay: 0, duration: 500, repeat: 0, repeatDelay: 0 },
        random: {
            x: [0, 0],
            y: [0, 0],
            angle: [0, 0],
            speed: [0, 0],
            size: [0, 0], // for radius, width, height
            force: [0, 0],
        },
    };

    switch (type) {
        case 'stroke':
            return { ...base, props: { length: 100, angle: 0, speed: 1 } };
        case 'circle':
            return { ...base, props: { radius: 50, speed: 1 } };
        case 'ellipse':
            return { ...base, props: { radiusX: 60, radiusY: 40, rotation: 0, speed: 1 } };
        case 'rectangle':
            return { ...base, props: { width: 80, height: 50, rotation: 0, speed: 1 } };
        case 'path':
            return { ...base, props: { points: [], scale: 1, speed: 1 } };
        case 'svg':
            return { ...base, props: { pathData: 'M0,0 C50,50 100,0 150,50', scale: 1, rotation: 0, speed: 1 } };
        default:
            return base;
    }
};

// Presets
const PRESETS = {
    scattered: {
        name: 'Scattered',
        generate: () => {
            const shapes = [];
            for (let i = 0; i < 8; i++) {
                shapes.push({
                    ...getDefaultShape('stroke'),
                    x: 10 + Math.random() * 80,
                    y: 10 + Math.random() * 80,
                    props: { length: 50 + Math.random() * 100, angle: Math.random() * 360, speed: 0.5 + Math.random() },
                    timing: { delay: i * 150, duration: 300 + Math.random() * 200, repeat: 0, repeatDelay: 0 },
                });
            }
            return shapes;
        },
    },
    radialBurst: {
        name: 'Radial Burst',
        generate: () => {
            const shapes = [];
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * 360;
                shapes.push({
                    ...getDefaultShape('stroke'),
                    x: 50,
                    y: 50,
                    props: { length: 80, angle, speed: 1.5 },
                    timing: { delay: 0, duration: 400, repeat: 0, repeatDelay: 0 },
                });
            }
            return shapes;
        },
    },
    grid: {
        name: 'Grid Pattern',
        generate: () => {
            const shapes = [];
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    shapes.push({
                        ...getDefaultShape('circle'),
                        x: 25 + col * 25,
                        y: 25 + row * 25,
                        props: { radius: 30, speed: 0.8 },
                        timing: { delay: (row * 3 + col) * 100, duration: 300, repeat: 0, repeatDelay: 0 },
                    });
                }
            }
            return shapes;
        },
    },
    randomLines: {
        name: 'Random Lines',
        generate: () => {
            const shapes = [];
            for (let i = 0; i < 5; i++) {
                shapes.push({
                    ...getDefaultShape('stroke'),
                    x: Math.random() * 100,
                    y: Math.random() * 100,
                    props: { length: 150 + Math.random() * 100, angle: -45 + Math.random() * 90, speed: 0.8 },
                    timing: { delay: i * 200, duration: 600, repeat: 0, repeatDelay: 0 },
                });
            }
            return shapes;
        },
    },
    gentleWaves: {
        name: 'Gentle Waves',
        generate: () => {
            const shapes = [];
            for (let i = 0; i < 4; i++) {
                shapes.push({
                    ...getDefaultShape('svg'),
                    x: 10,
                    y: 20 + i * 20,
                    props: {
                        pathData: 'M0,0 Q40,20 80,0 Q120,-20 160,0 Q200,20 240,0',
                        scale: 0.8,
                        rotation: 0,
                        speed: 0.6
                    },
                    timing: { delay: i * 300, duration: 800, repeat: 0, repeatDelay: 0 },
                });
            }
            return shapes;
        },
    },
};

// Canvas Preview Component
function CanvasPreview({ shapes, selectedId, onSelectShape, onUpdateShape, drawingMode, onDrawingComplete, drawingPoints, setDrawingPoints }) {
    const [dragging, setDragging] = useState(null);

    const handleMouseDown = (e, shape) => {
        e.stopPropagation();
        onSelectShape(shape.id);
        setDragging({ id: shape.id, startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y });
    };

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
        const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(100, dragging.origX + dx));
        const newY = Math.max(0, Math.min(100, dragging.origY + dy));
        onUpdateShape(dragging.id, { x: newX, y: newY });
    }, [dragging, onUpdateShape]);

    const handleMouseUp = () => setDragging(null);

    const renderShape = (shape) => {
        const isSelected = shape.id === selectedId;
        const baseStyle = {
            position: 'absolute',
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'move',
            border: isSelected ? '2px solid #6366f1' : '2px solid transparent',
            borderRadius: '4px',
            padding: '4px',
            background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        };

        let visual = null;
        const { props } = shape;

        switch (shape.type) {
            case 'stroke':
                const rad = (props.angle * Math.PI) / 180;
                const len = props.length * 0.5;
                visual = (
                    <svg width={len * 2 + 20} height={len * 2 + 20} style={{ overflow: 'visible' }}>
                        <line
                            x1={len + 10 - Math.cos(rad) * len}
                            y1={len + 10 - Math.sin(rad) * len}
                            x2={len + 10 + Math.cos(rad) * len}
                            y2={len + 10 + Math.sin(rad) * len}
                            stroke="#6366f1"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                );
                break;
            case 'circle':
                visual = (
                    <svg width={props.radius * 2 + 10} height={props.radius * 2 + 10}>
                        <circle cx={props.radius + 5} cy={props.radius + 5} r={props.radius} fill="none" stroke="#6366f1" strokeWidth="2" />
                    </svg>
                );
                break;
            case 'ellipse':
                visual = (
                    <svg width={props.radiusX * 2 + 10} height={props.radiusY * 2 + 10} style={{ transform: `rotate(${props.rotation}deg)` }}>
                        <ellipse cx={props.radiusX + 5} cy={props.radiusY + 5} rx={props.radiusX} ry={props.radiusY} fill="none" stroke="#6366f1" strokeWidth="2" />
                    </svg>
                );
                break;
            case 'rectangle':
                visual = (
                    <svg width={props.width + 10} height={props.height + 10} style={{ transform: `rotate(${props.rotation}deg)` }}>
                        <rect x="5" y="5" width={props.width} height={props.height} fill="none" stroke="#6366f1" strokeWidth="2" />
                    </svg>
                );
                break;
            case 'path':
                if (props.points && props.points.length > 1) {
                    const pts = props.points;
                    const pathStr = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
                    visual = (
                        <svg width="200" height="150" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                            <path d={pathStr} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
                            ))}
                        </svg>
                    );
                } else {
                    visual = <div style={{ padding: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Click canvas to draw</div>;
                }
                break;
            case 'svg':
                visual = (
                    <svg width="100" height="60" viewBox="0 0 250 50" style={{ transform: `scale(${props.scale}) rotate(${props.rotation}deg)` }}>
                        <path d={props.pathData} fill="none" stroke="#6366f1" strokeWidth="2" />
                    </svg>
                );
                break;
        }

        return (
            <div
                key={shape.id}
                style={baseStyle}
                onMouseDown={(e) => handleMouseDown(e, shape)}
            >
                {visual}
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    background: '#6366f1',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                }}>
                    {SHAPE_TYPES[shape.type].label}
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '8px',
                overflow: 'hidden',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => onSelectShape(null)}
        >
            {/* Drawing mode overlay */}
            {drawingMode && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(99, 102, 241, 0.9)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    zIndex: 100,
                }}>
                    Click to add points • Double-click to finish
                </div>
            )}
            {/* Drawing path preview */}
            {drawingMode && drawingPoints.length > 0 && (
                <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <path
                        d={drawingPoints.map((p, i) => (i === 0 ? `M${p.x}%,${p.y}%` : `L${p.x}%,${p.y}%`)).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="5,5"
                    />
                    {drawingPoints.map((p, i) => (
                        <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="6" fill="#10b981" />
                    ))}
                </svg>
            )}
            {/* Grid overlay */}
            <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.1 }}>
                <defs>
                    <pattern id="grid" width="10%" height="10%" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#fff" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {shapes.map(renderShape)}
        </div>
    );
}

// Shape Properties Panel
function ShapePropertiesPanel({ shape, onUpdate }) {
    if (!shape) {
        return (
            <div style={{ padding: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                Select a shape to edit its properties
            </div>
        );
    }

    const updateProp = (key, value) => {
        onUpdate(shape.id, { props: { ...shape.props, [key]: value } });
    };

    const updateTiming = (key, value) => {
        onUpdate(shape.id, { timing: { ...shape.timing, [key]: value } });
    };

    const updateRandom = (key, index, value) => {
        const newRange = [...shape.random[key]];
        newRange[index] = value;
        onUpdate(shape.id, { random: { ...shape.random, [key]: newRange } });
    };

    return (
        <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
            <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '14px' }}>
                {SHAPE_TYPES[shape.type].icon} {SHAPE_TYPES[shape.type].label} Properties
            </h4>

            {/* Position */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Position</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <RangeControl label="X %" value={shape.x} onChange={(v) => onUpdate(shape.id, { x: v })} min={0} max={100} step={1} />
                </div>
                <RangeControl label="Y %" value={shape.y} onChange={(v) => onUpdate(shape.id, { y: v })} min={0} max={100} step={1} />
            </div>

            {/* Color */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Color</label>
                <SelectControl
                    value={shape.colorMode || 'gradient'}
                    onChange={(v) => onUpdate(shape.id, { colorMode: v })}
                    options={[
                        { label: 'Gradient (animated)', value: 'gradient' },
                        { label: 'Fixed Color', value: 'fixed' },
                    ]}
                />
                {shape.colorMode === 'fixed' && (
                    <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '4px' }}>Color</label>
                        <input
                            type="color"
                            value={shape.color || '#ff6b6b'}
                            onChange={(e) => onUpdate(shape.id, { color: e.target.value })}
                            style={{ width: '100%', height: '36px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                        />
                    </div>
                )}
                {(shape.colorMode === 'gradient' || !shape.colorMode) && (
                    <RangeControl
                        label="Color Speed"
                        value={shape.colorSpeed || 1}
                        onChange={(v) => onUpdate(shape.id, { colorSpeed: v })}
                        min={0}
                        max={10}
                        step={0.5}
                        help="Hue shift during animation (0 = solid)"
                    />
                )}
                <ToggleControl
                    label="Randomize color each repeat"
                    checked={shape.randomizeColor !== false}
                    onChange={(v) => onUpdate(shape.id, { randomizeColor: v })}
                />
            </div>

            {/* Force */}
            <RangeControl
                label="Force"
                value={shape.force || 1}
                onChange={(v) => onUpdate(shape.id, { force: v })}
                min={0.1}
                max={5}
                step={0.1}
                help="Fluid intensity (1 = normal)"
            />

            {/* Type-specific props */}
            {shape.type === 'stroke' && (
                <>
                    <RangeControl label="Length" value={shape.props.length} onChange={(v) => updateProp('length', v)} min={20} max={800} />
                    <RangeControl label="Angle" value={shape.props.angle} onChange={(v) => updateProp('angle', v)} min={0} max={360} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            {shape.type === 'circle' && (
                <>
                    <RangeControl label="Radius" value={shape.props.radius} onChange={(v) => updateProp('radius', v)} min={10} max={500} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            {shape.type === 'ellipse' && (
                <>
                    <RangeControl label="Radius X" value={shape.props.radiusX} onChange={(v) => updateProp('radiusX', v)} min={10} max={500} />
                    <RangeControl label="Radius Y" value={shape.props.radiusY} onChange={(v) => updateProp('radiusY', v)} min={10} max={500} />
                    <RangeControl label="Rotation" value={shape.props.rotation} onChange={(v) => updateProp('rotation', v)} min={0} max={360} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            {shape.type === 'rectangle' && (
                <>
                    <RangeControl label="Width" value={shape.props.width} onChange={(v) => updateProp('width', v)} min={20} max={600} />
                    <RangeControl label="Height" value={shape.props.height} onChange={(v) => updateProp('height', v)} min={20} max={600} />
                    <RangeControl label="Rotation" value={shape.props.rotation} onChange={(v) => updateProp('rotation', v)} min={0} max={360} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            {shape.type === 'svg' && (
                <>
                    <TextControl label="SVG Path Data" value={shape.props.pathData} onChange={(v) => updateProp('pathData', v)} />
                    <RangeControl label="Scale" value={shape.props.scale} onChange={(v) => updateProp('scale', v)} min={0.1} max={10} step={0.1} />
                    <RangeControl label="Rotation" value={shape.props.rotation} onChange={(v) => updateProp('rotation', v)} min={0} max={360} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            {shape.type === 'path' && (
                <>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '0 0 8px' }}>
                        {shape.props.points?.length || 0} points defined
                    </p>
                    <RangeControl label="Scale" value={shape.props.scale || 1} onChange={(v) => updateProp('scale', v)} min={0.1} max={10} step={0.1} />
                    <RangeControl label="Speed" value={shape.props.speed} onChange={(v) => updateProp('speed', v)} min={0.1} max={10} step={0.1} />
                </>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />

            {/* Timing */}
            <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '13px' }}>⏱ Timing</h4>
            <RangeControl label="Delay (ms)" value={shape.timing.delay} onChange={(v) => updateTiming('delay', v)} min={0} max={20000} step={50} />
            <RangeControl label="Duration (ms)" value={shape.timing.duration} onChange={(v) => updateTiming('duration', v)} min={100} max={10000} step={50} />
            <RangeControl label="Repeat" value={shape.timing.repeat} onChange={(v) => updateTiming('repeat', v)} min={0} max={1000} />
            {shape.timing.repeat > 0 && (
                <RangeControl label="Repeat Delay (ms)" value={shape.timing.repeatDelay} onChange={(v) => updateTiming('repeatDelay', v)} min={0} max={10000} step={50} />
            )}

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />

            {/* Randomization */}
            <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '13px' }}>🎲 Randomization</h4>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>Min/Max offset for each property</p>

            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Position X: ±{shape.random.x[1]}%</label>
                <RangeControl value={shape.random.x[1]} onChange={(v) => { updateRandom('x', 0, -v); updateRandom('x', 1, v); }} min={0} max={30} step={1} withInputField={false} />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Position Y: ±{shape.random.y[1]}%</label>
                <RangeControl value={shape.random.y[1]} onChange={(v) => { updateRandom('y', 0, -v); updateRandom('y', 1, v); }} min={0} max={30} step={1} withInputField={false} />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Angle: ±{shape.random.angle[1]}°</label>
                <RangeControl value={shape.random.angle[1]} onChange={(v) => { updateRandom('angle', 0, -v); updateRandom('angle', 1, v); }} min={0} max={180} step={5} withInputField={false} />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Speed: ±{shape.random.speed[1].toFixed(1)}x</label>
                <RangeControl value={shape.random.speed[1]} onChange={(v) => { updateRandom('speed', 0, -v); updateRandom('speed', 1, v); }} min={0} max={1} step={0.1} withInputField={false} />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Size (radius/dimensions): ±{(shape.random.size?.[1] || 0).toFixed(0)}%</label>
                <RangeControl value={shape.random.size?.[1] || 0} onChange={(v) => { updateRandom('size', 0, -v); updateRandom('size', 1, v); }} min={0} max={100} step={5} withInputField={false} />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Force: ±{(shape.random.force?.[1] || 0).toFixed(1)}x</label>
                <RangeControl value={shape.random.force?.[1] || 0} onChange={(v) => { updateRandom('force', 0, -v); updateRandom('force', 1, v); }} min={0} max={2} step={0.1} withInputField={false} />
            </div>
        </div>
    );
}

// Main Modal Component
export default function InitialShapesModal({ isOpen, onClose, shapes, onSave }) {
    const [localShapes, setLocalShapes] = useState(shapes || []);
    const [selectedId, setSelectedId] = useState(null);
    const [drawingMode, setDrawingMode] = useState(false);
    const [drawingPoints, setDrawingPoints] = useState([]);
    const [pendingPathId, setPendingPathId] = useState(null);

    const selectedShape = localShapes.find(s => s.id === selectedId);

    const addShape = (type) => {
        const newShape = getDefaultShape(type);
        if (type === 'path') {
            // Enter drawing mode for path shapes
            setLocalShapes([...localShapes, newShape]);
            setSelectedId(newShape.id);
            setPendingPathId(newShape.id);
            setDrawingMode(true);
            setDrawingPoints([]);
        } else {
            setLocalShapes([...localShapes, newShape]);
            setSelectedId(newShape.id);
        }
    };

    const finishDrawing = () => {
        if (pendingPathId && drawingPoints.length > 1) {
            // Convert % points to relative coordinates for the shape
            const scaledPoints = drawingPoints.map(p => ({ x: p.x, y: p.y }));
            updateShape(pendingPathId, {
                props: { points: scaledPoints, speed: 1 },
                x: drawingPoints[0].x,
                y: drawingPoints[0].y
            });
        } else if (pendingPathId && drawingPoints.length <= 1) {
            // Remove empty path
            deleteShape(pendingPathId);
        }
        setDrawingMode(false);
        setDrawingPoints([]);
        setPendingPathId(null);
    };

    const handleCanvasClick = useCallback((e) => {
        if (!drawingMode) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDrawingPoints(prev => [...prev, { x, y }]);
    }, [drawingMode]);

    const handleCanvasDoubleClick = useCallback((e) => {
        if (drawingMode) {
            e.stopPropagation();
            finishDrawing();
        }
    }, [drawingMode, drawingPoints, pendingPathId]);

    const updateShape = (id, updates) => {
        setLocalShapes(localShapes.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteShape = (id) => {
        setLocalShapes(localShapes.filter(s => s.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const duplicateShape = (id) => {
        const shape = localShapes.find(s => s.id === id);
        if (shape) {
            const newShape = { ...shape, id: generateId(), x: shape.x + 5, y: shape.y + 5 };
            setLocalShapes([...localShapes, newShape]);
            setSelectedId(newShape.id);
        }
    };

    const applyPreset = (presetKey) => {
        const preset = PRESETS[presetKey];
        if (preset) {
            setLocalShapes(preset.generate());
            setSelectedId(null);
        }
    };

    const clearAll = () => {
        setLocalShapes([]);
        setSelectedId(null);
    };

    const handleSave = () => {
        onSave(localShapes);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            title={__('Initial Shapes Editor', 'fluid-gradient-block')}
            onRequestClose={onClose}
            isFullScreen={true}
            className="fgb-shapes-modal"
        >
            <style>{`
                .fgb-shapes-modal .components-modal__content {
                    padding: 0 !important;
                    background: #0f0f1a !important;
                }
                .fgb-shapes-modal .components-modal__header {
                    background: rgba(99, 102, 241, 0.2) !important;
                    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
                }
                .fgb-shapes-modal .components-modal__header-heading {
                    color: #fff !important;
                }
                .fgb-shapes-modal .components-range-control__wrapper {
                    margin-bottom: 8px;
                }
                .fgb-shapes-modal .components-base-control__label {
                    color: rgba(255,255,255,0.7) !important;
                    font-size: 11px !important;
                }
            `}</style>

            <div style={{ display: 'flex', height: 'calc(100vh - 180px)' }}>
                {/* Left Panel - Shape List */}
                <div style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', display: 'block' }}>Add Shape</label>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {Object.entries(SHAPE_TYPES).map(([type, config]) => (
                                <Button
                                    key={type}
                                    variant="secondary"
                                    onClick={() => addShape(type)}
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                    {config.icon}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <SelectControl
                            label="Presets"
                            value=""
                            onChange={applyPreset}
                            options={[
                                { label: 'Choose preset...', value: '' },
                                ...Object.entries(PRESETS).map(([key, p]) => ({ label: p.name, value: key }))
                            ]}
                        />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {localShapes.length === 0 ? (
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                                No shapes yet. Add a shape or choose a preset.
                            </p>
                        ) : (
                            localShapes.map((shape, index) => (
                                <div
                                    key={shape.id}
                                    onClick={() => setSelectedId(shape.id)}
                                    style={{
                                        padding: '8px 10px',
                                        marginBottom: '4px',
                                        background: selectedId === shape.id ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <span style={{ color: '#fff', fontSize: '12px' }}>
                                        {SHAPE_TYPES[shape.type].icon} {SHAPE_TYPES[shape.type].label} {index + 1}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <Button isSmall variant="tertiary" onClick={(e) => { e.stopPropagation(); duplicateShape(shape.id); }}>⎘</Button>
                                        <Button isSmall variant="tertiary" onClick={(e) => { e.stopPropagation(); deleteShape(shape.id); }} isDestructive>×</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <Button variant="secondary" onClick={clearAll} isDestructive style={{ width: '100%' }}>
                            Clear All
                        </Button>
                    </div>
                </div>

                {/* Center - Canvas Preview */}
                <div
                    style={{ flex: 1, padding: '20px' }}
                    onClick={handleCanvasClick}
                    onDoubleClick={handleCanvasDoubleClick}
                >
                    <CanvasPreview
                        shapes={localShapes}
                        selectedId={selectedId}
                        onSelectShape={drawingMode ? () => { } : setSelectedId}
                        onUpdateShape={updateShape}
                        drawingMode={drawingMode}
                        drawingPoints={drawingPoints}
                        setDrawingPoints={setDrawingPoints}
                        onDrawingComplete={finishDrawing}
                    />
                </div>

                {/* Right Panel - Properties */}
                <div style={{ width: '280px', borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    <ShapePropertiesPanel shape={selectedShape} onUpdate={updateShape} />
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.3)',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                    {localShapes.length} shape{localShapes.length !== 1 ? 's' : ''} configured
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Shapes</Button>
                </div>
            </div>
        </Modal>
    );
}
