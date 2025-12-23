import { type LoaderFunctionArgs, redirect } from 'react-router';

// TODO: This is right now just a naive shell to make client-side auth flow at least work. This requires attention.
export function loader({ request }: LoaderFunctionArgs) {
    const { searchParams } = new URL(request.url);

    // SLAS sends different parameter names than direct OAuth
    const code = searchParams.get('code');
    const usid = searchParams.get('usid');
    if (code && usid) {
        return new Response(null, { status: 200 });
    }
    return redirect('/login');
}
