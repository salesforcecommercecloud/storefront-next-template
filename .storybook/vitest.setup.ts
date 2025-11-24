import { beforeAll } from 'vitest';
import { mockConfig } from '../src/test-utils/config';

// CRITICAL: Set window.__APP_CONFIG__ BEFORE importing any modules
// This ensures getConfig() works during module initialization in tests where it is used
// before the config provider is rendered (e.g., AuthContext initialization)
(window as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

// Now we can safely import other modules that depend on config
// eslint-disable-next-line import/no-namespace
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as projectAnnotations from './preview';

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

beforeAll(project.beforeAll);
