import { skipCSRFCheck } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import { authHandler, initAuthConfig } from '@hono/auth-js';
import { hash, verify } from 'argon2';
import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import pg from 'pg';
import NeonAdapter from './adapter';

const { Pool } = pg;
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});
const adapter = NeonAdapter(pool);

const app = new Hono();

app.use('*', contextStorage());
app.use(
	'*',
	initAuthConfig(() => ({
		secret: process.env.AUTH_SECRET,
		basePath: '/api/auth',
		pages: {
			signIn: '/account/signin',
			signOut: '/account/logout',
		},
		skipCSRFCheck,
		session: {
			strategy: 'jwt',
		},
		callbacks: {
			session({ session, token }) {
				if (token.sub) {
					session.user.id = token.sub;
				}
				return session;
			},
		},
		providers: [
			Credentials({
				id: 'credentials-signin',
				name: 'Credentials Sign in',
				credentials: {
					email: { label: 'Email', type: 'email' },
					password: { label: 'Password', type: 'password' },
				},
				authorize: async (credentials) => {
					const { email, password } = credentials;
					if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
						return null;
					}

					const user = await adapter.getUserByEmail(email);
					if (!user) {
						return null;
					}

					const matchingAccount = user.accounts.find(
						(account) => account.provider === 'credentials'
					);
					const accountPassword = matchingAccount?.password;
					if (!accountPassword) {
						return null;
					}

					return (await verify(accountPassword, password)) ? user : null;
				},
			}),
			Credentials({
				id: 'credentials-signup',
				name: 'Credentials Sign up',
				credentials: {
					email: { label: 'Email', type: 'email' },
					password: { label: 'Password', type: 'password' },
					name: { label: 'Name', type: 'text' },
					image: { label: 'Image', type: 'text', required: false },
				},
				authorize: async (credentials) => {
					const { email, password, name, image } = credentials;
					if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
						return null;
					}

					const existingUser = await adapter.getUserByEmail(email);
					if (existingUser) {
						return null;
					}

					const newUser = await adapter.createUser({
						emailVerified: null,
						email,
						name: typeof name === 'string' && name.length > 0 ? name : undefined,
						image: typeof image === 'string' && image.length > 0 ? image : undefined,
					} as Parameters<typeof adapter.createUser>[0]);
					await adapter.linkAccount({
						extraData: {
							password: await hash(password),
						},
						type: 'credentials',
						userId: newUser.id,
						providerAccountId: newUser.id,
						provider: 'credentials',
					});
					return newUser;
				},
			}),
		],
	}))
);

app.all('/api/auth/:action', authHandler());
app.all('/api/auth/:action/:provider', authHandler());

export async function handleAuthRequest(request: Request) {
	const url = new URL(request.url);
	const action = url.pathname.split('/').filter(Boolean).at(2);

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

	return app.fetch(request);
}
