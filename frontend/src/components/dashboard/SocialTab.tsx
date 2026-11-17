import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Camera, FileText, Heart, Image, LoaderCircle, MessageCircle, Plus, Search, Send, Sparkles, Video, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SocialPost,
  SocialStory,
  createSocialPost,
  createSocialStory,
  fetchSocialFeed,
  toggleSocialPostLike,
  commentOnSocialPost,
} from '../../services/api';

const colors = ['#047857', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0f172a'];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SocialTab: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<SocialStory[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showStory, setShowStory] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const [storyMedia, setStoryMedia] = useState('');
  const [storyMediaType, setStoryMediaType] = useState('text');
  const [storyColor, setStoryColor] = useState(colors[0]);
  const [privacy, setPrivacy] = useState('everyone');
  const [postText, setPostText] = useState('');
  const [postMedia, setPostMedia] = useState<Array<{ type: string; url: string; name?: string }>>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await fetchSocialFeed();
      setStories(data.stories);
      setPosts(data.posts);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load community updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const addStoryMedia = async (file: File, type: 'image' | 'video') => {
    setStoryMedia(await readFile(file));
    setStoryMediaType(type);
  };

  const publishStory = async () => {
    if (!storyText.trim() && !storyMedia) return;
    await createSocialStory({
      content: storyText, mediaUrl: storyMedia || undefined, mediaType: storyMediaType,
      caption: storyCaption, background: storyColor, privacy,
    });
    setShowStory(false); setStoryText(''); setStoryCaption(''); setStoryMedia(''); setStoryMediaType('text');
    await load();
  };

  const addPostMedia = async (files: FileList | null) => {
    if (!files) return;
    const additions = await Promise.all(Array.from(files).map(async file => ({
      type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'document',
      url: await readFile(file), name: file.name,
    })));
    setPostMedia(current => [...current, ...additions].slice(0, 8));
  };

  const publishPost = async (event: FormEvent) => {
    event.preventDefault();
    await createSocialPost({ content: postText, media: postMedia });
    setPostText(''); setPostMedia([]); setShowComposer(false); await load();
  };

  const publishComment = async (event: FormEvent, postId: string) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || isSendingComment) return;
    setIsSendingComment(true);
    setCommentError('');
    try {
      await commentOnSocialPost(postId, content);
      setCommentText('');
      await load();
    } catch (commentFailure) {
      setCommentError(commentFailure instanceof Error ? commentFailure.message : 'Unable to send comment.');
    } finally {
      setIsSendingComment(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    `${post.content || ''} ${post.author_name} ${post.author_role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-3 py-5 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,640px)_300px] lg:justify-center">
        <main className="mx-auto w-full max-w-[640px] space-y-5">
          <section aria-label="Stories" className="border-y border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">Stories</h3><p className="text-xs text-slate-500">A glimpse of life at Saint Silas</p></div>
              <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1">
              <button type="button" onClick={() => setShowStory(true)} className="group flex w-[68px] shrink-0 flex-col items-center gap-2">
                <span className="relative grid h-[68px] w-[68px] place-items-center rounded-full bg-slate-100 p-[3px] dark:bg-slate-800">
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-white bg-slate-100 dark:border-slate-900 dark:bg-slate-800">
                    {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-slate-500">{user?.fullName?.[0]}</span>}
                  </span>
                  <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-sky-500 text-white dark:border-slate-900"><Plus className="h-4 w-4" /></span>
                </span>
                <span className="w-full truncate text-center text-xs text-slate-700 dark:text-slate-300">Your story</span>
              </button>
              {stories.map(story => (
                <button key={story.id} type="button" onClick={() => setShowStory(true)} className="group flex w-[68px] shrink-0 flex-col items-center gap-2">
                  <span className="h-[68px] w-[68px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[3px] transition group-hover:scale-105">
                    <span className="block h-full w-full rounded-full border-[3px] border-white bg-slate-200 dark:border-slate-900">
                      {story.author_avatar ? <img src={story.author_avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="grid h-full place-items-center text-sm font-bold text-slate-600">{story.author_name?.[0]}</span>}
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-xs text-slate-700 dark:text-slate-300">{story.author_name}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search school updates..." className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
          </div>

          <button type="button" onClick={() => setShowComposer(true)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-slate-800">{user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user?.fullName?.[0]}</span>
            <span className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800">Share a moment with your school...</span>
            <Image className="h-5 w-5 text-sky-600" /><Video className="h-5 w-5 text-violet-600" />
          </button>

          {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40">{error}</div>}
          {loading ? <div className="grid place-items-center py-16 text-sky-600"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : filteredPosts.map(post => (
          <article key={post.id} className="overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border">
            {post.is_announcement === 1 && <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"><Sparkles className="h-4 w-4" />{post.announcement_type || 'School announcement'}</div>}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[2px]">
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-2 border-white bg-slate-100 font-bold text-slate-600 dark:border-slate-900 dark:bg-slate-800 dark:text-slate-200">
                  {post.author_avatar ? <img src={post.author_avatar} alt="" className="h-full w-full object-cover" /> : post.author_name?.[0]}
                </span>
              </span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{post.author_name}</p><p className="truncate text-xs text-slate-500">{post.author_role?.replace('_', ' ')} · {new Date(post.created_at).toLocaleString()}</p></div>
            </div>
            {post.media?.length > 0 && <div className={`grid gap-1 overflow-hidden bg-slate-100 dark:bg-slate-950 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {post.media.map(media => media.media_type === 'video'
                  ? <video key={media.id} src={media.url} controls className="max-h-[620px] w-full object-contain" />
                  : media.media_type === 'document'
                    ? <a key={media.id} href={media.url} download={media.file_name} className="flex min-h-48 items-center justify-center gap-3 p-4 text-sm font-semibold text-slate-700 dark:text-slate-200"><FileText className="h-5 w-5" />{media.file_name || 'Document'}</a>
                    : <img key={media.id} src={media.url} alt="" className="max-h-[620px] w-full object-contain" />)}
              </div>}
              {post.content && <p className="px-4 pt-3 text-sm leading-6 text-slate-800 dark:text-slate-200"><span className="mr-2 font-semibold text-slate-900 dark:text-white">{post.author_name}</span>{post.content}</p>}
              <div className="flex items-center gap-3 px-3 pt-2">
                <button type="button" aria-label="Like post" aria-pressed={Boolean(user?.id && post.likes?.includes(user.id))} onClick={() => void toggleSocialPostLike(post.id).then(load)} className={`rounded-full p-1.5 transition hover:scale-110 ${user?.id && post.likes?.includes(user.id) ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}><Heart className={`h-6 w-6 ${user?.id && post.likes?.includes(user.id) ? 'fill-current' : ''}`} /></button>
                <button
                  type="button"
                  aria-label="View comments"
                  aria-expanded={activeCommentsPostId === post.id}
                  onClick={() => {
                    setActiveCommentsPostId(current => current === post.id ? null : post.id);
                    setCommentError('');
                  }}
                  className="rounded-full p-1.5 text-slate-700 transition hover:scale-110 dark:text-slate-200"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="px-4 pb-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{post.likes?.length || 0} likes</p>
                {post.comments?.length ? (
                  <button type="button" onClick={() => setActiveCommentsPostId(current => current === post.id ? null : post.id)} className="mt-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    View {post.comments.length === 1 ? '1 comment' : `all ${post.comments.length} comments`}
                  </button>
                ) : <p className="mt-1 text-sm text-slate-500">Be the first to comment</p>}
              </div>
              {activeCommentsPostId === post.id && (
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div className="space-y-3">
                    {post.comments?.map(comment => (
                      <div key={comment.id} className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="mr-2 font-semibold text-slate-900 dark:text-white">{comment.author_name}</span>
                        <span className="whitespace-pre-wrap break-words">{comment.content}</span>
                      </div>
                    ))}
                    {post.comments?.length === 0 && <p className="text-xs text-slate-500">No comments yet. Start the conversation.</p>}
                  </div>
                  <form onSubmit={event => void publishComment(event, post.id)} className="mt-3 flex gap-2">
                    <input
                      value={commentText}
                      onChange={event => setCommentText(event.target.value)}
                      maxLength={2000}
                      aria-label="Write a comment"
                      placeholder="Write a comment..."
                      className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSendingComment}
                      className="rounded-full px-3 py-2 text-sm font-semibold text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSendingComment ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                  {commentError && <p role="alert" className="mt-2 text-xs text-rose-600">{commentError}</p>}
                </div>
              )}
          </article>
        ))}
        </main>

        <aside className="sticky top-5 hidden space-y-5 lg:block">
          <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user?.fullName?.[0]}
            </span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName || 'Your profile'}</p><p className="text-xs text-slate-500">Saint Silas community</p></div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-500">Community activity</h3><Sparkles className="h-4 w-4 text-amber-500" /></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-bold text-slate-900 dark:text-white">{posts.length}</p><p className="text-xs text-slate-500">Posts</p></div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><p className="text-lg font-bold text-slate-900 dark:text-white">{stories.length}</p><p className="text-xs text-slate-500">Stories</p></div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Share a moment</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Celebrate classroom projects, school events, and everyday learning with the Saint Silas community.</p>
            <button type="button" onClick={() => setShowComposer(true)} className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">Create a post</button>
          </section>
        </aside>
      </div>

      {showStory && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={() => setShowStory(false)}>
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900" onMouseDown={event => event.stopPropagation()}>
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Create story</h3><button onClick={() => setShowStory(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
          <div className="mt-4 grid h-72 place-items-center overflow-hidden rounded-3xl text-center text-white shadow-lg" style={{ background: storyMedia ? '#0f172a' : storyColor }}>
            {storyMedia
              ? storyMediaType === 'video'
                ? <video src={storyMedia} controls className="h-full w-full object-cover" aria-label="Story video preview" />
                : <img src={storyMedia} alt="" className="h-full w-full object-cover" />
              : <p className="max-w-xs px-6 text-2xl font-bold">{storyText || 'Your story'}</p>}
          </div>
          <textarea value={storyText} onChange={event => setStoryText(event.target.value)} placeholder="Write a status..." className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <input value={storyCaption} onChange={event => setStoryCaption(event.target.value)} placeholder="Caption" className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <div className="mt-3 flex gap-2 overflow-x-auto">{colors.map(color => <button key={color} onClick={() => setStoryColor(color)} className={`h-7 w-7 shrink-0 rounded-full border-2 ${storyColor === color ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} style={{ background: color }} />)}</div>
          <div className="mt-3 flex gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><Camera className="h-4 w-4" />Photo<input type="file" accept="image/*" hidden onChange={event => event.target.files?.[0] && void addStoryMedia(event.target.files[0], 'image')} /></label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><Video className="h-4 w-4" />Video<input type="file" accept="video/*" hidden onChange={event => event.target.files?.[0] && void addStoryMedia(event.target.files[0], 'video')} /></label>
            <select value={privacy} onChange={event => setPrivacy(event.target.value)} className="ml-auto rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="everyone">Everyone</option><option value="school">School only</option></select>
          </div>
          <button onClick={() => void publishStory()} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">Post status</button>
        </div>
      </div>}

      {showComposer && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
        <form onSubmit={publishPost} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold dark:text-white">Create post</h3><button type="button" onClick={() => setShowComposer(false)}><X className="h-5 w-5 text-slate-500" /></button></div>
          <textarea value={postText} onChange={event => setPostText(event.target.value)} placeholder="What's happening at SAINT-SILAS?" className="mt-4 min-h-32 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          {postMedia.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{postMedia.map((media, index) => <div key={`${media.name}-${index}`} className="relative h-24 overflow-hidden rounded-xl bg-slate-100">{media.type === 'image' ? <img src={media.url} alt="" className="h-full w-full object-cover" /> : media.type === 'video' ? <video src={media.url} controls className="h-full w-full object-cover" aria-label={media.name || 'Video preview'} /> : <FileText className="m-auto h-full text-slate-400" />}</div>)}</div>}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50"><Image className="h-5 w-5" /></button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" hidden onChange={event => void addPostMedia(event.target.files)} />
            <span className="text-xs text-slate-400">Photos, videos and documents</span>
            <button type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"><Send className="h-4 w-4" />Post</button>
          </div>
        </form>
      </div>}
    </div>
  );
};
