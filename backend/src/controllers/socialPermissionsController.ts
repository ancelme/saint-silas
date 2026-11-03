import { Response } from 'express';
import { db } from '../db/index';
import { AuthRequest } from '../middleware/auth';

export async function getSocialPermissions(_req: AuthRequest, res: Response) {
  const result = await db.query('SELECT * FROM social_role_permissions');
  return res.json(result.rows);
}

export async function updateSocialPermission(req: AuthRequest, res: Response) {
  const { role } = req.params;
  const { can_post, can_comment, can_story, can_announce } = req.body;
  await db.query(`
    INSERT INTO social_role_permissions (role, can_post, can_comment, can_story, can_announce)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(role) DO UPDATE SET can_post=?, can_comment=?, can_story=?, can_announce=?`,
    [role, can_post ? 1 : 0, can_comment ? 1 : 0, can_story ? 1 : 0, can_announce ? 1 : 0,
      can_post ? 1 : 0, can_comment ? 1 : 0, can_story ? 1 : 0, can_announce ? 1 : 0]);
  return res.json({ message: 'Social permissions updated.' });
}
