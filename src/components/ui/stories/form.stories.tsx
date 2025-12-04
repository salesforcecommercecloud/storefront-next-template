import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../form';
import { Input } from '../input';
import { Button } from '../button';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logFormSubmit = action('form-submit');
        const logFormValidate = action('form-validate');
        const logFieldChange = action('field-change');
        const logFieldBlur = action('field-blur');
        const logFieldFocus = action('field-focus');
        const logCheckboxToggle = action('checkbox-toggle');
        const logTextareaInput = action('textarea-input');
        const logButtonClick = action('form-button-click');

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const isSyntheticEvent = (event: Event): boolean => event.isTrusted === false;

        const deriveLabel = (el: HTMLInputElement | HTMLTextAreaElement | HTMLElement): string => {
            if ('labels' in el && el.labels && el.labels.length > 0) {
                return sanitizeLabel(el.labels[0].textContent);
            }
            const id = el.getAttribute('id');
            if (id) {
                const label = el.ownerDocument?.querySelector(`label[for="${CSS.escape(id)}"]`);
                if (label) {
                    return sanitizeLabel(label.textContent);
                }
            }
            return sanitizeLabel(el.getAttribute('name') || el.getAttribute('aria-label'));
        };

        const handleClick = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (!target) return;

            const submitBtn = target.closest('button[type="submit"]');
            if (submitBtn) {
                event.preventDefault();
                logButtonClick({ label: sanitizeLabel(submitBtn.textContent), type: 'submit' });
                logFormValidate({ source: 'storybook' });
                return;
            }

            const otherBtn = target.closest('button');
            if (otherBtn) {
                logButtonClick({ label: sanitizeLabel(otherBtn.textContent), type: 'button' });
            }
        };

        const handleChange = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const el = event.target as HTMLElement | null;
            if (!el) return;

            if (el instanceof HTMLInputElement) {
                const label = deriveLabel(el);
                if (el.type === 'checkbox') {
                    logCheckboxToggle({ label, value: el.checked ? 'checked' : 'unchecked' });
                } else {
                    const value = el.type === 'password' ? '••••' : el.value;
                    logFieldChange({ label, value });
                }
            }

            if (el instanceof HTMLTextAreaElement) {
                const label = deriveLabel(el);
                logTextareaInput({ label, value: el.value.substring(0, 200) });
            }
        };

        const handleFocus = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const el = event.target as HTMLElement | null;
            if (!el) return;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                const label = deriveLabel(el);
                if (label) logFieldFocus({ label });
            }
        };

        const handleBlur = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const el = event.target as HTMLElement | null;
            if (!el) return;
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                const label = deriveLabel(el);
                if (label) logFieldBlur({ label });
            }
        };

        const handleSubmit = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const form = event.target as HTMLFormElement | null;
            if (!form) return;
            if (form.tagName.toLowerCase() === 'form') {
                event.preventDefault();
                const data = new FormData(form);
                const payload: Array<{ label: string; value: unknown }> = [];

                data.forEach((value, key) => {
                    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                        `[name="${CSS.escape(key)}"], #${CSS.escape(key)}`
                    );
                    const label = field ? deriveLabel(field) : sanitizeLabel(key);
                    const maskedValue =
                        typeof value === 'string' && key.toLowerCase().includes('password') ? '••••' : value;
                    payload.push({ label, value: maskedValue });
                });

                logFormSubmit({ fields: payload });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('focus', handleFocus, true);
        root.addEventListener('blur', handleBlur, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('focus', handleFocus, true);
            root.removeEventListener('blur', handleBlur, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const formSchema = z
    .object({
        username: z.string().min(2, {
            message: 'Username must be at least 2 characters.',
        }),
        email: z.string().email({
            message: 'Please enter a valid email address.',
        }),
        password: z.string().min(8, {
            message: 'Password must be at least 8 characters.',
        }),
        confirmPassword: z.string(),
        terms: z.boolean().refine((val) => val === true, {
            message: 'You must accept the terms and conditions.',
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
    });

type FormValues = z.infer<typeof formSchema>;

function FormWrapper({ onSubmit }: { onSubmit?: (values: FormValues) => void }) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: false,
        },
    });

    const handleSubmit = (values: FormValues) => {
        // eslint-disable-next-line no-console
        console.log('Form submitted:', values);
        onSubmit?.(values);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit(handleSubmit)();
                }}
                autoComplete="off"
                className="space-y-6 max-w-md">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your username" autoComplete="off" {...field} />
                            </FormControl>
                            <FormDescription>This is your public display name.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter your email" autoComplete="off" {...field} />
                            </FormControl>
                            <FormDescription>We&apos;ll never share your email with anyone else.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="Enter your password"
                                    autoComplete="off"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>Must be at least 8 characters long.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="Confirm your password"
                                    autoComplete="off"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="mt-1"
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Accept terms and conditions</FormLabel>
                                <FormDescription>You agree to our Terms of Service and Privacy Policy.</FormDescription>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    Submit
                </Button>
            </form>
        </Form>
    );
}

