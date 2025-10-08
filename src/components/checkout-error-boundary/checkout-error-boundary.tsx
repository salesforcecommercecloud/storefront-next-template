/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Typography } from '@/components/typography';
import uiStrings from '@/temp-ui-string';

interface CheckoutErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface CheckoutErrorBoundaryState {
    hasError: boolean;
}

/**
 * ErrorBoundary specifically designed for checkout operations
 * Provides graceful fallbacks for basket enhancement and checkout errors
 */
export class CheckoutErrorBoundary extends Component<CheckoutErrorBoundaryProps, CheckoutErrorBoundaryState> {
    constructor(props: CheckoutErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): CheckoutErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
        // TODO: report error
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI or use provided fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="mx-auto max-w-2xl">
                    <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
                        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
                        <Typography variant="h2" as="h2" className="mb-2 text-xl">
                            {uiStrings.checkout.errorBoundary.title}
                        </Typography>
                        <Typography variant="p" className="mb-6 max-w-md text-muted-foreground">
                            {uiStrings.checkout.errorBoundary.description}
                        </Typography>
                        <div className="flex gap-3">
                            <Button onClick={this.handleRetry}>
                                <RefreshCw className="h-4 w-4" />
                                {uiStrings.checkout.errorBoundary.tryAgain}
                            </Button>
                            <Button variant="outline" onClick={() => (window.location.href = '/cart')}>
                                {uiStrings.checkout.errorBoundary.returnToCart}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

/**
 * Lightweight error fallback for individual checkout components
 */
export function CheckoutComponentError({ retry }: { error?: Error; retry?: () => void }) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{uiStrings.checkout.errorBoundary.componentError.title}</AlertTitle>
            <AlertDescription>
                {uiStrings.checkout.errorBoundary.componentError.description}
                {retry && (
                    <Button variant="link" size="sm" onClick={retry} className="ml-2 h-auto p-0">
                        {uiStrings.checkout.errorBoundary.componentError.tryAgain}
                    </Button>
                )}
            </AlertDescription>
        </Alert>
    );
}
