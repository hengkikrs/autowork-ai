import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import { contextStorage } from 'hono/context-storage';
import updatedFetch from '../src/__create/fetch';

const API_BASENAME = '/api';
const api = new Hono();

api.use('*', contextStorage());

if (globalThis.fetch) {
  globalThis.fetch = updatedFetch;
}

const routeModules = import.meta.glob('../src/app/api/**/route.js', {
  eager: true,
}) as Record<string, Record<string, unknown>>;

function getHonoPath(routeFile: string): string {
  const normalized = routeFile.replaceAll('\\', '/');
  const relativePath = normalized
    .replace('../src/app/api', '')
    .replace(/\/route\.js$/, '');

  if (!relativePath) {
    return '/';
  }

  const parts = relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
      if (!match) {
        return segment;
      }
      const [, dots, param] = match;
      return dots === '...' ? `:${param}{.+}` : `:${param}`;
    });

  return `/${parts.join('/')}`;
}

function registerRoutes() {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const entries = Object.entries(routeModules).sort(([a], [b]) => b.length - a.length);

  for (const [routeFile, route] of entries) {
    const honoPath = getHonoPath(routeFile);

    for (const method of methods) {
      if (!(method in route)) {
        continue;
      }

      const methodHandler = route[method] as ((request: Request, context: { params: Record<string, string> }) => Response | Promise<Response>);
      const handler: Handler = async (c) => {
        const params = c.req.param();
        return await methodHandler(c.req.raw, { params });
      };

      switch (method.toLowerCase()) {
        case 'get':
          api.get(honoPath, handler);
          break;
        case 'post':
          api.post(honoPath, handler);
          break;
        case 'put':
          api.put(honoPath, handler);
          break;
        case 'delete':
          api.delete(honoPath, handler);
          break;
        case 'patch':
          api.patch(honoPath, handler);
          break;
        default:
          console.warn(`Unsupported method: ${method}`);
      }
    }
  }
}

registerRoutes();

export { api, API_BASENAME };
