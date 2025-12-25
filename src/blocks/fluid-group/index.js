/**
 * Fluid Gradient Group Block
 */

import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import save from './save';
import metadata from './block.json';

import './editor.css';

registerBlockType(metadata.name, {
    ...metadata,
    edit: Edit,
    save,
});