function SimpleFormWrapper() {
    const form = useForm({
        defaultValues: {
            name: '',
            email: '',
        },
    });

    const handleSubmit = (values: { name: string; email: string }) => {
        // eslint-disable-next-line no-console
        console.log('Simple form submitted:', values);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit(handleSubmit)();
                }}
                autoComplete="off"
                className="space-y-4 max-w-md">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your name" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter your email" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    Submit
                </Button>
            </form>
        </Form>
    );
}

function LoginFormWrapper() {
    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
            remember: false,
        },
    });

    const handleSubmit = (values: { email: string; password: string; remember: boolean }) => {
        // eslint-disable-next-line no-console
        console.log('Login form submitted:', values);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit(handleSubmit)();
                }}
                autoComplete="off"
                className="space-y-4 max-w-md">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter your email" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input
                                    type="password"
                                    placeholder="Enter your password"
                                    autoComplete="off"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="mt-1"
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Remember me</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    Sign In
                </Button>
            </form>
        </Form>
    );
}

function ContactFormWrapper() {
    const form = useForm({
        defaultValues: {
            name: '',
            email: '',
            subject: '',
            message: '',
        },
    });

    const handleSubmit = (values: { name: string; email: string; subject: string; message: string }) => {
        // eslint-disable-next-line no-console
        console.log('Contact form submitted:', values);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void form.handleSubmit(handleSubmit)();
                }}
                autoComplete="off"
                className="space-y-4 max-w-md">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your name" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="your@email.com" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                                <Input placeholder="Subject" autoComplete="off" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                                <textarea
                                    placeholder="Your message"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    autoComplete="off"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    Send Message
                </Button>
            </form>
        </Form>
    );
}

const meta: Meta<typeof FormWrapper> = {
    title: 'UI/Form',
    component: FormWrapper,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'A comprehensive form component built with react-hook-form and Zod validation. Provides form state management, validation, and accessibility features.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        onSubmit: {
            description: 'Callback function called when form is submitted',
            action: 'submitted',
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
type Story = StoryObj<typeof FormWrapper>;

export const Default: Story = {
    args: {},
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form field interactions
        const usernameInput = canvas.getByLabelText('Username');
        const emailInput = canvas.getByLabelText('Email');
        const passwordInput = canvas.getByLabelText('Password');
        const confirmPasswordInput = canvas.getByLabelText('Confirm Password');
        const termsCheckbox = canvas.getByLabelText('Accept terms and conditions');
        const submitButton = canvas.getByRole('button', { name: /submit/i });

        // Fill out the registration form
        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.type(passwordInput, 'password123');
        await userEvent.type(confirmPasswordInput, 'password123');
        await userEvent.click(termsCheckbox);

        // Test form submission
        await userEvent.click(submitButton);

        // Test keyboard navigation
        await userEvent.tab();
        await userEvent.keyboard('{enter}');
    },
};

export const SimpleForm: Story = {
    render: () => <SimpleFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const nameInput = canvas.getByLabelText('Name');
        const emailInput = canvas.getByLabelText('Email');
        const submitButton = canvas.getByRole('button', { name: /submit/i });

        await userEvent.type(nameInput, 'John Doe');
        await userEvent.type(emailInput, 'john.doe@example.com');
        await userEvent.click(submitButton);
    },
};

