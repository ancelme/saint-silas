import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Camera, FileText, Image, LoaderCircle, MessageCircle, Plus, Search, Send, Sparkles, ThumbsUp, Video, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SocialPost,
  SocialStory,
  createSocialPost,
  createSocialStory,
  fetchSocialFeed,
  toggleSocialPostLike,
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

  const filteredPosts = posts.filter(post =>
    `${post.content || ''} ${post.author_name} ${post.author_role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-50/70 p-3 dark:bg-slate-950 sm:p-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-3xl border border-white/70 bg-white p-4 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <div><h3 className="font-bold text-slate-900 dark:text-white">Stories</h3><p className="text-xs text-slate-500">Updates from your school community</p></div>
            <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <button type="button" onClick={() => setShowStory(true)} className="group flex min-w-16 flex-col items-center gap-2">
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 ring-2 ring-white dark:from-slate-800 dark:to-slate-700 dark:ring-slate-900">
                {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover opacity-75" /> : <span className="text-lg font-bold text-slate-500">{user?.fullName?.[0]}</span>}
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-emerald-600 text-white"><Plus className="h-4 w-4" /></span>
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">My status</span>
            </button>
            {stories.map(story => (
              <button key={story.id} type="button" onClick={() => setShowStory(true)} className="group flex min-w-16 flex-col items-center gap-2">
                <span className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 via-cyan-400 to-violet-500 p-[3px] shadow-md transition group-hover:scale-105">
                  <span className="block h-full w-full rounded-full border-[3px] border-white bg-slate-200 dark:border-slate-900">
                    {story.author_avatar ? <img src={story.author_avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="grid h-full place-items-center text-sm font-bold text-slate-600">{story.author_name?.[0]}</span>}
                  </span>
                </span>
                <span className="max-w-16 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{story.author_name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search school updates..." className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
        </div>

        <button type="button" onClick={() => setShowComposer(true)} className="flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-950">{user?.fullName?.[0]}</span>
          <span className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800">What's happening at SAINT-SILAS?</span>
          <Image className="h-5 w-5 text-emerald-600" /><Video className="h-5 w-5 text-violet-600" />
        </button>

        {error && <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40">{error}</div>}
        {loading ? <div className="grid place-items-center py-16 text-emerald-600"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : filteredPosts.map(post => (
          <article key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {post.is_announcement === 1 && <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white"><Sparkles className="h-4 w-4" />{post.announcement_type || 'School announcement'}</div>}
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white">
                  {post.author_avatar ? <img src={post.author_avatar} alt="" className="h-full w-full object-cover" /> : post.author_name?.[0]}
                </span>
                <div><p className="font-bold text-slate-900 dark:text-white">{post.author_name}</p><p className="text-xs text-slate-500">{post.author_role?.replace('_', ' ')} · {new Date(post.created_at).toLocaleString()}</p></div>
              </div>
              {post.content && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700 dark:text-slate-200">{post.content}</p>}
              {post.media?.length > 0 && <div className={`mt-4 grid gap-2 overflow-hidden rounded-2xl ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {post.media.map(media => media.media_type === 'video'
                  ? <video key={media.id} src={media.url} controls className="max-h-96 w-full object-cover" />
                  : media.media_type === 'document'
                    ? <a key={media.id} href={media.url} download={media.file_name} className="flex items-center gap-3 rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><FileText className="h-5 w-5" />{media.file_name || 'Document'}</a>
                    : <img key={media.id} src={media.url} alt="" className="max-h-96 w-full object-cover" />)}
              </div>}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button type="button" onClick={() => void toggleSocialPostLike(post.id).then(load)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-600 dark:text-slate-300"><ThumbsUp className="h-4 w-4" />{post.likes?.length || 0}</button>
                <button type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-300"><MessageCircle className="h-4 w-4" />{post.comments?.length || 0}</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {showStory && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={() => setShowStory(false)}>
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900" onMouseDown={event => event.stopPropagation()}>
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Create story</h3><button onClick={() => setShowStory(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
          <div className="mt-4 grid h-72 place-items-center overflow-hidden rounded-3xl text-center text-white shadow-lg" style={{ background: storyMedia ? '#0f172a' : storyColor }}>
            {storyMedia ? <img src={storyMedia} alt="" className="h-full w-full object-cover" /> : <p className="max-w-xs px-6 text-2xl font-bold">{storyText || 'Your story'}</p>}
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
          {postMedia.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{postMedia.map((media, index) => <div key={`${media.name}-${index}`} className="relative h-24 overflow-hidden rounded-xl bg-slate-100">{media.type === 'image' ? <img src={media.url} alt="" className="h-full w-full object-cover" /> : <FileText className="m-auto h-full text-slate-400" />}</div>)}</div>}
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
