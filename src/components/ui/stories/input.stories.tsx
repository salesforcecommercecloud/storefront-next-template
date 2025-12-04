import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../input';
import { Label } from '../label';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { within, userEvent, expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logChange = action('input-change');
        const logInput = action('input-input');
        const logFocus = action('input-focus');
        const logBlur = action('input-blur');
        const logKeyDown = action('input-keydown');
        const logEnter = action('input-enter');
        const logFiles = action('input-files-selected');

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const deriveLabel = (input: HTMLInputElement): string => {
            if (input.labels && input.labels.length > 0) {
                return sanitizeLabel(input.labels[0].textContent);
            }
            const label = input.ownerDocument?.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (label) {
                return sanitizeLabel(label.textContent);
            }
            return sanitizeLabel(input.getAttribute('aria-label') || input.name || input.id);
        };

        const getInfo = (input: HTMLInputElement) => ({
            label: deriveLabel(input),
            placeholder: input.placeholder || undefined,
            type: input.type,
            value: input.type === 'password' ? '••••' : input.value,
        });

        const isSyntheticEvent = (event: Event): boolean => event.isTrusted === false;

        const handleInput = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            if (input.type === 'file') {
                const files = input.files ? Array.from(input.files).map((f) => f.name) : [];
                logFiles({ label: deriveLabel(input), files, count: files.length });
            } else {
                logInput(getInfo(input));
            }
        };

        const handleChange = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            if (input.type === 'file') {
                const files = input.files ? Array.from(input.files).map((f) => f.name) : [];
                logFiles({ label: deriveLabel(input), files, count: files.length });
            } else {
                logChange(getInfo(input));
            }
        };

        const handleFocus = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            logFocus({ label: deriveLabel(input) });
        };

        const handleBlur = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            logBlur({ label: deriveLabel(input) });
        };

        const handleKeyDown = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const e = event as unknown as KeyboardEvent;
            const input = e.target as HTMLInputElement | null;
            if (!input) return;
            const payload = { label: deriveLabel(input), key: e.key };
            logKeyDown(payload);
            if (e.key === 'Enter') {
                e.preventDefault();
                logEnter(payload);
            }
        };

        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('focus', handleFocus, true);
        root.addEventListener('blur', handleBlur, true);
        root.addEventListener('keydown', handleKeyDown, true);

        return () => {
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('focus', handleFocus, true);
            root.removeEventListener('blur', handleBlur, true);
            root.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A versatile input component with built-in styling, focus states, and accessibility features. Supports all standard HTML input types and attributes.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        type: {
            description: 'HTML input type',
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'],
        },
        placeholder: {
            description: 'Placeholder text',
            control: 'text',
        },
        disabled: {
            description: 'Whether the input is disabled',
            control: 'boolean',
        },
        required: {
            description: 'Whether the input is required',
            control: 'boolean',
        },
        value: {
            description: 'Input value',
            control: 'text',
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        await userEvent.type(input, 'Default text');
        await userEvent.clear(input);
        await userEvent.type(input, 'Testing input component');
    },
};

export const WithLabel: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="input-with-label">Label</Label>
            <Input id="input-with-label" placeholder="Enter text..." autoComplete="off" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        await userEvent.click(input);
        await userEvent.type(input, 'Labelled input');
    },
};

export const Email: Story = {
    args: {
        type: 'email',
        placeholder: 'Enter your email',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const emailInput = canvas.getByPlaceholderText('Enter your email');
        await userEvent.type(emailInput, 'user@example.com');
        await userEvent.clear(emailInput);
        await userEvent.type(emailInput, 'another@example.com');
    },
};

export const Password: Story = {
    args: {
        type: 'password',
        placeholder: 'Enter your password',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const passwordInput = canvas.getByPlaceholderText('Enter your password');
        await userEvent.type(passwordInput, 'P@ssw0rd!');
        await userEvent.clear(passwordInput);
        await userEvent.type(passwordInput, 'AnotherPass123');
    },
};

export const Number: Story = {
    args: {
        type: 'number',
        placeholder: 'Enter a number',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const numberInput = canvas.getByPlaceholderText('Enter a number');
        await userEvent.type(numberInput, '12345');
        await userEvent.clear(numberInput);
        await userEvent.type(numberInput, '987');
    },
};

export const Search: Story = {
    args: {
        type: 'search',
        placeholder: 'Search...',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const searchInput = canvas.getByPlaceholderText('Search...');
        await userEvent.type(searchInput, 'Search Term');
        await userEvent.clear(searchInput);
        await userEvent.type(searchInput, 'Another Query');
    },
};

