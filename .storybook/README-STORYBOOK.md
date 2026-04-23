# Storybook Documentation

This project uses Storybook for component development, testing, and documentation. Storybook provides an isolated environment to develop and test UI components in isolation.

## Quick Start

```bash
# Start Storybook development server
pnpm storybook

# Build Storybook for production
pnpm build-storybook
```

## Run tests on Command Line Interface

```bash
# Run snapshot tests
pnpm test-storybook:snapshot

# Update Snapshot files locally and run tests
pnpm test-storybook:snapshot:update

# Run Interaction tests
pnpm test-storybook:interaction

# Run Interaction tests against static build
pnpm test-storybook:static:interaction

# Run A11y tests
pnpm test-storybook:a11y

# Run A11y tests against static build
pnpm test-storybook:static:a11y
```

**Storybook URL:** http://localhost:6006

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm storybook` | Start Storybook development server on port 6006 |
| `pnpm build-storybook` | Build static Storybook for production deployment |
| `pnpm test-storybook:snapshot` | Run snapshot tests |
| `pnpm test-storybook:snapshot:update` | Update Snapshot files locally and run tests |
| `pnpm test-storybook:interaction` | Run Interaction tests against live Storybook server |
| `pnpm test-storybook:static:interaction` | Run Interaction tests against static Storybook build |
| `pnpm test-storybook:a11y` | Run A11y tests against live Storybook server |
| `pnpm test-storybook:static:a11y` | Run A11y tests against static Storybook build | 

## Features & Addons

This Storybook setup includes the following addons:

- **@storybook/addon-docs** - Automatic documentation generation
- **@storybook/addon-a11y** - Accessibility testing and validation
- **@storybook/addon-vitest** - Integration with Vitest for component testing
- **@chromatic-com/storybook** - Visual testing and review (optional)
- **Viewport Toolbar** - Built-in toolbar for testing different screen sizes (Mobile, Tablet, Desktop)

> **Note**: We use Storybook's built-in viewport toolbar instead of creating separate viewport stories. Use the viewport selector in the Storybook toolbar to test components at different screen sizes.

## Project Structure

```
src/
├── components/
│   ├── buttons/
│   │   ├── login-submit-button.tsx
│   │   ├── login-submit-button.stories.tsx
│   │   ├── ...
│   └── ui/
│       ├── button.tsx
│   │   ├── button.stories.tsx
│       └── ...
└── .storybook/
    ├── main.ts
    ├── vite.config.ts
    ├── shims/
    │   └── shopper-agent-context-ui.ts   # Storybook-only (see below)
    └── preview.tsx
```

### Production vs Storybook: `shopper-agent-context-ui` shim

PDP FAQ and the account Need Help **Ask a question** action are gated in production by `src/lib/shopper-agent-context-ui.ts`. Storybook still needs those UIs to show up in stories without changing production defaults.

**What we do:** `.storybook/vite.config.ts` adds a resolve alias so `@/lib/shopper-agent-context-ui` points at `.storybook/shims/shopper-agent-context-ui.ts` when Storybook builds. That shim implements `isShopperAgentContextUiEnabled()` as `true` while the production file returns the real `SHOPPER_AGENT_CONTEXT_UI_ENABLED` constant. The storefront `vite build` and Vitest unit tests resolve the normal `src/lib/` module — no Storybook branching in shipped code.

**Why not `globalThis` in production utilities?** Putting Storybook detection in shared runtime code mixes concerns, invites duplicated magic strings (`preview.tsx`, tests, utils), and adds an unnecessary branch on every call.

**Why not environment variables for “am I Storybook?”** An `import.meta.env.STORYBOOK`-style flag would still require production modules to depend on Storybook-specific keys or strip them carefully in prod builds. Env is also easier to get wrong across CI, Managed Runtime, and local dev. A **build-time module alias** limits the override to the Storybook bundle only.

**Unit tests:** Mock `@/lib/shopper-agent-context-ui` when you need context UI enabled; otherwise imports use the real module (`false` until you change the constant).

## Creating Stories

### Basic Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Description of what this component does.',
      },
    },
  },
  argTypes: {
    // Define controls for component props
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};
```

### Basic Story Structure with Play function for Interaction Tests

```typescript
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent } from '@storybook/test';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'primary' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
  },
};
```

### Basic Story Structure with Actions

```typescript
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionLogger } from './ActionLogger';

const meta: Meta<typeof ActionLogger> = {
  title: 'Utils/ActionLogger',
  component: ActionLogger,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <ActionLogger>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button>Edit</button>
        <button>Remove</button>
      </div>
    </ActionLogger>
  ),
};
```

### Story Best Practices

1. **Naming Convention**: Use PascalCase for story names (e.g., `Default`, `Loading`, `Error`)
2. **Organization**: Group related stories under logical categories
3. **Documentation**: Include component descriptions and prop documentation
4. **Controls**: Use `argTypes` to make components interactive
5. **Variants**: Create stories for different states (loading, error, success)
6. **Accessibility**: Test with the a11y addon
7. **Viewport Testing**: Use Storybook's built-in viewport toolbar instead of creating separate Mobile/Tablet/Desktop stories

### Mock Components for Storybook

When components depend on external services or complex context, create mock versions:

```typescript
// Mock wrapper component for Storybook
const MockMyComponent = ({ 
  isLoading = false,
  error = null 
}: { 
  isLoading?: boolean;
  error?: string | null;
}) => {
  // Mock implementation that doesn't depend on external services
  return (
    <div>
      {isLoading ? 'Loading...' : 'Component content'}
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

## ESLint Integration

This project includes `eslint-plugin-storybook` for Storybook-specific linting:

- Enforces Storybook best practices
- Catches common mistakes in story files
- Ensures consistent story structure
- Validates story naming conventions

## Configuration

Storybook configuration is located in `.storybook/main.ts`:

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the port in the storybook command
   ```bash
   pnpm storybook --port 6007
   ```

2. **Build Errors**: Check that all dependencies are installed
   ```bash
   pnpm install
   ```

3. **Story Not Loading**: Verify the story file follows the correct naming convention (`*.stories.tsx`)

4. **TypeScript Errors**: Ensure your component props are properly typed

### Getting Help

- Check the [Storybook documentation](https://storybook.js.org/docs)
- Review existing stories in the project for examples
- Use the Storybook UI to explore available controls and addons

## Contributing

When adding new components:

1. Create the component in the appropriate directory
2. Add a corresponding `.stories.tsx` file
3. Include multiple story variants
4. Test accessibility with the a11y addon
5. Document the component's purpose and usage
6. Ensure the story passes ESLint checks