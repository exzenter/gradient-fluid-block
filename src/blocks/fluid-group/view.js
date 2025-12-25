/**
 * Fluid Gradient Group Block - View Script
 * Initializes fluid simulation on frontend for blocks with fluid enabled
 */

document.addEventListener('DOMContentLoaded', function () {
    const fluidBlocks = document.querySelectorAll('.fgb-fluid-group[data-fluid-enabled="true"]');

    fluidBlocks.forEach(function (block) {
        const canvas = block.querySelector('.fgb-fluid-canvas');
        if (!canvas) return;

        const settingsAttr = block.getAttribute('data-fluid-settings');
        let settings = {};

        try {
            settings = JSON.parse(settingsAttr) || {};
        } catch (e) {
            console.error('Failed to parse fluid settings:', e);
        }

        // Initialize fluid simulation on this canvas
        initFluidSimulation(canvas, settings);
    });
});

/**
 * Initialize WebGL Fluid Simulation
 */
function initFluidSimulation(canvas, userSettings) {
    // Default configuration - use explicit undefined checks for values that can be 0
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

    // Element Interaction settings
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
        affectNewSplats: elemInteractionSettings.affectNewSplats !== false,
        affectExistingFluid: elemInteractionSettings.affectExistingFluid ?? false,
        edgeGlow: elemInteractionSettings.edgeGlow ?? false,
        edgeGlowIntensity: elemInteractionSettings.edgeGlowIntensity ?? 0.5,
        edgeGlowDistance: elemInteractionSettings.edgeGlowDistance ?? 15,
        edgeGlowMatchFluid: elemInteractionSettings.edgeGlowMatchFluid ?? true,
        edgeGlowColor: elemInteractionSettings.edgeGlowColor ?? '#ffffff',
    };

    // Obstacle/element bounds storage
    let obstacleBounds = [];

    // Get element bounds relative to canvas
    function getElementBoundsRelativeToCanvas(element) {
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();

        // Calculate normalized coordinates (0-1 range)
        // Note: pointer.texcoordY uses (1 - y) for WebGL, so we need to match that
        const normalizedX = (elemRect.left - canvasRect.left) / canvasRect.width;
        const normalizedY = 1.0 - (elemRect.bottom - canvasRect.top) / canvasRect.height; // Flip Y for WebGL
        const normalizedWidth = elemRect.width / canvasRect.width;
        const normalizedHeight = elemRect.height / canvasRect.height;

        return {
            // Normalized 0-1 coordinates (WebGL coord system)
            x: normalizedX,
            y: normalizedY,
            width: normalizedWidth,
            height: normalizedHeight,
            // Pixel coordinates for calculations
            px: elemRect.left - canvasRect.left,
            py: elemRect.top - canvasRect.top,
            pWidth: elemRect.width,
            pHeight: elemRect.height,
        };
    }

    // Update obstacle bounds from DOM elements
    function updateObstacleBounds() {
        if (!elementInteraction.enabled || !elementInteraction.selectors) {
            obstacleBounds = [];
            return;
        }
        try {
            const elements = document.querySelectorAll(elementInteraction.selectors);
            obstacleBounds = Array.from(elements).map(el => getElementBoundsRelativeToCanvas(el));
        } catch (e) {
            console.warn('Invalid element selectors:', e);
            obstacleBounds = [];
        }
    }

    // Gradient mode state - tracks current hue for smooth transitions
    let gradientHue = Math.random();

    // Calm down mode - track last input time
    let lastInputTime = Date.now();

    // Apply canvas blend and filter styles
    canvas.style.mixBlendMode = colorSettings.blendMode;
    if (colorSettings.negativeBloom) {
        canvas.style.filter = 'invert(1)';
    }

    // Pointer tracking
    class Pointer {
        constructor() {
            this.id = -1;
            this.texcoordX = 0;
            this.texcoordY = 0;
            this.prevTexcoordX = 0;
            this.prevTexcoordY = 0;
            this.deltaX = 0;
            this.deltaY = 0;
            this.down = false;
            this.moved = false;
            this.color = { r: 0.5, g: 0.2, b: 0.8 };
            this.distanceSinceColorChange = 0;
        }
    }

    let pointers = [new Pointer()];

    // WebGL context initialization
    function getWebGLContext(canvas) {
        const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

        let gl = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;

        if (!isWebGL2) {
            gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        }

        if (!gl) {
            console.error('WebGL not supported');
            return null;
        }

        let halfFloat;
        let supportLinearFiltering;

        if (isWebGL2) {
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
            halfFloat = gl.HALF_FLOAT;
        } else {
            const halfFloatExt = gl.getExtension('OES_texture_half_float');
            halfFloat = halfFloatExt ? halfFloatExt.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
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

        return {
            gl,
            ext: {
                formatRGBA,
                formatRG,
                formatR,
                halfFloatTexType: halfFloat,
                supportLinearFiltering: !!supportLinearFiltering,
            },
            isWebGL2
        };
    }

    function getSupportedFormat(gl, internalFormat, format, type, isWebGL2) {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
            if (isWebGL2) {
                switch (internalFormat) {
                    case gl.R16F:
                        return getSupportedFormat(gl, gl.RG16F, gl.RG, type, isWebGL2);
                    case gl.RG16F:
                        return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type, isWebGL2);
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

    // Initialize context
    const context = getWebGLContext(canvas);
    if (!context) return;

    const { gl, ext, isWebGL2 } = context;

    // Compile shader helper
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

    // Create program helper
    function createProgram(vertexSource, fragmentSource) {
        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
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

    // Shader sources
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

    // Initialize programs
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

    // Initialize vertex buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

    // Blit function
    function blit(target, clear = false) {
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

    // Framebuffer objects
    let dye;
    let velocity;
    let divergenceFBO;
    let curlFBO;
    let pressure;
    let bloom;
    let bloomFramebuffers = [];

    function getResolution(resolution) {
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

        const min = Math.round(resolution);
        const max = Math.round(resolution * aspectRatio);

        if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
            return { width: max, height: min };
        }
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
            texture,
            fbo,
            width: w,
            height: h,
            texelSizeX,
            texelSizeY,
            attach(id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            },
        };
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
        let fbo1 = createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(w, h, internalFormat, format, type, param);

        return {
            width: w,
            height: h,
            texelSizeX: fbo1.texelSizeX,
            texelSizeY: fbo1.texelSizeY,
            get read() { return fbo1; },
            set read(value) { fbo1 = value; },
            get write() { return fbo2; },
            set write(value) { fbo2 = value; },
            swap() {
                const temp = fbo1;
                fbo1 = fbo2;
                fbo2 = temp;
            },
        };
    }
    // Store reference to block container for sizing
    const blockContainer = canvas.closest('.fgb-fluid-group');
    let lastWidth = 0;
    let lastHeight = 0;

    function resizeCanvas() {
        // Use offsetWidth/Height which respects CSS styling including minHeight
        const width = blockContainer.offsetWidth || 300;
        const height = blockContainer.offsetHeight || 200;

        // Only resize if dimensions actually changed significantly (prevents loops)
        if (Math.abs(width - lastWidth) > 1 || Math.abs(height - lastHeight) > 1) {
            // Prevent crazy sizes
            const maxSize = 4096;
            const safeWidth = Math.min(Math.max(width, 100), maxSize);
            const safeHeight = Math.min(Math.max(height, 100), maxSize);

            canvas.width = safeWidth;
            canvas.height = safeHeight;
            lastWidth = width;
            lastHeight = height;
            return true;
        }
        return false;
    }

    // Only resize on window resize, not every frame
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
            if (resizeCanvas()) {
                initFramebuffers();
            }
            // Update obstacle bounds on resize
            updateObstacleBounds();
        }, 100);
    });

    // Track scroll if enabled
    if (elementInteraction.enabled && elementInteraction.trackScroll) {
        window.addEventListener('scroll', function () {
            updateObstacleBounds();
        }, { passive: true });
    }

    // Initial obstacle bounds update
    if (elementInteraction.enabled) {
        // Delay to ensure DOM is ready
        setTimeout(updateObstacleBounds, 200);
    }

    function initFramebuffers() {
        const simRes = getResolution(config.SIM_RESOLUTION);
        const dyeRes = getResolution(config.DYE_RESOLUTION);

        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA;
        const rg = ext.formatRG;
        const r = ext.formatR;
        const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
        divergenceFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        curlFBO = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

        initBloomFramebuffers();
    }

    function initBloomFramebuffers() {
        const res = getResolution(config.BLOOM_RESOLUTION);
        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA;
        const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

        bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

        bloomFramebuffers.length = 0;
        for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
            const width = res.width >> (i + 1);
            const height = res.height >> (i + 1);
            if (width < 2 || height < 2) break;
            const fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
            bloomFramebuffers.push(fbo);
        }
    }

    resizeCanvas();
    initFramebuffers();

    // Color generation
    function generateColor() {
        let c;
        const boostedSat = Math.min(colorSettings.saturation * colorSettings.saturationBoost, 1.0);
        const mode = colorSettings.colorMode || 'rainbow';

        switch (mode) {
            case 'rainbow':
                // Full rainbow - completely random hue
                c = HSVtoRGB(Math.random(), boostedSat, 1.0);
                break;

            case 'huerange':
                // Limited hue range - random within specified bounds
                const hueMinNorm = colorSettings.hueMin / 360;
                const hueMaxNorm = colorSettings.hueMax / 360;
                let hue;
                if (hueMinNorm <= hueMaxNorm) {
                    // Normal range (e.g., 60-180 for greens)
                    hue = hueMinNorm + Math.random() * (hueMaxNorm - hueMinNorm);
                } else {
                    // Wrapped range (e.g., 300-60 for magentas to yellows via red)
                    const range = (1 - hueMinNorm) + hueMaxNorm;
                    hue = hueMinNorm + Math.random() * range;
                    if (hue > 1) hue -= 1;
                }
                c = HSVtoRGB(hue, boostedSat, 1.0);
                break;

            case 'gradient':
                // Smooth gradient - incrementally cycle through hues
                gradientHue += colorSettings.gradientSpeed * 0.01;
                if (gradientHue > 1) gradientHue -= 1;
                c = HSVtoRGB(gradientHue, boostedSat, 1.0);
                break;

            case 'single':
            default:
                // Single fixed color
                const hex = colorSettings.fixedColor || '#ff00ff';
                c = hexToRGB(hex);
                break;
        }

        c.r *= colorSettings.brightness;
        c.g *= colorSettings.brightness;
        c.b *= colorSettings.brightness;

        // Apply prevent overblending (color clamping)
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

    // Helper to convert hex to RGB
    function hexToRGB(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 0, b: 1 };
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

    // Update loop
    let lastUpdateTime = Date.now();

    function update() {
        const dt = calcDeltaTime();
        // Don't resize every frame - only on window resize
        applyInputs();
        step(dt);
        render(null);
        requestAnimationFrame(update);
    }

    function calcDeltaTime() {
        const now = Date.now();
        let dt = (now - lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        lastUpdateTime = now;
        return dt;
    }

    function applyInputs() {
        pointers.forEach((p) => {
            if (p.moved) {
                p.moved = false;
                splatPointer(p);
            }
        });
    }

    function step(dt) {
        gl.disable(gl.BLEND);

        // Curl
        gl.useProgram(programs.curl.program);
        gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curlFBO);

        // Vorticity
        gl.useProgram(programs.vorticity.program);
        gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.vorticity.uniforms.uCurl, curlFBO.attach(1));
        gl.uniform1f(programs.vorticity.uniforms.curl, config.CURL);
        gl.uniform1f(programs.vorticity.uniforms.dt, dt);
        blit(velocity.write);
        velocity.swap();

        // Divergence
        gl.useProgram(programs.divergence.program);
        gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergenceFBO);

        // Clear pressure
        gl.useProgram(programs.clear.program);
        gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(programs.clear.uniforms.value, config.PRESSURE);
        blit(pressure.write);
        pressure.swap();

        // Pressure solve
        gl.useProgram(programs.pressure.program);
        gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.pressure.uniforms.uDivergence, divergenceFBO.attach(0));
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        // Gradient subtract
        gl.useProgram(programs.gradientSubtract.program);
        gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        // Advection velocity
        gl.useProgram(programs.advection.program);
        gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        const velocityId = velocity.read.attach(0);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocityId);
        gl.uniform1i(programs.advection.uniforms.uSource, velocityId);
        gl.uniform1f(programs.advection.uniforms.dt, dt);

        // Apply calm down - increase damping when no input for a while
        let velocityDissipation = config.VELOCITY_DISSIPATION;
        if (config.CALM_DOWN) {
            const timeSinceInput = Date.now() - lastInputTime;
            if (timeSinceInput > config.CALM_DOWN_DELAY) {
                // Gradually apply stronger damping
                const calmFactor = Math.min((timeSinceInput - config.CALM_DOWN_DELAY) / 1000, 1);
                velocityDissipation = config.VELOCITY_DISSIPATION *
                    (1 - calmFactor) + config.CALM_DOWN_STRENGTH * calmFactor;
            }
        }
        gl.uniform1f(programs.advection.uniforms.dissipation, velocityDissipation);
        blit(velocity.write);
        velocity.swap();

        // Advection dye - apply fade speed (higher = lower dissipation = faster fade)
        gl.uniform2f(programs.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
        const adjustedDissipation = config.DENSITY_DISSIPATION / config.FADE_SPEED;
        gl.uniform1f(programs.advection.uniforms.dissipation, adjustedDissipation);
        blit(dye.write);
        dye.swap();

        // Apply obstacle effects to existing fluid if enabled
        if (elementInteraction.enabled && elementInteraction.affectExistingFluid && obstacleBounds.length > 0) {
            applyObstacleEffectsToFluid();
        }
    }

    // Apply obstacle effects to already-existing fluid on canvas
    function applyObstacleEffectsToFluid() {
        const mode = elementInteraction.mode;

        for (const bounds of obstacleBounds) {
            // Center of obstacle in normalized coords
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            switch (mode) {
                case 'hardCorner':
                case 'softEdge':
                    // Apply negative splat (subtract color) to clear fluid in obstacle area
                    const radius = mode === 'softEdge'
                        ? Math.max(bounds.width, bounds.height) * 0.5 + (elementInteraction.softEdgeRadius / canvas.width)
                        : Math.max(bounds.width, bounds.height) * 0.4;

                    // Clear velocity in obstacle area
                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, 0.0, 0.0, 0.0); // Zero velocity
                    gl.uniform1f(programs.splat.uniforms.radius, radius * 0.5);
                    blit(velocity.write);
                    velocity.swap();

                    // Dim/clear dye in obstacle area
                    gl.uniform1i(programs.splat.uniforms.uTarget, dye.read.attach(0));
                    // Use negative color to subtract existing colors
                    const clearStrength = mode === 'softEdge' ? -0.02 : -0.05;
                    gl.uniform3f(programs.splat.uniforms.color, clearStrength, clearStrength, clearStrength);
                    gl.uniform1f(programs.splat.uniforms.radius, radius * 0.5);
                    blit(dye.write);
                    dye.swap();
                    break;

                case 'forceField':
                    // Push existing fluid away from obstacle
                    const forceRadius = (elementInteraction.forceFieldRadius / canvas.width) + bounds.width * 0.5;
                    const forceStrength = elementInteraction.forceFieldStrength * 0.01;

                    // Apply outward velocity
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
                    // Pull existing fluid toward obstacle
                    const attractRadius = (elementInteraction.attractFieldRadius / canvas.width) + bounds.width * 0.5;
                    const attractStrength = -elementInteraction.attractFieldStrength * 0.005;

                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, attractStrength, attractStrength, 0.0);
                    gl.uniform1f(programs.splat.uniforms.radius, attractRadius);
                    blit(velocity.write);
                    velocity.swap();
                    break;

                case 'turbulence':
                    // Add swirling velocity around obstacle
                    const turbRadius = bounds.width + (elementInteraction.turbulenceIntensity / canvas.width);
                    const turbStrength = elementInteraction.turbulenceIntensity * 0.001;
                    const time = Date.now() / elementInteraction.turbulenceScale;
                    const swirl = Math.sin(time) * turbStrength;

                    gl.useProgram(programs.splat.program);
                    gl.uniform1i(programs.splat.uniforms.uTarget, velocity.read.attach(0));
                    gl.uniform1f(programs.splat.uniforms.aspectRatio, canvas.width / canvas.height);
                    gl.uniform2f(programs.splat.uniforms.point, cx, cy);
                    gl.uniform3f(programs.splat.uniforms.color, swirl, -swirl * 0.5, 0.0); // Rotational velocity
                    gl.uniform1f(programs.splat.uniforms.radius, turbRadius);
                    blit(velocity.write);
                    velocity.swap();
                    break;
            }
        }
    }

    function render(target) {
        if (config.BLOOM && bloomFramebuffers.length >= 2) {
            applyBloom(dye.read, bloom);
        }
        drawDisplay(target);
    }

    function drawDisplay(target) {
        const width = target == null ? gl.drawingBufferWidth : target.width;
        const height = target == null ? gl.drawingBufferHeight : target.height;

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

        let last = destination;

        gl.disable(gl.BLEND);

        gl.useProgram(programs.bloomPrefilter.program);
        const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
        const curve0 = config.BLOOM_THRESHOLD - knee;
        const curve1 = knee * 2;
        const curve2 = 0.25 / knee;
        gl.uniform3f(programs.bloomPrefilter.uniforms.curve, curve0, curve1, curve2);
        gl.uniform1f(programs.bloomPrefilter.uniforms.threshold, config.BLOOM_THRESHOLD);
        gl.uniform1i(programs.bloomPrefilter.uniforms.uTexture, source.attach(0));
        blit(last);

        gl.useProgram(programs.bloomBlur.program);
        for (let i = 0; i < bloomFramebuffers.length; i++) {
            const dest = bloomFramebuffers[i];
            gl.uniform2f(programs.bloomBlur.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
            gl.uniform1i(programs.bloomBlur.uniforms.uTexture, last.attach(0));
            blit(dest);
            last = dest;
        }

        gl.blendFunc(gl.ONE, gl.ONE);
        gl.enable(gl.BLEND);

        for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
            const baseTex = bloomFramebuffers[i];
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

    // Check if a point (normalized 0-1 coords) is inside any obstacle
    function isPointInObstacle(x, y) {
        for (const bounds of obstacleBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return true;
            }
        }
        return false;
    }

    // Get obstacle interaction effect for a point
    function getObstacleInteraction(x, y) {
        if (!elementInteraction.enabled || obstacleBounds.length === 0) {
            return { blocked: false, forceX: 0, forceY: 0, opacity: 1 };
        }

        const mode = elementInteraction.mode;
        let result = { blocked: false, forceX: 0, forceY: 0, opacity: 1 };

        for (const bounds of obstacleBounds) {
            // Check if inside obstacle
            const insideX = x >= bounds.x && x <= bounds.x + bounds.width;
            const insideY = y >= bounds.y && y <= bounds.y + bounds.height;
            const inside = insideX && insideY;

            // Center of obstacle (normalized)
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            // Distance to center (in pixels for radius calculations)
            const aspectRatio = canvas.width / canvas.height;
            const dx = (x - cx) * canvas.width;
            const dy = (y - cy) * canvas.height;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Distance to edge (rough approximation)
            const halfWidth = bounds.pWidth / 2;
            const halfHeight = bounds.pHeight / 2;
            const edgeDist = inside ? 0 : Math.max(0,
                Math.min(
                    Math.abs((x - cx) * canvas.width) - halfWidth,
                    Math.abs((y - cy) * canvas.height) - halfHeight
                )
            );

            switch (mode) {
                case 'hardCorner':
                    if (inside) {
                        result.blocked = true;
                        result.opacity = 0;
                    }
                    break;

                case 'softEdge':
                    const fadeRadius = elementInteraction.softEdgeRadius;
                    if (inside) {
                        result.blocked = true;
                        result.opacity = 0;
                    } else if (edgeDist < fadeRadius) {
                        result.opacity = Math.min(result.opacity, edgeDist / fadeRadius);
                    }
                    break;

                case 'forceField':
                    const forceRadius = elementInteraction.forceFieldRadius;
                    const forceStrength = elementInteraction.forceFieldStrength;
                    if (dist < forceRadius + halfWidth) {
                        const factor = 1 - (dist / (forceRadius + halfWidth));
                        const force = factor * forceStrength;
                        const angle = Math.atan2(dy, dx);
                        result.forceX += Math.cos(angle) * force;
                        result.forceY += Math.sin(angle) * force;
                    }
                    if (inside) {
                        result.blocked = true;
                    }
                    break;

                case 'attractField':
                    const attractRadius = elementInteraction.attractFieldRadius;
                    const attractStrength = elementInteraction.attractFieldStrength;
                    if (dist < attractRadius + halfWidth && !inside) {
                        const factor = 1 - (dist / (attractRadius + halfWidth));
                        const force = factor * attractStrength;
                        const angle = Math.atan2(dy, dx);
                        // Attract = negative of repel
                        result.forceX -= Math.cos(angle) * force;
                        result.forceY -= Math.sin(angle) * force;
                    }
                    break;

                case 'turbulence':
                    const turbRadius = bounds.pWidth;
                    const turbIntensity = elementInteraction.turbulenceIntensity;
                    const turbScale = elementInteraction.turbulenceScale;
                    if (dist < turbRadius * 2 && !inside) {
                        // Create swirling motion
                        const angle = Math.atan2(dy, dx) + Math.PI / 2; // Perpendicular
                        const factor = (1 - dist / (turbRadius * 2)) * turbIntensity;
                        result.forceX += Math.cos(angle) * factor * (Math.sin(Date.now() / turbScale) * 0.5 + 0.5);
                        result.forceY += Math.sin(angle) * factor * (Math.cos(Date.now() / turbScale) * 0.5 + 0.5);
                    }
                    break;
            }
        }

        return result;
    }

    function splat(x, y, dx, dy, color) {
        // Reset calm down timer on any input
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
        // Apply projection distance multiplier to shoot colors further in mouse direction
        let dx = pointer.deltaX * config.SPLAT_FORCE * config.PROJECTION_DISTANCE;
        let dy = pointer.deltaY * config.SPLAT_FORCE * config.PROJECTION_DISTANCE;
        let color = pointer.color;

        // Only check obstacle interaction if affectNewSplats is enabled
        if (elementInteraction.enabled && elementInteraction.affectNewSplats) {
            const interaction = getObstacleInteraction(pointer.texcoordX, pointer.texcoordY);

            // If blocked (inside obstacle), don't splat
            if (interaction.blocked) {
                return;
            }

            // Add force field effects
            dx += interaction.forceX;
            dy += interaction.forceY;

            // Apply opacity for soft edge (reduce color intensity)
            color = {
                r: pointer.color.r * interaction.opacity,
                g: pointer.color.g * interaction.opacity,
                b: pointer.color.b * interaction.opacity,
            };
        }

        splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
    }

    function correctRadius(radius) {
        const aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) radius *= aspectRatio;
        return radius;
    }

    // Event listeners - listen on entire block container so hovering nested blocks still triggers fluid
    blockContainer.addEventListener('mousemove', (e) => {
        const pointer = pointers[0];
        const rect = canvas.getBoundingClientRect();
        const posX = e.clientX - rect.left;
        const posY = e.clientY - rect.top;
        updatePointerMoveData(pointer, posX, posY);
    });

    blockContainer.addEventListener('mousedown', () => {
        const pointer = pointers[0];
        pointer.down = true;
        pointer.color = generateColor();
    });

    blockContainer.addEventListener('mouseup', () => {
        pointers[0].down = false;
    });

    // Hide cursor if enabled in settings
    if (userSettings.hideCursor) {
        blockContainer.style.cursor = 'none';
    }

    blockContainer.addEventListener('touchstart', (e) => {
        const touches = e.targetTouches;
        while (touches.length >= pointers.length) {
            pointers.push(new Pointer());
        }
        for (let i = 0; i < touches.length; i++) {
            const rect = canvas.getBoundingClientRect();
            const posX = touches[i].clientX - rect.left;
            const posY = touches[i].clientY - rect.top;
            updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
        }
    }, { passive: true });

    blockContainer.addEventListener('touchmove', (e) => {
        const touches = e.targetTouches;
        for (let i = 0; i < touches.length; i++) {
            const pointer = pointers[i + 1];
            if (!pointer || !pointer.down) continue;
            const rect = canvas.getBoundingClientRect();
            const posX = touches[i].clientX - rect.left;
            const posY = touches[i].clientY - rect.top;
            updatePointerMoveData(pointer, posX, posY);
        }
    }, { passive: true });

    blockContainer.addEventListener('touchend', (e) => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const pointer = pointers.find(p => p.id === touches[i].identifier);
            if (pointer) pointer.down = false;
        }
    });

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
            // Calculate pixel distance traveled
            const pixelDx = pointer.deltaX * canvas.width;
            const pixelDy = pointer.deltaY * canvas.height;
            const pixelDistance = Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);

            // Add to cumulative distance since last color change
            pointer.distanceSinceColorChange += pixelDistance;

            // Only generate new color if we've traveled enough distance (or colorChangeDistance is 0)
            const threshold = colorSettings.colorChangeDistance;
            if (threshold === 0 || pointer.distanceSinceColorChange >= threshold) {
                pointer.color = generateColor();
                pointer.distanceSinceColorChange = 0; // Reset distance counter
            }
        }
    }

    function correctDeltaX(delta) {
        const aspectRatio = canvas.width / canvas.height;
        if (aspectRatio < 1) delta *= aspectRatio;
        return delta;
    }

    function correctDeltaY(delta) {
        const aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) delta /= aspectRatio;
        return delta;
    }

    // Random splats
    function multipleSplats(amount) {
        for (let i = 0; i < amount; i++) {
            const color = generateColor();
            color.r *= 10.0;
            color.g *= 10.0;
            color.b *= 10.0;
            const x = Math.random();
            const y = Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            splat(x, y, dx, dy, color);
        }
    }

    // Start with initial splats
    multipleSplats(parseInt(Math.random() * 5) + 5);

    // Start animation loop
    update();
}
