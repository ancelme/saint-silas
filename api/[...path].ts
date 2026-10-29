import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './index';

export default async function catchAll(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
