/**
 * Fluid Gradient Text Block - View Script
 * Initializes fluid simulation with text CSS masking on frontend
 */

function initFluidTextBlocks() {
    const textBlocks = document.querySelectorAll('.fgb-fluid-text[data-fluid-enabled="true"]');

    textBlocks.forEach(function (block) {
        if (block.dataset.fluidInitialized === 'true') return;

        const canvas = block.querySelector('.fgb-fluid-text-canvas');
        if (!canvas) return;

        const fluidSettingsAttr = block.getAttribute('data-fluid-settings');
        const textSettingsAttr = block.getAttribute('data-text-settings');
        const shapesAttr = block.getAttribute('data-initial-shapes');

        let fluidSettings = {};
        let textSettings = {};
        let initialShapes = [];

        try { fluidSettings = JSON.parse(fluidSettingsAttr) || {}; } catch (e) { console.error('Failed to parse fluid settings:', e); }
        try { textSettings = JSON.parse(textSettingsAttr) || {}; } catch (e) { console.error('Failed to parse text settings:', e); }
        try { initialShapes = shapesAttr ? JSON.parse(shapesAttr) : []; } catch (e) { console.error('Failed to parse initial shapes:', e); }

        // Apply text mask and start simulation
        const sizer = block.querySelector('.fgb-fluid-text-sizer');
        applyTextMask(canvas, block, sizer, textSettings);

        initFluidSimulation(canvas, fluidSettings, initialShapes);

        // Re-apply mask on resize
        const ro = new ResizeObserver(function () {
            applyTextMask(canvas, block, sizer, textSettings);
        });
        ro.observe(block);

        block.dataset.fluidInitialized = 'true';
    });
}

/**
 * Create and apply a CSS mask from text to the canvas
 */