export const LoginForm: Story = {
    render: () => <LoginFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test login form interactions
        const emailInput = canvas.getByLabelText('Email');
        const passwordInput = canvas.getByLabelText('Password');
        const rememberCheckbox = canvas.getByLabelText('Remember me');
        const signInButton = canvas.getByRole('button', { name: /sign in/i });

        // Fill out the login form
        await userEvent.type(emailInput, 'user@example.com');
        await userEvent.type(passwordInput, 'userpassword123');

        // Test checkbox interaction
        await userEvent.click(rememberCheckbox);
        await userEvent.click(rememberCheckbox); // Toggle off then on

        // Test form submission
        await userEvent.click(signInButton);

        // Test keyboard navigation
        await userEvent.tab();
        await userEvent.keyboard('{enter}');
    },
};

export const ContactForm: Story = {
    render: () => <ContactFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact form interactions
        const nameInput = canvas.getByLabelText('Name');
        const emailInput = canvas.getByLabelText('Email');
        const subjectInput = canvas.getByLabelText('Subject');
        const messageTextarea = canvas.getByLabelText('Message');
        const sendButton = canvas.getByRole('button', { name: /send message/i });

        // Fill out the contact form
        await userEvent.type(nameInput, 'Jane Smith');
        await userEvent.type(emailInput, 'jane@example.com');
        await userEvent.type(subjectInput, 'Test Subject');
        await userEvent.type(messageTextarea, 'This is a test message for the contact form.');

        // Test textarea interactions
        await userEvent.click(messageTextarea);
        await userEvent.keyboard('{selectall}');
        await userEvent.keyboard('{delete}');
        await userEvent.type(messageTextarea, 'Updated test message.');

        // Test form submission
        await userEvent.click(sendButton);

        // Test tab navigation through form
        await userEvent.tab();
        await userEvent.tab();
        await userEvent.tab();
        await userEvent.tab();
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

        // Test form field interactions
        const usernameInput = canvas.getByLabelText('Username');
        const emailInput = canvas.getByLabelText('Email');
        const passwordInput = canvas.getByLabelText('Password');
        const confirmPasswordInput = canvas.getByLabelText('Confirm Password');
        const termsCheckbox = canvas.getByLabelText('Accept terms and conditions');
        const submitButton = canvas.getByRole('button', { name: /submit/i });

        // Fill out the registration form
        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.type(passwordInput, 'password123');
        await userEvent.type(confirmPasswordInput, 'password123');
        await userEvent.click(termsCheckbox);

        // Test form submission
        await userEvent.click(submitButton);

        // Test keyboard navigation
        await userEvent.tab();
        await userEvent.keyboard('{enter}');
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

        // Test form field interactions
        const usernameInput = canvas.getByLabelText('Username');
        const emailInput = canvas.getByLabelText('Email');
        const passwordInput = canvas.getByLabelText('Password');
        const confirmPasswordInput = canvas.getByLabelText('Confirm Password');
        const termsCheckbox = canvas.getByLabelText('Accept terms and conditions');
        const submitButton = canvas.getByRole('button', { name: /submit/i });

        // Fill out the registration form
        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.type(passwordInput, 'password123');
        await userEvent.type(confirmPasswordInput, 'password123');
        await userEvent.click(termsCheckbox);

        // Test form submission
        await userEvent.click(submitButton);

        // Test keyboard navigation
        await userEvent.tab();
        await userEvent.keyboard('{enter}');
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

        // Test form field interactions
        const usernameInput = canvas.getByLabelText('Username');
        const emailInput = canvas.getByLabelText('Email');
        const passwordInput = canvas.getByLabelText('Password');
        const confirmPasswordInput = canvas.getByLabelText('Confirm Password');
        const termsCheckbox = canvas.getByLabelText('Accept terms and conditions');
        const submitButton = canvas.getByRole('button', { name: /submit/i });

        // Fill out the registration form
        await userEvent.type(usernameInput, 'testuser');
        await userEvent.type(emailInput, 'test@example.com');
        await userEvent.type(passwordInput, 'password123');
        await userEvent.type(confirmPasswordInput, 'password123');
        await userEvent.click(termsCheckbox);

        // Test form submission
        await userEvent.click(submitButton);

        // Test keyboard navigation
        await userEvent.tab();
        await userEvent.keyboard('{enter}');
    },
};
