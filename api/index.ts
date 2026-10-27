import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, initializeApp } from '../backend/server.bundle.mjs';

let initialization: Promise<void> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const incomingUrl = new URL(req.url ?? '/', 'http://localhost');
    const routePath = req.query.__api_path;

    if (Array.isArray(routePath)) {
      return res.status(400).json({ error: 'Invalid API route' });
    }

    const query = new URLSearchParams(incomingUrl.searchParams);
    query.delete('__api_path');

    const encodedPath = typeof routePath === 'string'
      ? routePath.split('/').map(encodeURIComponent).join('/')
      : '';
    const suffix = query.toString();
    req.url = `/api${encodedPath ? `/${encodedPath}` : ''}${suffix ? `?${suffix}` : ''}`;

    initialization ??= initializeApp();
    await initialization;
    return app(req, res);
  } catch (error: unknown) {
    console.error('API handler error:', error);
    if (res.headersSent) {
      return;
    }
    const databaseUrlMissing = error instanceof Error
      && error.message === 'DATABASE_URL is required to connect to PostgreSQL.';
    return res.status(500).json({
      error: databaseUrlMissing
        ? 'Database configuration is missing.'
        : 'The API could not initialize. Check the Vercel function logs.'
    });
  }
}
