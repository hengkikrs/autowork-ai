import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type RouteConfigEntry,
	index,
	route,
} from '@react-router/dev/routes';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

type Tree = {
	path: string;
	children: Tree[];
	hasPage: boolean;
	isParam: boolean;
	paramName: string;
	isCatchAll: boolean;
};

function buildRouteTree(dir: string, basePath = ''): Tree {
	const files = readdirSync(dir);
	const node: Tree = {
		path: basePath,
		children: [],
		hasPage: false,
		isParam: false,
		isCatchAll: false,
		paramName: '',
	};

	// Check if the current directory name indicates a parameter
	const dirName = basePath.split('/').pop();
	if (dirName?.startsWith('[') && dirName.endsWith(']')) {
		node.isParam = true;
		const paramName = dirName.slice(1, -1);

		// Check if it's a catch-all parameter (e.g., [...ids])
		if (paramName.startsWith('...')) {
			node.isCatchAll = true;
			node.paramName = paramName.slice(3); // Remove the '...' prefix
		} else {
			node.paramName = paramName;
		}
	}

	for (const file of files) {
		if (file === 'errors') {
			continue;
		}
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			const childPath = basePath ? `${basePath}/${file}` : file;
			const childNode = buildRouteTree(filePath, childPath);
			node.children.push(childNode);
		} else if (file === 'page.jsx') {
			node.hasPage = true;
    }
	}

	return node;
}

function generateRoutes(node: Tree): RouteConfigEntry[] {
	const routes: RouteConfigEntry[] = [];

	if (node.hasPage) {
		const componentPath =
			node.path === '' ? `./${node.path}page.jsx` : `./${node.path}/page.jsx`;

		if (node.path === '') {
			routes.push(index(componentPath));
		} else {
			// Handle parameter routes
			let routePath = node.path;

			// Replace all parameter segments in the path
			const segments = routePath.split('/');
			const processedSegments = segments.map((segment) => {
				if (segment.startsWith('[') && segment.endsWith(']')) {
					const paramName = segment.slice(1, -1);

					// Handle catch-all parameters (e.g., [...ids] becomes *)
					if (paramName.startsWith('...')) {
						return '*'; // React Router's catch-all syntax
					}
					// Handle optional parameters (e.g., [[id]] becomes :id?)
					if (paramName.startsWith('[') && paramName.endsWith(']')) {
						return `:${paramName.slice(1, -1)}?`;
					}
					// Handle regular parameters (e.g., [id] becomes :id)
					return `:${paramName}`;
				}
				return segment;
			});

			routePath = processedSegments.join('/');
			routes.push(route(routePath, componentPath));
		}
	}

	for (const child of node.children) {
		routes.push(...generateRoutes(child));
	}

	return routes;
}
if (import.meta.env.DEV) {
	import.meta.glob('./**/page.jsx', {});
	if (import.meta.hot) {
		import.meta.hot.accept((newSelf) => {
			import.meta.hot?.invalidate();
		});
	}
}
const tree = buildRouteTree(__dirname);
const apiRoutes = [
	route('api/__create/check-social-secrets', './api-resource.ts', {
		id: 'api/__create/check-social-secrets',
	}),
	route('api/__create/ssr-test', './api-resource.ts', { id: 'api/__create/ssr-test' }),
	route('api/ai', './api-resource.ts', { id: 'api/ai' }),
	route('api/applications', './api-resource.ts', { id: 'api/applications' }),
	route('api/apply/prepare', './api-resource.ts', { id: 'api/apply/prepare' }),
	route('api/auth/callback/:provider', './auth-resource.ts', {
		id: 'api/auth/callback/$provider',
	}),
	route('api/auth/csrf', './auth-resource.ts', { id: 'api/auth/csrf' }),
	route('api/auth/expo-web-success', './api-resource.ts', {
		id: 'api/auth/expo-web-success',
	}),
	route('api/auth/providers', './auth-resource.ts', { id: 'api/auth/providers' }),
	route('api/auth/session', './auth-resource.ts', { id: 'api/auth/session' }),
	route('api/auth/signin/:provider', './auth-resource.ts', {
		id: 'api/auth/signin/$provider',
	}),
	route('api/auth/signout', './auth-resource.ts', { id: 'api/auth/signout' }),
	route('api/auth/token', './api-resource.ts', { id: 'api/auth/token' }),
	route('api/cv', './api-resource.ts', { id: 'api/cv' }),
	route('api/cv/process', './api-resource.ts', { id: 'api/cv/process' }),
	route('api/jobs', './api-resource.ts', { id: 'api/jobs' }),
	route('api/jobs/:id', './api-resource.ts', { id: 'api/jobs/$id' }),
	route('api/match', './api-resource.ts', { id: 'api/match' }),
	route('api/preferences', './api-resource.ts', { id: 'api/preferences' }),
	route('api/reports/daily', './api-resource.ts', { id: 'api/reports/daily' }),
	route('api/reports/weekly', './api-resource.ts', { id: 'api/reports/weekly' }),
	route('api/tailor/cover-letter', './api-resource.ts', { id: 'api/tailor/cover-letter' }),
	route('api/tailor/cv', './api-resource.ts', { id: 'api/tailor/cv' }),
	route('api/upload', './api-resource.ts', { id: 'api/upload' }),
	route('api/upload/:id', './api-resource.ts', { id: 'api/upload/$id' }),
];
const routes = [...apiRoutes, ...generateRoutes(tree)];

export default routes;
