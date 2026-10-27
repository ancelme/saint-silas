import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app, initializeApp } from '../backend/server';

let initialization: Promise<void> | undefined;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initialization ??= initializeApp();
  await initialization;
  app(req, res);
}