export const Disabled: Story = {
    args: {
        placeholder: 'Disabled input',
        disabled: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const disabledInput = canvas.getByPlaceholderText('Disabled input');
        void expect(disabledInput).toBeDisabled();
    },
};

export const WithValue: Story = {
    args: {
        value: 'Pre-filled value',
        placeholder: 'Enter text...',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const prefilledInput = canvas.getByDisplayValue('Pre-filled value');
        await userEvent.click(prefilledInput);
        await userEvent.keyboard('{selectall}{delete}');
        await userEvent.type(prefilledInput, 'Updated value');
    },
};

export const Required: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="required-input">Required Field *</Label>
            <Input id="required-input" placeholder="This field is required" required autoComplete="off" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const requiredInput = canvas.getByPlaceholderText('This field is required');
        await userEvent.type(requiredInput, 'Required text');
    },
};

export const File: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="file-input">Upload File</Label>
            <Input id="file-input" type="file" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const fileInput = canvasElement.querySelector('input[type="file"]');
        void expect(fileInput).toBeInTheDocument();
        void expect((fileInput as HTMLInputElement | null)?.type).toBe('file');
    },
};

export const Date: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="date-input">Select Date</Label>
            <Input id="date-input" type="date" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Date inputs don't have textbox role, use querySelector instead
        const dateInput = canvasElement.querySelector('input[type="date"]');
        void expect(dateInput).toBeInTheDocument();
    },
};

export const Time: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="time-input">Select Time</Label>
            <Input id="time-input" type="time" />
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Time inputs don't have textbox role, use querySelector instead
        const timeInput = canvasElement.querySelector('input[type="time"]');
        void expect(timeInput).toBeInTheDocument();
    },
};

export const Tel: Story = {
    args: {
        type: 'tel',
        placeholder: '+1 (555) 123-4567',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const telInput = canvas.getByPlaceholderText('+1 (555) 123-4567');
        await userEvent.type(telInput, '+1 (555) 000-1111');
    },
};

export const URL: Story = {
    args: {
        type: 'url',
        placeholder: 'https://example.com',
        autoComplete: 'off',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const urlInput = canvas.getByPlaceholderText('https://example.com');
        await userEvent.type(urlInput, 'https://sfcc.example.com');
    },
};

export const WithError: Story = {
    render: () => (
        <div className="space-y-2">
            <Label htmlFor="error-input">Input with Error</Label>
            <Input
                id="error-input"
                placeholder="This input has an error"
                className="border-destructive focus-visible:ring-destructive"
                aria-invalid="true"
                autoComplete="off"
            />
            <p className="text-sm text-destructive">This field is required</p>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const errorInput = canvas.getByPlaceholderText('This input has an error');
        await userEvent.type(errorInput, 'Error');
    },
};

export const FormExample: Story = {
    render: () => (
        <div className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" placeholder="John" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" placeholder="Doe" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const firstName = canvas.getByPlaceholderText('John');
        await userEvent.type(firstName, 'Jane');
    },
};

export const AllTypes: Story = {
    render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
                <Label htmlFor="text-input">Text</Label>
                <Input id="text-input" type="text" placeholder="Text input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email-input">Email</Label>
                <Input id="email-input" type="email" placeholder="Email input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password-input">Password</Label>
                <Input id="password-input" type="password" placeholder="Password input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="number-input">Number</Label>
                <Input id="number-input" type="number" placeholder="Number input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="search-input">Search</Label>
                <Input id="search-input" type="search" placeholder="Search input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tel-input">Phone</Label>
                <Input id="tel-input" type="tel" placeholder="Phone input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="url-input">URL</Label>
                <Input id="url-input" type="url" placeholder="URL input" autoComplete="off" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="date-input">Date</Label>
                <Input id="date-input" type="date" />
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const textInput = canvas.getByPlaceholderText('Text input');
        await userEvent.type(textInput, 'Multiple inputs');
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        await userEvent.type(input, 'Default text');
        await userEvent.clear(input);
        await userEvent.type(input, 'Testing input component');
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        await userEvent.type(input, 'Default text');
        await userEvent.clear(input);
        await userEvent.type(input, 'Testing input component');
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const input = canvas.getByPlaceholderText('Enter text...');
        await userEvent.type(input, 'Default text');
        await userEvent.clear(input);
        await userEvent.type(input, 'Testing input component');
    },
};
