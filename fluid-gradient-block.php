<?php
/**
 * Plugin Name: Fluid Gradient Block
 * Description: A Gutenberg block that works like Group but with an optional WebGL fluid dynamics background.
 * Version: 1.0.0
 * Author: Fluid Gradient
 * License: MIT
 * Text Domain: fluid-gradient-block
 */

if (!defined('ABSPATH')) {
    exit;
}

define('FGB_VERSION', '1.0.0');
define('FGB_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FGB_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Register the block and its assets
 */
function fgb_register_block() {
    register_block_type(FGB_PLUGIN_DIR . 'build/blocks/fluid-group');
}
add_action('init', 'fgb_register_block');

/**
 * Add critical inline CSS for the fluid block
 * This ensures positioning works even if the stylesheet doesn't load
 */
function fgb_add_critical_css() {
    ?>
    <style id="fgb-critical-css">
        .fgb-fluid-group {
            position: relative !important;
            overflow: hidden;
        }
        .fgb-fluid-canvas {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 0 !important;
            display: block;
        }
        .fgb-fluid-content {
            position: relative !important;
            z-index: 1 !important;
            width: 100%;
        }
    </style>
    <?php
}
add_action('wp_head', 'fgb_add_critical_css', 5);
