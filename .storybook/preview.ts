import type { Preview } from '@storybook/react-vite';
import React from 'react';
import '../src/app.css'; // Import global CSS

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },

        a11y: {
            // 'todo' - show a11y violations in the test UI only
            // 'error' - fail CI on a11y violations
            // 'off' - skip a11y checks entirely
            test: 'todo',
        },
    },
    decorators: [
        (Story) =>
            React.createElement(
                'div',
                { className: 'min-h-screen bg-background text-foreground' },
                React.createElement(Story)
            ),
    ],
};

export default preview;