function applyTextMask(canvas, container, sizer, ts) {
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Read computed font size from the sizer element (respects CSS clamp)
    const computed = sizer ? window.getComputedStyle(sizer) : null;
    const computedFontSize = computed ? parseFloat(computed.fontSize) : 48;
    const computedLineHeight = computed ? parseFloat(computed.lineHeight) : computedFontSize * 1.2;
    const computedLetterSpacing = computed ? computed.letterSpacing : ts.letterSpacing || '0px';

    const fontFamily = ts.fontFamily || 'sans-serif';
    const fontWeight = ts.fontWeight || '700';
    const textAlign = ts.textAlign || 'center';
    const mode = ts.mode || 'fill';
    const text = ts.text || '';

    // Create offscreen canvas for mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = Math.round(w * dpr);
    maskCanvas.height = Math.round(h * dpr);
    const ctx = maskCanvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (mode === 'knockout') {
        // Fill white (opaque), then cut out text
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
    }

    // Set font properties
    ctx.font = `${fontWeight} ${computedFontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'white';

    // Apply letter spacing if supported
    if (computedLetterSpacing && computedLetterSpacing !== 'normal' && ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = computedLetterSpacing;
    }

    // Handle multi-line text
    const lines = text.split('\n');
    const lineH = isNaN(computedLineHeight) ? computedFontSize * 1.2 : computedLineHeight;

    // Get padding from sizer computed style
    const sizerComputed = sizer ? window.getComputedStyle(sizer) : null;
    const paddingTop = sizerComputed ? parseFloat(sizerComputed.paddingTop) || 0 : 0;
    const paddingLeft = sizerComputed ? parseFloat(sizerComputed.paddingLeft) || 0 : 0;
    const paddingRight = sizerComputed ? parseFloat(sizerComputed.paddingRight) || 0 : 0;

    // Calculate x position based on alignment
    let xPos;
    if (textAlign === 'left') {
        xPos = paddingLeft;
    } else if (textAlign === 'right') {
        xPos = w - paddingRight;
    } else {
        xPos = w / 2;
    }

    // Calculate vertical start to match sizer layout
    // The sizer text starts at paddingTop, same for mask
    let yPos = paddingTop;

    lines.forEach(function (line, i) {
        // For word-wrapping to match CSS, we measure and wrap manually
        const maxWidth = w - paddingLeft - paddingRight;
        const wrappedLines = wrapText(ctx, line, maxWidth);
        wrappedLines.forEach(function (wrappedLine) {
            ctx.fillText(wrappedLine, xPos, yPos);
            yPos += lineH;
        });
    });

    // Apply as CSS mask
    const maskUrl = maskCanvas.toDataURL();
    canvas.style.webkitMaskImage = 'url(' + maskUrl + ')';
    canvas.style.maskImage = 'url(' + maskUrl + ')';
    canvas.style.webkitMaskSize = '100% 100%';
    canvas.style.maskSize = '100% 100%';
    canvas.style.webkitMaskRepeat = 'no-repeat';
    canvas.style.maskRepeat = 'no-repeat';
}

/**
 * Simple word-wrapping for canvas text
 */
function wrapText(ctx, text, maxWidth) {
    if (!text) return [''];
    if (maxWidth <= 0) return [text];

    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Expose globally
window.initFluidTextBlocks = initFluidTextBlocks;

document.addEventListener('DOMContentLoaded', initFluidTextBlocks);

/**
 * Initialize WebGL Fluid Simulation
 */
function initFluidSimulation(canvas, userSettings, initialShapes) {
    const config = {
        SIM_RESOLUTION: userSettings.simResolution ?? 128,
        DYE_RESOLUTION: userSettings.dyeResolution ?? 1024,
        DENSITY_DISSIPATION: userSettings.densityDissipation ?? 0.97,
        VELOCITY_DISSIPATION: userSettings.velocityDissipation ?? 0.98,
        PRESSURE: userSettings.pressure ?? 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: userSettings.curl ?? 30,
        SPLAT_RADIUS: userSettings.splatRadius ?? 0.25,
        SPLAT_FORCE: userSettings.splatForce ?? 6000,
        PROJECTION_DISTANCE: userSettings.projectionDistance ?? 1,
        FADE_SPEED: userSettings.fadeSpeed ?? 1,
        BLOOM: userSettings.bloom !== false,
        BLOOM_ITERATIONS: 8,
        BLOOM_RESOLUTION: 256,
        BLOOM_INTENSITY: userSettings.bloomIntensity ?? 0.8,
        BLOOM_THRESHOLD: userSettings.bloomThreshold ?? 0.6,
        BLOOM_SOFT_KNEE: 0.7,
        CALM_DOWN: userSettings.calmDown ?? false,
        CALM_DOWN_DELAY: userSettings.calmDownDelay ?? 2000,
        CALM_DOWN_STRENGTH: userSettings.calmDownStrength ?? 0.9,
    };

    const colorSettings = {
        saturation: userSettings.colorSaturation ?? 1.0,
        brightness: userSettings.colorBrightness ?? 0.15,
        saturationBoost: userSettings.saturationBoost ?? 1.0,
        fixedColor: userSettings.fixedColor ?? '#ff00ff',
        colorChangeDistance: userSettings.colorChangeDistance ?? 0,
        colorMode: userSettings.colorMode ?? 'rainbow',
        hueMin: userSettings.hueMin ?? 0,
        hueMax: userSettings.hueMax ?? 360,
        gradientSpeed: userSettings.gradientSpeed ?? 0.5,
        rainbowMode: userSettings.rainbowMode !== false,
        preventOverblending: userSettings.preventOverblending ?? false,
        maxColorIntensity: userSettings.maxColorIntensity ?? 1.0,
        darkMode: userSettings.darkMode ?? false,
        blendMode: userSettings.blendMode ?? 'normal',
        negativeBloom: userSettings.negativeBloom ?? false,
    };

    const elemInteractionSettings = userSettings.elementInteraction || {};
    const elementInteraction = {
        enabled: elemInteractionSettings.enabled ?? false,
        selectors: elemInteractionSettings.selectors ?? '',
        trackScroll: elemInteractionSettings.trackScroll ?? false,
        mode: elemInteractionSettings.mode ?? 'hardCorner',
        softEdgeRadius: elemInteractionSettings.softEdgeRadius ?? 20,
        forceFieldStrength: elemInteractionSettings.forceFieldStrength ?? 50,
        forceFieldRadius: elemInteractionSettings.forceFieldRadius ?? 80,
        attractFieldStrength: elemInteractionSettings.attractFieldStrength ?? 50,
        attractFieldRadius: elemInteractionSettings.attractFieldRadius ?? 80,
        turbulenceIntensity: elemInteractionSettings.turbulenceIntensity ?? 30,
        turbulenceScale: elemInteractionSettings.turbulenceScale ?? 50,
        affectNewSplats: elemInteractionSettings.affectNewSplats ?? true,
        affectExistingFluid: elemInteractionSettings.affectExistingFluid ?? false,
        edgeGlow: elemInteractionSettings.edgeGlow ?? false,
        edgeGlowIntensity: elemInteractionSettings.edgeGlowIntensity ?? 0.5,
        edgeGlowDistance: elemInteractionSettings.edgeGlowDistance ?? 15,
        edgeGlowMatchFluid: elemInteractionSettings.edgeGlowMatchFluid ?? true,
        edgeGlowColor: elemInteractionSettings.edgeGlowColor ?? '#ffffff',
    };

    const scrollAnimationsSettings = userSettings.scrollAnimations || {};
    const scrollAnimations = {
        enabled: scrollAnimationsSettings.enabled ?? false,
        rules: scrollAnimationsSettings.rules ?? [],
    };

    const cursorSettings = {
        mode: userSettings.cursorMode ?? 'default',
        dotSize: userSettings.dotCursor?.size ?? 10,
        dotColor: userSettings.dotCursor?.color ?? '#ffffff',
        crosshairThickness: userSettings.crosshairCursor?.thickness ?? 1,
        crosshairColor: userSettings.crosshairCursor?.color ?? '#ffffff',
        siblingHoverMode: userSettings.siblingHoverMode ?? false,
    };

    let animationSpeed = userSettings.animationSpeed ?? 1;
    let cssSaturate = userSettings.cssSaturate ?? 100;

    const liveControls = {
        speedMultiplier: animationSpeed,
        interactionForce: 1,
        fadeMultiplier: 1,
        curlMultiplier: 1,
        pressureIterations: config.PRESSURE_ITERATIONS,
        frameLimitEnabled: false,
        targetFPS: 60,
        paused: false,
    };

    let lastFrameTime = 0;
    let obstacleBounds = [];

    function getElementBoundsRelativeToCanvas(element) {
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        const normalizedX = (elemRect.left - canvasRect.left) / canvasRect.width;
        const normalizedY = 1.0 - (elemRect.bottom - canvasRect.top) / canvasRect.height;
        const normalizedWidth = elemRect.width / canvasRect.width;
        const normalizedHeight = elemRect.height / canvasRect.height;
        return {
            x: normalizedX, y: normalizedY, width: normalizedWidth, height: normalizedHeight,
            px: elemRect.left - canvasRect.left, py: elemRect.top - canvasRect.top,
            pWidth: elemRect.width, pHeight: elemRect.height,
        };
    }

    function updateObstacleBounds() {
        if (!elementInteraction.enabled || !elementInteraction.selectors) { obstacleBounds = []; return; }
        try {
            const elements = document.querySelectorAll(elementInteraction.selectors);
            obstacleBounds = Array.from(elements).map(function (el) { return getElementBoundsRelativeToCanvas(el); });
        } catch (e) { obstacleBounds = []; }
    }

    let gradientHue = Math.random();
    let lastInputTime = Date.now();

    canvas.style.mixBlendMode = colorSettings.blendMode;

    function updateCanvasFilter() {
        let filters = [];
        if (colorSettings.negativeBloom) filters.push('invert(1)');
        filters.push('saturate(' + cssSaturate + '%)');
        canvas.style.filter = filters.join(' ');
    }
    updateCanvasFilter();

    class Pointer {
        constructor() {
            this.id = -1;
            this.texcoordX = 0; this.texcoordY = 0;
            this.prevTexcoordX = 0; this.prevTexcoordY = 0;
            this.deltaX = 0; this.deltaY = 0;
            this.down = false; this.moved = false;
            this.color = { r: 0.5, g: 0.2, b: 0.8 };
            this.distanceSinceColorChange = 0;
        }
    }

    let pointers = [new Pointer()];

    function getWebGLContext(canvas) {
        const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
        let gl = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;
        if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        if (!gl) { console.error('WebGL not supported'); return null; }

        let halfFloat, supportLinearFiltering;
        if (isWebGL2) {
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
            halfFloat = gl.HALF_FLOAT;
        } else {
            const hfe = gl.getExtension('OES_texture_half_float');
            halfFloat = hfe ? hfe.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
            supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        let formatRGBA, formatRG, formatR;
        if (isWebGL2) {
            formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloat, isWebGL2);
            formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloat, isWebGL2);
            formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloat, isWebGL2);
        } else {
            formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA };
            formatRG = { internalFormat: gl.RGBA, format: gl.RGBA };
            formatR = { internalFormat: gl.RGBA, format: gl.RGBA };
        }

        return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType: halfFloat, supportLinearFiltering: !!supportLinearFiltering }, isWebGL2 };
    }

    function getSupportedFormat(gl, internalFormat, format, type, isWebGL2) {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
            if (isWebGL2) {
                switch (internalFormat) {
                    case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type, isWebGL2);
                    case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type, isWebGL2);
                }
            }
            return { internalFormat: gl.RGBA, format: gl.RGBA };
        }
        return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(texture);
        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    const context = getWebGLContext(canvas);
    if (!context) return;
    const { gl, ext, isWebGL2 } = context;

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(vertexSource, fragmentSource) {
        const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        if (!vs || !fs) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program error:', gl.getProgramInfoLog(program));
            return null;
        }

        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }

        return { program, uniforms };
    }

    // Shaders
    const baseVertexShader = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const blurVertexShader = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            float offset = 1.33333333;
            vL = vUv - texelSize * offset;
            vR = vUv + texelSize * offset;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const copyShader = `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
    `;

    const clearShader = `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `;

    const displayShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform bool useBloom;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            if (useBloom) {
                vec3 bloom = texture2D(uBloom, vUv).rgb;
                c += bloom;
            }
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

    const bloomPrefilterShader = `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec3 curve;
        uniform float threshold;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float br = max(c.r, max(c.g, c.b));
            float rq = clamp(br - curve.x, 0.0, curve.y);
            rq = curve.z * rq * rq;
            c *= max(rq, br - threshold) / max(br, 0.0001);
            gl_FragColor = vec4(c, 0.0);
        }
    `;

    const bloomBlurShader = `
        precision mediump float;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum *= 0.5;
            gl_FragColor = sum;
        }
    `;

    const bloomFinalShader = `
        precision mediump float;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float intensity;
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum *= 0.5 * intensity;
            gl_FragColor = sum;
        }
    `;

    const splatShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `;

    const advectionShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
    `;

    const divergenceShader = `
        precision mediump float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `;

    const curlShader = `
        precision mediump float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `;

    const vorticityShader = `
        precision highp float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
    `;

    const pressureShader = `
        precision mediump float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `;

    const gradientSubtractShader = `
        precision mediump float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `;

    const programs = {
        copy: createProgram(baseVertexShader, copyShader),
        clear: createProgram(baseVertexShader, clearShader),
        display: createProgram(baseVertexShader, displayShader),
        bloomPrefilter: createProgram(baseVertexShader, bloomPrefilterShader),
        bloomBlur: createProgram(blurVertexShader, bloomBlurShader),
        bloomFinal: createProgram(blurVertexShader, bloomFinalShader),
        splat: createProgram(baseVertexShader, splatShader),
        advection: createProgram(baseVertexShader, advectionShader),
        divergence: createProgram(baseVertexShader, divergenceShader),
        curl: createProgram(baseVertexShader, curlShader),
        vorticity: createProgram(baseVertexShader, vorticityShader),
        pressure: createProgram(baseVertexShader, pressureShader),
        gradientSubtract: createProgram(baseVertexShader, gradientSubtractShader),
    };

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    function blit(target, clear) {
        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    let dye, velocity, divergenceFBO, curlFBO, pressure, bloom;
    let bloomFramebuffers = [];

    function getResolution(resolution) {
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
        const min = Math.round(resolution);
        const max = Math.round(resolution * aspectRatio);
        if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
        return { width: min, height: max };
    }

    function createFBO(w, h, internalFormat, format, type, param) {
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const texelSizeX = 1.0 / w;
        const texelSizeY = 1.0 / h;
        return {
            texture, fbo, width: w, height: h, texelSizeX, texelSizeY,
            attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
        };
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
        let fbo1 = createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(w, h, internalFormat, format, type, param);
        return {
            width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
            get read() { return fbo1; }, set read(value) { fbo1 = value; },
            get write() { return fbo2; }, set write(value) { fbo2 = value; },
            swap: function () { var temp = fbo1; fbo1 = fbo2; fbo2 = temp; },
        };
    }

    const blockContainer = canvas.closest('.fgb-fluid-text');
    let lastWidth = 0;
    let lastHeight = 0;

    function resizeCanvas() {
        const width = blockContainer.offsetWidth || 300;
        const height = blockContainer.offsetHeight || 200;
        if (Math.abs(width - lastWidth) > 1 || Math.abs(height - lastHeight) > 1) {
            const maxSize = 4096;
            const safeWidth = Math.min(Math.max(width, 100), maxSize);
            const safeHeight = Math.min(Math.max(height, 50), maxSize);
            canvas.width = safeWidth;
            canvas.height = safeHeight;
            lastWidth = width;
            lastHeight = height;
            return true;
        }
        return false;
    }

    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (resizeCanvas()) initFramebuffers();
            updateObstacleBounds();
        }, 100);
    });

    if (elementInteraction.enabled && elementInteraction.trackScroll) {
        window.addEventListener('scroll', function () { updateObstacleBounds(); }, { passive: true });
    }
    if (elementInteraction.enabled) setTimeout(updateObstacleBounds, 200);

    // Scroll Animations
    if (scrollAnimations.enabled && scrollAnimations.rules.length > 0) {
        function interpolateValue(scrollY, scrollStart, scrollEnd, valueStart, valueEnd) {
            if (scrollY <= scrollStart) return valueStart;
            if (scrollY >= scrollEnd) return valueEnd;
            var progress = (scrollY - scrollStart) / (scrollEnd - scrollStart);
            return valueStart + progress * (valueEnd - valueStart);
        }

        function applyAnimatedProperty(property, value) {
            switch (property) {
                case 'colorSaturation': colorSettings.saturation = value; break;
                case 'colorBrightness': colorSettings.brightness = value; break;
                case 'fadeSpeed': config.FADE_SPEED = value; break;
                case 'curl': config.CURL = value; break;
                case 'splatRadius': config.SPLAT_RADIUS = value; break;
                case 'splatForce': config.SPLAT_FORCE = value; break;
                case 'projectionDistance': config.PROJECTION_DISTANCE = value; break;
                case 'cssSaturate': cssSaturate = value; updateCanvasFilter(); break;
                case 'animationSpeed': animationSpeed = value; liveControls.speedMultiplier = value; break;
                case 'densityDissipation': config.DENSITY_DISSIPATION = value; break;
            }
        }

        function handleScrollAnimations() {
            var scrollY = window.scrollY || window.pageYOffset;
            for (var i = 0; i < scrollAnimations.rules.length; i++) {
                var rule = scrollAnimations.rules[i];
                var val = interpolateValue(scrollY, rule.scrollStart, rule.scrollEnd, rule.valueStart, rule.valueEnd);
                applyAnimatedProperty(rule.property, val);
            }
        }

        handleScrollAnimations();
        window.addEventListener('scroll', handleScrollAnimations, { passive: true });
    }

    function initFramebuffers() {
        var simRes = getResolution(config.SIM_RESOLUTION);
        var dyeRes = getResolution(config.DYE_RESOLUTION);
        var texType = ext.halfFloatTexType;
        var rgba = ext.formatRGBA;
        var rg = ext.formatRG;
        var r = ext.formatR;
        var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
        divergenceFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        curlFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        initBloomFramebuffers();
    }

    function initBloomFramebuffers() {
        var res = getResolution(config.BLOOM_RESOLUTION);
        var texType = ext.halfFloatTexType;
        var rgba = ext.formatRGBA;
        var filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.length = 0;
        for (var i = 0; i < config.BLOOM_ITERATIONS; i++) {
            var width = res.width >> (i + 1);
            var height = res.height >> (i + 1);
            if (width < 2 || height < 2) break;
            bloomFramebuffers.push(createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering));
        }
    }

    resizeCanvas();
    initFramebuffers();

    function generateColor() {
        var c;
        var boostedSat = Math.min(colorSettings.saturation * colorSettings.saturationBoost, 1.0);
        var mode = colorSettings.colorMode || 'rainbow';
        switch (mode) {
            case 'rainbow':
                c = HSVtoRGB(Math.random(), boostedSat, 1.0);
                break;
            case 'huerange':
                var hueMinNorm = colorSettings.hueMin / 360;
                var hueMaxNorm = colorSettings.hueMax / 360;
                var hue;
                if (hueMinNorm <= hueMaxNorm) {
                    hue = hueMinNorm + Math.random() * (hueMaxNorm - hueMinNorm);
                } else {
                    var range = (1 - hueMinNorm) + hueMaxNorm;
                    hue = hueMinNorm + Math.random() * range;
                    if (hue > 1) hue -= 1;
                }
                c = HSVtoRGB(hue, boostedSat, 1.0);
                break;
            case 'gradient':
                gradientHue += colorSettings.gradientSpeed * 0.01;
                if (gradientHue > 1) gradientHue -= 1;
                c = HSVtoRGB(gradientHue, boostedSat, 1.0);
                break;
            case 'single':
            default:
                c = hexToRGB(colorSettings.fixedColor || '#ff00ff');
                break;
        }
        c.r *= colorSettings.brightness;
        c.g *= colorSettings.brightness;
        c.b *= colorSettings.brightness;
        if (colorSettings.preventOverblending) {
            var max = colorSettings.maxColorIntensity;
            c.r = Math.min(c.r, max);
            c.g = Math.min(c.g, max);
            c.b = Math.min(c.b, max);
        }
        if (colorSettings.darkMode) { c.r = -c.r; c.g = -c.g; c.b = -c.b; }
        return c;
    }

    function hexToRGB(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : { r: 1, g: 0, b: 1 };
    }

    function HSVtoRGB(h, s, v) {
        var r, g, b;
        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return { r: r, g: g, b: b };
    }

    // Update loop
    var lastUpdateTime = Date.now();

    function update(timestamp) {
        if (liveControls.paused) { requestAnimationFrame(update); return; }
        if (liveControls.frameLimitEnabled) {
            var minFrameTime = 1000 / liveControls.targetFPS;
            if (timestamp - lastFrameTime < minFrameTime) { requestAnimationFrame(update); return; }
            lastFrameTime = timestamp;
        }
        var dt = calcDeltaTime();
        applyInputs();
        step(dt);
        render(null);
        requestAnimationFrame(update);
    }

    function calcDeltaTime() {
        var now = Date.now();
        var dt = (now - lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        lastUpdateTime = now;
        return dt * liveControls.speedMultiplier;
    }

    function applyInputs() {
        pointers.forEach(function (p) {
            if (p.moved) { p.moved = false; splatPointer(p); }
        });
    }

    function step(dt) {
        gl.disable(gl.BLEND);

        gl.useProgram(programs.curl.program);
        gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curlFBO);

        gl.useProgram(programs.vorticity.program);
        gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.vorticity.uniforms.uCurl, curlFBO.attach(1));
        gl.uniform1f(programs.vorticity.uniforms.curl, config.CURL * liveControls.curlMultiplier);
        gl.uniform1f(programs.vorticity.uniforms.dt, dt);
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(programs.divergence.program);
        gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergenceFBO);

        gl.useProgram(programs.clear.program);
        gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(programs.clear.uniforms.value, config.PRESSURE);
        blit(pressure.write);
        pressure.swap();

        gl.useProgram(programs.pressure.program);
        gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        for (var i = 0; i < liveControls.pressureIterations; i++) {
            gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(0));
            gl.uniform1i(programs.pressure.uniforms.uDivergence, divergenceFBO.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        gl.useProgram(programs.gradientSubtract.program);
        gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(programs.advection.program);
        gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        if (ext.supportLinearFiltering) {
            gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        } else {
            gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        }
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, velocity.read.attach(0));
        gl.uniform1f(programs.advection.uniforms.dt, dt);
        gl.uniform1f(programs.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.write);
        velocity.swap();

        gl.uniform2f(programs.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(programs.advection.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(dye.write);
        dye.swap();

        // Fade
        if (config.FADE_SPEED > 0) {
            gl.useProgram(programs.clear.program);
            gl.uniform1i(programs.clear.uniforms.uTexture, dye.read.attach(0));
            var fadeValue = 1.0 - config.FADE_SPEED * 0.01 * liveControls.fadeMultiplier;
            gl.uniform1f(programs.clear.uniforms.value, Math.max(0.0, fadeValue));
            blit(dye.write);
            dye.swap();
        }

        // Calm down
        if (config.CALM_DOWN) {
            var timeSinceInput = Date.now() - lastInputTime;
            if (timeSinceInput > config.CALM_DOWN_DELAY) {
                gl.useProgram(programs.clear.program);
                gl.uniform1i(programs.clear.uniforms.uTexture, velocity.read.attach(0));
                gl.uniform1f(programs.clear.uniforms.value, config.CALM_DOWN_STRENGTH);
                blit(velocity.write);
                velocity.swap();
            }
        }

        // Element interaction
        if (elementInteraction.enabled && elementInteraction.affectExistingFluid && obstacleBounds.length > 0) {
            applyObstacleEffectsToFluid();
        }
    }

    function applyObstacleEffectsToFluid() {
        for (var b = 0; b < obstacleBounds.length; b++) {
            var bounds = obstacleBounds[b];
            var cx = bounds.x + bounds.width / 2;
            var cy = bounds.y + bounds.height / 2;

            switch (elementInteraction.mode) {
                case 'forceField':
                    var forceRadius = (elementInteraction.forceFieldRadius / canvas.width) + bounds.width * 0.5;
                    var forceStrength = elementInteraction.forceFieldStrength * 0.005;
                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, forceStrength, forceStrength, 0.0);
                    gl.uniform1f(programs.splat.uniforms.radius, forceRadius);
                    blit(velocity.write);
                    velocity.swap();
                    break;
                case 'attractField':
                    var aRadius = (elementInteraction.attractFieldRadius / canvas.width) + bounds.width * 0.5;
                    var aStrength = -elementInteraction.attractFieldStrength * 0.005;
                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, aStrength, aStrength, 0.0);
                    gl.uniform1f(programs.splat.uniforms.radius, aRadius);
                    blit(velocity.write);
                    velocity.swap();
                    break;
                case 'turbulence':
                    var turbRadius = bounds.width + (elementInteraction.turbulenceIntensity / canvas.width);
                    var turbStrength = elementInteraction.turbulenceIntensity * 0.001;
                    var time = Date.now() / elementInteraction.turbulenceScale;
                    var swirl = Math.sin(time) * turbStrength;
                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, swirl, -swirl * 0.5, 0.0);
                    gl.uniform1f(programs.splat.uniforms.radius, turbRadius);
                    blit(velocity.write);
                    velocity.swap();
                    break;
            }
        }
    }

    function render(target) {
        if (config.BLOOM && bloomFramebuffers.length >= 2) applyBloom(dye.read, bloom);
        drawDisplay(target);
    }

    function drawDisplay(target) {
        var width = target == null ? gl.drawingBufferWidth : target.width;
        var height = target == null ? gl.drawingBufferHeight : target.height;
        gl.useProgram(programs.display.program);
        gl.uniform2f(programs.display.uniforms.texelSize, 1.0 / width, 1.0 / height);
        gl.uniform1i(programs.display.uniforms.uTexture, dye.read.attach(0));
        if (config.BLOOM && bloomFramebuffers.length >= 2) {
            gl.uniform1i(programs.display.uniforms.uBloom, bloom.attach(1));
            gl.uniform1i(programs.display.uniforms.useBloom, 1);
        } else {
            gl.uniform1i(programs.display.uniforms.useBloom, 0);
        }
        blit(target);
    }

    function applyBloom(source, destination) {
        if (bloomFramebuffers.length < 2) return;
        var last = destination;
        gl.disable(gl.BLEND);
        gl.useProgram(programs.bloomPrefilter.program);
        var knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
        gl.uniform3f(programs.bloomPrefilter.uniforms.curve, config.BLOOM_THRESHOLD - knee, knee * 2, 0.25 / knee);
        gl.uniform1f(programs.bloomPrefilter.uniforms.threshold, config.BLOOM_THRESHOLD);
        gl.uniform1i(programs.bloomPrefilter.uniforms.uTexture, source.attach(0));
        blit(last);

        gl.useProgram(programs.bloomBlur.program);
        for (var i = 0; i < bloomFramebuffers.length; i++) {
            var dest = bloomFramebuffers[i];
            gl.uniform2f(programs.bloomBlur.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
            gl.uniform1i(programs.bloomBlur.uniforms.uTexture, last.attach(0));
            blit(dest);
            last = dest;
        }

        gl.blendFunc(gl.ONE, gl.ONE);
        gl.enable(gl.BLEND);
        for (var i = bloomFramebuffers.length - 2; i >= 0; i--) {
            var baseTex = bloomFramebuffers[i];
            gl.uniform2f(programs.bloomBlur.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
            gl.uniform1i(programs.bloomBlur.uniforms.uTexture, last.attach(0));
            gl.viewport(0, 0, baseTex.width, baseTex.height);
            blit(baseTex);
            last = baseTex;
        }
        gl.disable(gl.BLEND);

        gl.useProgram(programs.bloomFinal.program);
        gl.uniform2f(programs.bloomFinal.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(programs.bloomFinal.uniforms.uTexture, last.attach(0));
        gl.uniform1f(programs.bloomFinal.uniforms.intensity, config.BLOOM_INTENSITY);
        blit(destination);
    }

    function isPointInObstacle(x, y) {
        for (var i = 0; i < obstacleBounds.length; i++) {
            var b = obstacleBounds[i];
            if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return true;
        }
        return false;
    }

    function getObstacleInteraction(x, y) {
        if (!elementInteraction.enabled || obstacleBounds.length === 0) return { blocked: false, forceX: 0, forceY: 0, opacity: 1 };
        var mode = elementInteraction.mode;
        var result = { blocked: false, forceX: 0, forceY: 0, opacity: 1 };
        for (var b = 0; b < obstacleBounds.length; b++) {
            var bounds = obstacleBounds[b];
            var insideX = x >= bounds.x && x <= bounds.x + bounds.width;
            var insideY = y >= bounds.y && y <= bounds.y + bounds.height;
            var inside = insideX && insideY;
            var cx = bounds.x + bounds.width / 2;
            var cy = bounds.y + bounds.height / 2;
            var dx = (x - cx) * canvas.width;
            var dy = (y - cy) * canvas.height;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var halfWidth = bounds.pWidth / 2;
            var halfHeight = bounds.pHeight / 2;

            switch (mode) {
                case 'hardCorner':
                    if (inside) { result.blocked = true; result.opacity = 0; }
                    break;
                case 'softEdge':
                    var edgeDist = inside ? 0 : Math.max(0, Math.min(Math.abs((x - cx) * canvas.width) - halfWidth, Math.abs((y - cy) * canvas.height) - halfHeight));
                    var fadeRadius = elementInteraction.softEdgeRadius;
                    if (inside) { result.blocked = true; result.opacity = 0; }
                    else if (edgeDist < fadeRadius) { result.opacity = Math.min(result.opacity, edgeDist / fadeRadius); }
                    break;
                case 'forceField':
                    if (dist < elementInteraction.forceFieldRadius + halfWidth) {
                        var factor = 1 - (dist / (elementInteraction.forceFieldRadius + halfWidth));
                        var force = factor * elementInteraction.forceFieldStrength;
                        var angle = Math.atan2(dy, dx);
                        result.forceX += Math.cos(angle) * force;
                        result.forceY += Math.sin(angle) * force;
                    }
                    if (inside) result.blocked = true;
                    break;
                case 'attractField':
                    if (dist < elementInteraction.attractFieldRadius + halfWidth && !inside) {
                        var factor = 1 - (dist / (elementInteraction.attractFieldRadius + halfWidth));
                        var force = factor * elementInteraction.attractFieldStrength;
                        var angle = Math.atan2(dy, dx);
                        result.forceX -= Math.cos(angle) * force;
                        result.forceY -= Math.sin(angle) * force;
                    }
                    break;
                case 'turbulence':
                    if (dist < bounds.pWidth * 2 && !inside) {
                        var angle = Math.atan2(dy, dx) + Math.PI / 2;
                        var factor = (1 - dist / (bounds.pWidth * 2)) * elementInteraction.turbulenceIntensity;
                        result.forceX += Math.cos(angle) * factor * (Math.sin(Date.now() / elementInteraction.turbulenceScale) * 0.5 + 0.5);
                        result.forceY += Math.sin(angle) * factor * (Math.cos(Date.now() / elementInteraction.turbulenceScale) * 0.5 + 0.5);
                    }
                    break;
            }
        }
        return result;
    }

    function splat(x, y, dx, dy, color) {
        lastInputTime = Date.now();
        gl.useProgram(programs.splat.program);
        gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(programs.splat.uniforms.point, x, y);
        gl.uniform3f(programs.splat.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(programs.splat.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
        blit(velocity.write);
        velocity.swap();
        gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(programs.splat.uniforms.color, color.r, color.g, color.b);
        blit(dye.write);
        dye.swap();
    }

    function splatPointer(pointer) {
        var dx = pointer.deltaX * config.SPLAT_FORCE * config.PROJECTION_DISTANCE * liveControls.interactionForce;
        var dy = pointer.deltaY * config.SPLAT_FORCE * config.PROJECTION_DISTANCE * liveControls.interactionForce;
        var color = pointer.color;
        if (elementInteraction.enabled && elementInteraction.affectNewSplats) {
            var interaction = getObstacleInteraction(pointer.texcoordX, pointer.texcoordY);
            if (interaction.blocked) return;
            dx += interaction.forceX;
            dy += interaction.forceY;
            color = { r: pointer.color.r * interaction.opacity, g: pointer.color.g * interaction.opacity, b: pointer.color.b * interaction.opacity };
        }
        splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
    }

    function correctRadius(radius) {
        var aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) radius *= aspectRatio;
        return radius;
    }

    // Event listeners
    if (cursorSettings.siblingHoverMode) {
        document.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            var isInBounds = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            if (isInBounds) { updatePointerMoveData(pointers[0], e.clientX - rect.left, e.clientY - rect.top); }
        });
        document.addEventListener('mousedown', function (e) {
            var rect = canvas.getBoundingClientRect();
            var isInBounds = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            if (isInBounds) { pointers[0].down = true; pointers[0].color = generateColor(); }
        });
        document.addEventListener('mouseup', function () { pointers[0].down = false; });
    } else {
        blockContainer.addEventListener('mousemove', function (e) {
            var rect = canvas.getBoundingClientRect();
            updatePointerMoveData(pointers[0], e.clientX - rect.left, e.clientY - rect.top);
        });
        blockContainer.addEventListener('mousedown', function () { pointers[0].down = true; pointers[0].color = generateColor(); });
        blockContainer.addEventListener('mouseup', function () { pointers[0].down = false; });
    }

    // Touch events
    document.addEventListener('touchstart', function (e) {
        var touches = e.touches;
        while (touches.length >= pointers.length) pointers.push(new Pointer());
        for (var i = 0; i < touches.length; i++) {
            var rect = canvas.getBoundingClientRect();
            var posX = (touches[i].clientX - rect.left) * (canvas.width / rect.width);
            var posY = (touches[i].clientY - rect.top) * (canvas.height / rect.height);
            updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        var touches = e.touches;
        for (var i = 0; i < touches.length; i++) {
            var pointer = pointers[i + 1];
            if (!pointer || !pointer.down) continue;
            var rect = canvas.getBoundingClientRect();
            var posX = (touches[i].clientX - rect.left) * (canvas.width / rect.width);
            var posY = (touches[i].clientY - rect.top) * (canvas.height / rect.height);
            updatePointerMoveData(pointer, posX, posY);
        }
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        var touches = e.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            var pointer = pointers.find(function (p) { return p.id === touches[i].identifier; });
            if (pointer) pointer.down = false;
        }
    }, { passive: true });

    function updatePointerDownData(pointer, id, posX, posY) {
        pointer.id = id;
        pointer.down = true;
        pointer.moved = false;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.deltaX = 0;
        pointer.deltaY = 0;
        pointer.color = generateColor();
    }

    function updatePointerMoveData(pointer, posX, posY) {
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
        pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
        pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
        if (pointer.moved) {
            var pixelDx = pointer.deltaX * canvas.width;
            var pixelDy = pointer.deltaY * canvas.height;
            pointer.distanceSinceColorChange += Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);
            var threshold = colorSettings.colorChangeDistance;
            if (threshold === 0 || pointer.distanceSinceColorChange >= threshold) {
                pointer.color = generateColor();
                pointer.distanceSinceColorChange = 0;
            }
        }
    }

    function correctDeltaX(delta) {
        var aspectRatio = canvas.width / canvas.height;
        if (aspectRatio < 1) delta *= aspectRatio;
        return delta;
    }

    function correctDeltaY(delta) {
        var aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) delta /= aspectRatio;
        else if (aspectRatio < 1) delta /= aspectRatio;
        return delta;
    }

    function multipleSplats(amount) {
        for (var i = 0; i < amount; i++) {
            var color = generateColor();
            color.r *= 10.0; color.g *= 10.0; color.b *= 10.0;
            splat(Math.random(), Math.random(), 1000 * (Math.random() - 0.5), 1000 * (Math.random() - 0.5), color);
        }
    }

    // Initial shapes
    function executeInitialShapes() {
        if (!initialShapes || initialShapes.length === 0) {
            multipleSplats(parseInt(Math.random() * 5) + 5);
            return;
        }

        function generatePathPoints(shape, x, y, angleOffset, sizeMultiplier) {
            var points = [];
            var props = shape.props || {};
            var sizeMult = sizeMultiplier || 1;

            switch (shape.type) {
                case 'stroke': {
                    var length = ((props.length || 100) * sizeMult) / canvas.width;
                    var angle = ((props.angle || 0) * Math.PI / 180) + angleOffset;
                    for (var i = 0; i <= 30; i++) {
                        var t = i / 30;
                        points.push({ x: x + (t - 0.5) * length * Math.cos(angle), y: y + (t - 0.5) * length * Math.sin(angle) });
                    }
                    break;
                }
                case 'circle': {
                    var radius = ((props.radius || 50) * sizeMult) / canvas.width;
                    for (var i = 0; i <= 36; i++) {
                        var angle = (i / 36) * Math.PI * 2 + angleOffset;
                        points.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
                    }
                    break;
                }
                case 'ellipse': {
                    var rx = ((props.radiusX || 60) * sizeMult) / canvas.width;
                    var ry = ((props.radiusY || 40) * sizeMult) / canvas.height;
                    var rotation = ((props.rotation || 0) * Math.PI / 180) + angleOffset;
                    for (var i = 0; i <= 36; i++) {
                        var a = (i / 36) * Math.PI * 2;
                        var ex = Math.cos(a) * rx;
                        var ey = Math.sin(a) * ry;
                        points.push({ x: x + ex * Math.cos(rotation) - ey * Math.sin(rotation), y: y + ex * Math.sin(rotation) + ey * Math.cos(rotation) });
                    }
                    break;
                }
                case 'rectangle': {
                    var w = ((props.width || 80) * sizeMult) / canvas.width;
                    var h = ((props.height || 50) * sizeMult) / canvas.height;
                    var rotation = ((props.rotation || 0) * Math.PI / 180) + angleOffset;
                    var corners = [[-w/2, -h/2], [w/2, -h/2], [w/2, h/2], [-w/2, h/2], [-w/2, -h/2]];
                    for (var c = 0; c < 4; c++) {
                        for (var i = 0; i <= 8; i++) {
                            var t = i / 8;
                            var lx = corners[c][0] + t * (corners[c + 1][0] - corners[c][0]);
                            var ly = corners[c][1] + t * (corners[c + 1][1] - corners[c][1]);
                            points.push({ x: x + lx * Math.cos(rotation) - ly * Math.sin(rotation), y: y + lx * Math.sin(rotation) + ly * Math.cos(rotation) });
                        }
                    }
                    break;
                }
                case 'svg':
                case 'path': {
                    var pathData = props.pathData || props.points || '';
                    var rotation = ((props.rotation || 0) * Math.PI / 180) + angleOffset;
                    var userScale = props.scale || 1;
                    var rawPoints = [];
                    var isDrawnPath = false;

                    if (typeof pathData === 'string' && pathData.trim().length > 0) {
                        isDrawnPath = pathData.indexOf(',') > -1 && pathData.indexOf('M') === -1;
                        if (isDrawnPath) {
                            var pairs = pathData.split(' ');
                            for (var i = 0; i < pairs.length; i++) {
                                var coords = pairs[i].split(',');
                                if (coords.length === 2) {
                                    rawPoints.push({ x: parseFloat(coords[0]) || 0, y: parseFloat(coords[1]) || 0 });
                                }
                            }
                        } else {
                            try {
                                var tmpCanvas = document.createElement('canvas');
                                tmpCanvas.width = 200; tmpCanvas.height = 200;
                                var tmpCtx = tmpCanvas.getContext('2d');
                                var path2d = new Path2D(pathData);
                                var svgBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
                                for (var px = 0; px < 200; px += 2) {
                                    for (var py = 0; py < 200; py += 2) {
                                        if (tmpCtx.isPointInStroke(path2d, px, py)) {
                                            svgBounds.minX = Math.min(svgBounds.minX, px);
                                            svgBounds.minY = Math.min(svgBounds.minY, py);
                                            svgBounds.maxX = Math.max(svgBounds.maxX, px);
                                            svgBounds.maxY = Math.max(svgBounds.maxY, py);
                                        }
                                    }
                                }

                                if (svgBounds.minX !== Infinity) {
                                    var bw = svgBounds.maxX - svgBounds.minX;
                                    var bh = svgBounds.maxY - svgBounds.minY;
                                    var bcx = svgBounds.minX + bw / 2;
                                    var bcy = svgBounds.minY + bh / 2;
                                    var samples = 60;
                                    var visited = new Set();
                                    for (var angle = 0; angle < Math.PI * 2; angle += Math.PI * 2 / samples) {
                                        for (var r = 0; r < Math.max(bw, bh); r += 1) {
                                            var sx = bcx + Math.cos(angle) * r;
                                            var sy = bcy + Math.sin(angle) * r;
                                            var key = Math.round(sx) + ',' + Math.round(sy);
                                            if (!visited.has(key)) {
                                                visited.add(key);
                                                if (tmpCtx.isPointInStroke(path2d, sx, sy)) {
                                                    rawPoints.push({ x: (sx - bcx) / bw, y: (sy - bcy) / bh });
                                                }
                                            }
                                        }
                                    }
                                    rawPoints.sort(function (a, b) { return Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x); });
                                }
                            } catch (e) { /* ignore SVG parse errors */ }
                        }
                    }

                    if (rawPoints.length > 0) {
                        var pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
                        for (var i = 0; i < rawPoints.length; i++) {
                            pMinX = Math.min(pMinX, rawPoints[i].x);
                            pMinY = Math.min(pMinY, rawPoints[i].y);
                            pMaxX = Math.max(pMaxX, rawPoints[i].x);
                            pMaxY = Math.max(pMaxY, rawPoints[i].y);
                        }
                        var rangeX = pMaxX - pMinX || 1;
                        var rangeY = pMaxY - pMinY || 1;
                        var centerX = pMinX + rangeX / 2;
                        var centerY = pMinY + rangeY / 2;
                        var baseScale = isDrawnPath ? (1.0 / Math.max(rangeX, rangeY)) * 0.3 : 0.3;
                        var finalScale = baseScale * userScale * sizeMult;

                        for (var i = 0; i < rawPoints.length; i++) {
                            var sx = (rawPoints[i].x - centerX) * finalScale;
                            var sy = (rawPoints[i].y - centerY) * finalScale;
                            points.push({ x: x + sx * Math.cos(rotation) - sy * Math.sin(rotation), y: y + sx * Math.sin(rotation) + sy * Math.cos(rotation) });
                        }
                    }
                    break;
                }
            }
            return points;
        }

        function animateAlongPath(points, duration, speed, baseColor, force, colorSpeed) {
            if (points.length < 2) return;
            var startTime = performance.now();
            var forceMultiplier = 400 * speed * (force || 1);
            var lastX = points[0].x;
            var lastY = points[0].y;
            var hueShiftRate = colorSpeed || 0;

            function animate(currentTime) {
                var elapsed = currentTime - startTime;
                var progress = Math.min(elapsed / duration, 1);
                var pathPos = progress * (points.length - 1);
                var idx = Math.floor(pathPos);
                var t = pathPos - idx;
                var p1 = points[Math.min(idx, points.length - 1)];
                var p2 = points[Math.min(idx + 1, points.length - 1)];
                var smoothT = t * t * (3 - 2 * t);
                var currentX = p1.x + smoothT * (p2.x - p1.x);
                var currentY = p1.y + smoothT * (p2.y - p1.y);
                var deltaX = (currentX - lastX) * forceMultiplier;
                var deltaY = (currentY - lastY) * forceMultiplier;
                var color = baseColor;
                if (hueShiftRate > 0) {
                    color = { r: (baseColor.r + progress * hueShiftRate * 0.5) % 1, g: (baseColor.g + progress * hueShiftRate * 0.3) % 1, b: (baseColor.b + progress * hueShiftRate * 0.7) % 1 };
                }
                if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
                    splat(currentX, currentY, deltaX, deltaY, color);
                }
                lastX = currentX;
                lastY = currentY;
                if (progress < 1) requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);
        }

        initialShapes.forEach(function (shape) {
            var randomOffset = function (range) { if (!range || range.length < 2) return 0; return range[0] + Math.random() * (range[1] - range[0]); };
            var hexToRgb = function (hex) { var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : null; };

            var delay = (shape.timing && shape.timing.delay) || 0;
            var duration = (shape.timing && shape.timing.duration) || 500;
            var repeat = (shape.timing && shape.timing.repeat) || 0;
            var repeatDelay = (shape.timing && shape.timing.repeatDelay) || 0;
            var shouldRandomizeColor = shape.randomizeColor !== false;
            var cachedColor = !shouldRandomizeColor ? generateColor() : null;

            var executeShape = function () {
                var x = (shape.x + randomOffset(shape.random && shape.random.x)) / 100;
                var y = 1 - (shape.y + randomOffset(shape.random && shape.random.y)) / 100;
                var angleOffset = randomOffset(shape.random && shape.random.angle) * (Math.PI / 180);
                var speedOffset = randomOffset(shape.random && shape.random.speed);
                var speed = ((shape.props && shape.props.speed) || 1) + speedOffset;
                var sizeMultiplier = 1 + (randomOffset(shape.random && shape.random.size) / 100);
                var forceOffset = randomOffset(shape.random && shape.random.force);
                var force = (shape.force || 1) + forceOffset;
                var points = generatePathPoints(shape, x, y, angleOffset, sizeMultiplier);
                var color;
                if (shape.colorMode === 'fixed' && shape.color) {
                    color = hexToRgb(shape.color) || generateColor();
                } else if (cachedColor) {
                    color = cachedColor;
                } else {
                    color = generateColor();
                }
                animateAlongPath(points, duration, speed, color, force, shape.colorSpeed);
            };

            var scheduleExecution = function (iteration) {
                setTimeout(executeShape, delay + (iteration * (duration + repeatDelay)));
            };

            scheduleExecution(0);
            for (var r = 1; r <= repeat; r++) scheduleExecution(r);
        });
    }

    executeInitialShapes();
    update();
}
