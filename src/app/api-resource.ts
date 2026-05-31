import { api } from '../../__create/route-builder';

type ResourceArgs = {
	request: Request;
};

async function handleApiRequest({ request }: ResourceArgs) {
	const url = new URL(request.url);
	url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

	const init: RequestInit = {
		method: request.method,
		headers: request.headers,
		body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
		// @ts-expect-error -- required by Node fetch when forwarding streamed bodies.
		duplex: 'half',
	};

	return api.fetch(new Request(url, init));
}

export const loader = handleApiRequest;
export const action = handleApiRequest;
