import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index';
import { AuthRequest } from '../middleware/auth';

const id = () => crypto.randomUUID();
const canManagePosts = (role?: string) => ['owner', 'super_admin', 'admin', 'head_teacher'].includes(role || '');
const canPublishAnnouncements = (role?: string) => ['owner', 'super_admin', 'admin', 'head_teacher', 'accountant', 'librarian'].includes(role || '');

async function getAuthor(postUserId: string) {
  const result = await db.query(
    'SELECT id, full_name, role, avatar_url FROM users WHERE id = ? LIMIT 1',
    [postUserId],
  );
  return result.rows[0] || null;
}

export async function getSocialFeed(_req: AuthRequest, res: Response) {
  try {
    const stories = await db.query(`
      SELECT s.*, u.full_name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
      FROM stories s JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > CURRENT_TIMESTAMP ORDER BY s.created_at DESC`);
    const posts = await db.query(`
      SELECT p.*, u.full_name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
      FROM social_posts p JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC LIMIT 100`);

    const feed = [];
    for (const post of posts.rows) {
      const [media, likes, comments] = await Promise.all([
        db.query('SELECT * FROM post_media WHERE post_id = ? ORDER BY sort_order, created_at', [post.id]),
        db.query('SELECT * FROM post_likes WHERE post_id = ?', [post.id]),
        db.query(`SELECT c.*, u.full_name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
          FROM post_comments c JOIN users u ON u.id = c.user_id
          WHERE c.post_id = ? ORDER BY c.created_at`, [post.id]),
      ]);
      feed.push({
        ...post,
        media: media.rows,
        likes: likes.rows.map(row => row.user_id),
        comments: comments.rows.map(comment => ({
          ...comment,
          replies: [],
        })),
      });
    }

    return res.json({ stories: stories.rows, posts: feed });
  } catch (error: any) {
    console.error('Social feed error:', error);
    return res.status(500).json({ error: 'Failed to load social communication.' });
  }
}

export async function createStory(req: AuthRequest, res: Response) {
  try {
    const { content = '', mediaUrl, mediaType = 'text', caption = '', background = '#047857', privacy = 'everyone' } = req.body;
    if (!String(content).trim() && !mediaUrl) return res.status(400).json({ error: 'Add text or media to the story.' });
    const storyId = id();
    await db.query(`
      INSERT INTO stories (id, user_id, media_url, media_type, content, caption, background, privacy, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))`,
      [storyId, req.user!.id, mediaUrl || null, mediaType, String(content).trim(), String(caption).trim(), background, privacy]);
    return res.status(201).json({ id: storyId });
  } catch (error: any) {
    console.error('Create story error:', error);
    return res.status(500).json({ error: 'Failed to publish story.' });
  }
}

export async function deleteStory(req: AuthRequest, res: Response) {
  const story = await db.query('SELECT user_id FROM stories WHERE id = ?', [req.params.id]);
  const ownerId = story.rows[0]?.user_id;
  if (!ownerId || (ownerId !== req.user!.id && !canManagePosts(req.user!.role))) {
    return res.status(403).json({ error: 'You cannot delete this story.' });
  }
  await db.query('DELETE FROM stories WHERE id = ?', [req.params.id]);
  return res.json({ message: 'Story deleted.' });
}

export async function viewStory(req: AuthRequest, res: Response) {
  await db.query(
    'INSERT OR IGNORE INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)',
    [id(), req.params.id, req.user!.id],
  );
  return res.json({ message: 'Story viewed.' });
}

export async function reactToStory(req: AuthRequest, res: Response) {
  const { reaction = '❤️' } = req.body;
  await db.query(
    'INSERT OR REPLACE INTO story_reactions (id, story_id, user_id, reaction) VALUES (?, ?, ?, ?)',
    [id(), req.params.id, req.user!.id, String(reaction).slice(0, 16)],
  );
  return res.json({ message: 'Reaction saved.' });
}

export async function createPost(req: AuthRequest, res: Response) {
  try {
    const { content = '', audience = 'Everyone', isAnnouncement = false, announcementType = 'General', media = [] } = req.body;
    if (!String(content).trim() && (!Array.isArray(media) || media.length === 0)) {
      return res.status(400).json({ error: 'Write something or add media.' });
    }
    if (isAnnouncement && !canPublishAnnouncements(req.user!.role)) {
      return res.status(403).json({ error: 'You are not authorized to publish announcements.' });
    }
    const postId = id();
    await db.query(`
      INSERT INTO social_posts (id, user_id, content, audience, is_announcement, announcement_type)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [postId, req.user!.id, String(content).trim(), audience || 'Everyone', isAnnouncement ? 1 : 0, announcementType || 'General']);
    for (let index = 0; index < (Array.isArray(media) ? media.length : 0); index += 1) {
      const item = media[index] || {};
      if (!item.url) continue;
      await db.query(
        `INSERT INTO post_media (id, post_id, media_type, url, file_name, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [id(), postId, item.type || 'image', item.url, item.name || '', index],
      );
    }
    const author = await getAuthor(req.user!.id);
    return res.status(201).json({ id: postId, authorName: author?.full_name || req.user!.fullName });
  } catch (error: any) {
    console.error('Create post error:', error);
    return res.status(500).json({ error: 'Failed to publish post.' });
  }
}

export async function updatePost(req: AuthRequest, res: Response) {
  const post = await db.query('SELECT user_id FROM social_posts WHERE id = ?', [req.params.id]);
  const ownerId = post.rows[0]?.user_id;
  if (!ownerId || (ownerId !== req.user!.id && !canManagePosts(req.user!.role))) {
    return res.status(403).json({ error: 'You cannot edit this post.' });
  }
  await db.query('UPDATE social_posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    String(req.body.content || '').trim(),
    req.params.id,
  ]);
  return res.json({ message: 'Post updated.' });
}

export async function deletePost(req: AuthRequest, res: Response) {
  const post = await db.query('SELECT user_id FROM social_posts WHERE id = ?', [req.params.id]);
  const ownerId = post.rows[0]?.user_id;
  if (!ownerId || (ownerId !== req.user!.id && !canManagePosts(req.user!.role))) {
    return res.status(403).json({ error: 'You cannot delete this post.' });
  }
  await db.query('DELETE FROM social_posts WHERE id = ?', [req.params.id]);
  return res.json({ message: 'Post deleted.' });
}

export async function togglePostLike(req: AuthRequest, res: Response) {
  const existing = await db.query(
    'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
    [req.params.id, req.user!.id],
  );
  if (existing.rows.length) {
    await db.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [req.params.id, req.user!.id]);
  } else {
    await db.query('INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)', [
      id(),
      req.params.id,
      req.user!.id,
    ]);
  }
  return res.json({ liked: existing.rows.length === 0 });
}

export async function addPostComment(req: AuthRequest, res: Response) {
  const { content = '', parentCommentId } = req.body;
  if (!String(content).trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
  const commentId = id();
  await db.query(
    'INSERT INTO post_comments (id, post_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?, ?)',
    [commentId, req.params.id, req.user!.id, parentCommentId || null, String(content).trim()],
  );
  return res.status(201).json({ id: commentId });
}
