type ResourceArgs = {
	request: Request;
};

function getAuthAction(request: Request) {
	return new URL(request.url).pathname.split('/').filter(Boolean).at(2);
}

async function handleAuthRequest({ request }: ResourceArgs) {
	const action = getAuthAction(request);

	if (!process.env.AUTH_SECRET) {
		if (action === 'session') {
			return Response.json(null);
		}

		return Response.json(
			{
				error:
					'Auth belum dikonfigurasi. Set AUTH_SECRET sebelum memakai login atau signup.',
			},
			{ status: 503 }
		);
	}

	if (!process.env.DATABASE_URL && ['callback', 'signin'].includes(action || '')) {
		return Response.json(
			{
				error:
					'Database belum dikonfigurasi. Set DATABASE_URL sebelum memakai login atau signup.',
			},
			{ status: 503 }
		);
	}

	const authResource = await import('../../__create/auth-resource-handler');
	return authResource.handleAuthRequest(request);
}

export const loader = handleAuthRequest;
export const action = handleAuthRequest;
