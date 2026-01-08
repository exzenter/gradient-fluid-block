# Fluid Gradient Block

A WordPress Gutenberg block that functions like the core Group block but with an optional WebGL fluid dynamics background.

## Installation

1. Navigate to the `fluid-gradient-block` folder
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile the block
4. Copy the entire `fluid-gradient-block` folder to your WordPress `wp-content/plugins/` directory
5. Activate the plugin in WordPress Admin

## Usage

1. In the Gutenberg editor, add a new block and search for "Fluid Gradient Group"
2. Add any blocks inside (paragraphs, headings, images, etc.)
3. In the block settings sidebar, toggle "Enable Fluid Dynamics"
4. Customize the fluid simulation using the available controls:
   - **Presets**: Choose from Default, Dreamy, Intense, Smoke, Water, Fire, Black on White, Neon
   - **Simulation**: Resolution settings
   - **Behavior**: Dissipation, pressure, curl
   - **Mouse Input**: Splat size and force
   - **Bloom**: Glow effect settings
   - **Colors**: Saturation, brightness, rainbow mode, dark mode
   - **Import/Export**: Copy and paste settings between blocks

## Global API

The plugin exposes a global function to initialize fluid blocks programmatically. This is useful for SPA transitions or dynamic content loading.

```javascript
// Initialize or re-initialize all fluid blocks
if (window.initFluidGroupBlocks) {
    window.initFluidGroupBlocks();
}
```

## Development

```bash
# Install dependencies
npm install

# Start development with watch mode
npm run start

# Build for production
npm run build
```

## Features

- ✅ Works like the native Group block (accepts any blocks inside)
- ✅ Full alignment, spacing, and color controls
- ✅ Interactive WebGL fluid simulation background
- ✅ 8 built-in presets
- ✅ Comprehensive customization options
- ✅ Import/Export settings via copy/paste
- ✅ Mobile touch support

## License

MIT
