/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type LoaderFunctionArgs, useLoaderData, useSearchParams, Link } from 'react-router';
import { getConfig } from '@/config';

// eslint-disable-next-line custom/no-async-page-loader, react-refresh/only-export-components
export async function loader(args: LoaderFunctionArgs) {
    const config = getConfig(args.context);
    const { sharedMaintenancePage, cdnUrl, forwardedHost } = config.pages.maintenancePage;

    if (sharedMaintenancePage) {
        try {
            // Fetch content from the maintenance CDN with the required header
            const response = await fetch(cdnUrl, {
                headers: {
                    'x-dw-forwarded-host': forwardedHost,
                },
            });

            if (!response.ok) {
                return null;
            }

            let htmlContent = await response.text();
            htmlContent = htmlContent.replace(/<\/?html[^>]*>/gi, '');
            htmlContent = htmlContent.replace('</html>', '');
            htmlContent = htmlContent.replace('<head>', '');
            htmlContent = htmlContent.replace('</head>', '');
            htmlContent = htmlContent.replace('<body>', '');
            htmlContent = htmlContent.replace('</body>', '');
            //htmlContent = htmlContent.replace(/<\/?script[^>]*>/gi, '<!--');
            //htmlContent = htmlContent.replace('</script>', '-->');
            return htmlContent;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            /* empty */
        }
    }
    return null;
}

export default function MaintenancePage() {
    const htmlContent = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/';

    // If we have HTML content from the CDN, render it directly
    if (htmlContent) {
        return (
            <>
                <style>{`
                    .parent-container {
                        display: flex;
                        flex-direction: column;
                        justify-content: center; /* Vertically centers content */
                        align-items: center;     /* Horizontally centers content */
                        min-height: 100vh;       /* Vital: ensures container is full screen height */
                        margin: 0;
                    }
                `}</style>
                <div className="parent-container ">
                    {/* eslint-disable-next-line react/no-danger */}
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    <Link
                        to={returnTo}
                        style={{
                            marginTop: '2rem',
                            padding: '0.75rem 2rem',
                            backgroundColor: '#667eea',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            display: 'inline-block',
                            transition: 'background-color 0.2s',
                        }}>
                        {/* Not Translated yet - awaiting for the final page from UX*/}
                        Try Again
                    </Link>
                </div>
            </>
        );
    }

    // Fallback maintenance page if fetch failed
    return (
        <div style={{ height: '100%' }}>
            <style>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    color: #333;
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 3rem 2rem;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 500px;
                    width: 90%;
                }
                h1 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    color: #2d3748;
                }
                p {
                    font-size: 1.125rem;
                    color: #718096;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }
                .retry-button {
                    display: inline-block;
                    padding: 0.75rem 2rem;
                    background-color: #667eea;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 1rem;
                    transition: background-color 0.2s;
                }
                .retry-button:hover {
                    background-color: #5568d3;
                }
            `}</style>
            <div className="container">
                <h1>Site Under Maintenance</h1>
                <p>We&apos;re currently performing scheduled maintenance. Please check back soon.</p>
                <Link to={returnTo} className="retry-button">
                    {/* Not Translated yet - awaiting for the final page from UX*/}
                    Try Again
                </Link>
            </div>
        </div>
    );
}
