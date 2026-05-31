type ResourceArgs = {
	request: Request;
};

async function handleAuthRequest({ request }: ResourceArgs) {
	const authResource = await import('../../__create/auth-resource-handler');
	return authResource.handleAuthRequest(request);
}

export const loader = handleAuthRequest;
export const action = handleAuthRequest;
