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
    // Register the block
    register_block_type(FGB_PLUGIN_DIR . 'build/blocks/fluid-group');
}
add_action('init', 'fgb_register_block');

/**
 * Enqueue frontend fluid simulation script
 */
function fgb_enqueue_frontend_assets() {
    if (!is_admin()) {
        wp_register_script(
            'fgb-fluid-simulation',
            FGB_PLUGIN_URL . 'assets/fluid.js',
            array(),
            FGB_VERSION,
            true
        );
        
        wp_register_style(
            'fgb-fluid-style',
            FGB_PLUGIN_URL . 'assets/style.css',
            array(),
            FGB_VERSION
        );
    }
}
add_action('wp_enqueue_scripts', 'fgb_enqueue_frontend_assets');

/**
 * Enqueue assets when block is present
 */
function fgb_enqueue_block_assets($block_content, $block) {
    if ($block['blockName'] === 'fgb/fluid-group') {
        $attrs = $block['attrs'] ?? [];
        if (!empty($attrs['enableFluid'])) {
            wp_enqueue_script('fgb-fluid-simulation');
            wp_enqueue_style('fgb-fluid-style');
        }
    }
    return $block_content;
}
add_filter('render_block', 'fgb_enqueue_block_assets', 10, 2);
