import {fileURLToPath} from 'node:url';
import {renderProject} from '../../render-engine/render-entry.mjs';

await renderProject(fileURLToPath(new URL('.', import.meta.url)));
