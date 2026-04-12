'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ChatMeta = {
  id: string;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string | null;
  status?: 'loading';
};

type EnrolledCourse = {
  id: string;
  title: string;
  courseKey: string;
};

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function displayNameFromChat(chat: ChatMeta) {
  return chat.title || 'Chat baru';
}

function displayTime(iso?: string | null) {
  const v = normalizeString(iso);
  if (!v) return '';
  return v.replace('T', ' ').replace('Z', '');
}

async function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h10M8 11h10M8 15h7M6 3h11a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

type MdBlock =
  | { type: 'text'; value: string }
  | { type: 'code'; lang: string; code: string };

function splitMarkdownBlocks(input: string): MdBlock[] {
  const text = normalizeString(input);
  if (!text) return [{ type: 'text', value: '' }];

  const blocks: MdBlock[] = [];
  const re = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index;
    const end = re.lastIndex;
    if (start > lastIndex) {
      blocks.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    blocks.push({
      type: 'code',
      lang: normalizeString(match[1] || ''),
      code: match[2] || '',
    });
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return blocks;
}

function renderInlineBold(text: string, keyPrefix: string) {
  const parts = text.split('**');
  if (parts.length === 1) return [text];
  const nodes: any[] = [];
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    if (idx % 2 === 1) {
      nodes.push(
        <strong key={`${keyPrefix}_b_${idx}`} className="font-semibold text-white">
          {part}
        </strong>
      );
    } else if (part) {
      nodes.push(<span key={`${keyPrefix}_t_${idx}`}>{part}</span>);
    } else {
      nodes.push(<span key={`${keyPrefix}_e_${idx}`} />);
    }
  }
  return nodes;
}

function renderInlineRich(text: string, keyPrefix: string) {
  const input = text ?? '';
  const re = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const nodes: any[] = [];

  const pushPlain = (plain: string, key: string) => {
    if (!plain) return;
    nodes.push(...renderInlineBold(plain, key));
  };

  while ((match = re.exec(input))) {
    const start = match.index;
    const end = re.lastIndex;
    if (start > lastIndex) {
      pushPlain(input.slice(lastIndex, start), `${keyPrefix}_p_${lastIndex}`);
    }

    const code = match[1] || '';
    nodes.push(
      <code
        key={`${keyPrefix}_c_${start}`}
        className="inline-flex max-w-full items-center rounded-md border border-purple-600/50 bg-purple-950/40 px-1.5 py-0.5 font-mono text-[0.85em] text-purple-100 break-all"
      >
        {code}
      </code>
    );

    lastIndex = end;
  }

  if (lastIndex < input.length) {
    pushPlain(input.slice(lastIndex), `${keyPrefix}_p_end`);
  }

  return nodes.length ? nodes : [text];
}

function renderTextBlock(value: string, keyPrefix: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const nodes: any[] = [];
  let pendingList: string[] = [];

  const flushList = (listKey: string) => {
    if (pendingList.length === 0) return;
    nodes.push(
      <ul key={listKey} className="list-disc pl-6 space-y-1 text-sm leading-relaxed">
        {pendingList.map((item, idx) => (
          <li key={`${listKey}_${idx}`}>{renderInlineRich(item, `${listKey}_${idx}`)}</li>
        ))}
      </ul>
    );
    pendingList = [];
  };

  let paragraph: string[] = [];
  const flushParagraph = (pKey: string) => {
    if (paragraph.length === 0) return;
    const text = paragraph.join('\n');
    nodes.push(
      <p key={pKey} className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderInlineRich(text, pKey)}
      </p>
    );
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trimEnd();
    const headingMatch = /^\s*###\s+(.+)$/.exec(trimmed);
    const listMatch = /^\s*\*\s+(.+)$/.exec(trimmed);
    const isBlank = trimmed.trim() === '';

    if (headingMatch) {
      flushList(`${keyPrefix}_ul_${i}`);
      flushParagraph(`${keyPrefix}_p_${i}`);
      nodes.push(
        <div
          key={`${keyPrefix}_h3_${i}`}
          className="text-base font-semibold text-white"
        >
          {renderInlineRich(headingMatch[1], `${keyPrefix}_h3_${i}`)}
        </div>
      );
      continue;
    }

    if (listMatch) {
      flushParagraph(`${keyPrefix}_p_${i}`);
      pendingList.push(listMatch[1]);
      continue;
    }

    if (pendingList.length) {
      flushList(`${keyPrefix}_ul_${i}`);
    }

    if (isBlank) {
      flushParagraph(`${keyPrefix}_p_${i}`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushList(`${keyPrefix}_ul_end`);
  flushParagraph(`${keyPrefix}_p_end`);

  if (nodes.length === 0) return [<span key={`${keyPrefix}_empty`} />];
  return nodes;
}

export default function AiChatClient() {
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const [connectOpen, setConnectOpen] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(pointer: coarse)');
    const apply = () => setIsCoarsePointer(Boolean(media.matches));
    apply();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
    // Safari legacy
    // @ts-ignore
    if (typeof media.addListener === 'function') {
      // @ts-ignore
      media.addListener(apply);
      // @ts-ignore
      return () => media.removeListener(apply);
    }
  }, []);

  const refreshChats = async (selectId?: string | null) => {
    setIsLoadingChats(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/chats');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat chat');
        return;
      }
      const nextChats = (data?.chats || []) as ChatMeta[];
      setChats(nextChats);

      const idToSelect = selectId || selectedChatId || nextChats?.[0]?.id || null;
      if (idToSelect && idToSelect !== selectedChatId) {
        setSelectedChatId(idToSelect);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat chat');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadChat = async (chatId: string) => {
    setIsLoadingChat(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/ai/chats/${chatId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat chat');
        return;
      }
      setSelectedChat(data?.chat || null);
      setMessages((data?.messages || []) as ChatMessage[]);
      setSelectedCourseId(normalizeString(data?.chat?.courseId) || '');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat chat');
    } finally {
      setIsLoadingChat(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  };

  const handleNewChat = async () => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal membuat chat');
        return;
      }
      const id = data?.chat?.id as string;
      await refreshChats(id);
      setSelectedChatId(id);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membuat chat');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const ok = window.confirm('Hapus chat ini?');
    if (!ok) return;
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/ai/chats/${chatId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal menghapus chat');
        return;
      }
      const remaining = chats.filter((c) => c.id !== chatId);
      setChats(remaining);
      if (selectedChatId === chatId) {
        const nextId = remaining?.[0]?.id || null;
        setSelectedChatId(nextId);
        if (!nextId) {
          setSelectedChat(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghapus chat');
    }
  };

  const fetchEnrolledCourses = async () => {
    setIsLoadingCourses(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/courses/enrolled');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat kursus');
        return;
      }
      setEnrolledCourses((data?.courses || []) as EnrolledCourse[]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat kursus');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleSaveCourseConnection = async () => {
    if (!selectedChatId) return;
    setIsSavingCourse(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/ai/chats/${selectedChatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal menyimpan koneksi kursus');
        return;
      }
      const nextChat = data?.chat as ChatMeta;
      setSelectedChat(nextChat);
      setChats((prev) => prev.map((c) => (c.id === nextChat.id ? nextChat : c)));
      setConnectOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan koneksi kursus');
    } finally {
      setIsSavingCourse(false);
    }
  };

  const sendMessage = async (rawText: string) => {
    if (!selectedChatId) return;
    const text = rawText.trim();
    if (!text) return;
    if (isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    setDraft('');

    const optimisticUser: ChatMessage = {
      id: `tmp_user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    const optimisticLoading: ChatMessage = {
      id: `tmp_ai_loading_${Date.now()}`,
      role: 'assistant',
      content: '',
      status: 'loading',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser, optimisticLoading]);

    try {
      const res = await fetch(`/api/ai/chats/${selectedChatId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal mengirim pesan');
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id && m.id !== optimisticLoading.id));
        setDraft(text);
        return;
      }

      const reply = normalizeString(data?.reply) || '(Tidak ada respon)';
      const optimisticAssistant: ChatMessage = {
        id: `tmp_assistant_${Date.now()}`,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticLoading.id),
        optimisticAssistant,
      ]);
      await refreshChats(selectedChatId);
      await loadChat(selectedChatId);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim pesan');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id && m.id !== optimisticLoading.id));
      setDraft(text);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(draft);
  };

  useEffect(() => {
    refreshChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChatId) return;
    loadChat(selectedChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  const connectedLabel = useMemo(() => {
    if (!selectedChat?.courseId) return 'Belum terhubung';
    return selectedChat.courseTitle || selectedChat.courseId;
  }, [selectedChat?.courseId, selectedChat?.courseTitle]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI Chatbot</h1>
        <p className="text-purple-200">
          Chat dengan AI, bisa dihubungkan ke kursus yang kamu ikuti.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 overflow-hidden">
          <div className="p-4 border-b border-purple-700 flex items-center justify-between">
            <div className="font-semibold text-white">Chat</div>
            <button
              onClick={handleNewChat}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-600/30 transition"
            >
              + Baru
            </button>
          </div>

          {isLoadingChats ? (
            <div className="p-4 text-sm text-purple-200">Memuat...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-sm text-purple-200">Belum ada chat. Buat chat baru.</div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-purple-800/60">
              {chats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedChatId(c.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left p-4 hover:bg-purple-900/40 transition ${
                    selectedChatId === c.id ? 'bg-purple-900/50' : ''
                  } cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{displayNameFromChat(c)}</div>
                      <div className="mt-1 text-xs text-purple-300 truncate">
                        {c.courseTitle ? `Terhubung: ${c.courseTitle}` : c.courseId ? `Terhubung: ${c.courseId}` : 'Tidak terhubung'}
                      </div>
                      <div className="mt-1 text-xs text-purple-300">
                        {displayTime(c.updatedAt || c.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(c.id);
                      }}
                      className="shrink-0 rounded-lg border border-red-500/50 bg-red-500/10 px-2 py-2 text-red-200 hover:bg-red-500/20 transition"
                      title="Hapus chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m2 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 overflow-hidden">
          <div className="p-4 border-b border-purple-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">
                {selectedChat ? displayNameFromChat(selectedChat) : 'Pilih chat'}
              </div>
              <div className="mt-1 text-xs text-purple-300 truncate">
                Kursus: {connectedLabel}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  setConnectOpen((v) => !v);
                  if (!connectOpen && enrolledCourses.length === 0) {
                    await fetchEnrolledCourses();
                  }
                }}
                disabled={!selectedChatId}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-900/30 px-4 py-2 text-sm text-purple-100 hover:bg-purple-900/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title="Hubungkan ke kursus"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14a5 5 0 007.07 0l1.83-1.83a5 5 0 00-7.07-7.07L10 5m4 14l-1.83 1.83a5 5 0 01-7.07-7.07L7 11" />
                </svg>
                Hubungkan
              </button>
              <button
                type="button"
                onClick={() => selectedChatId && loadChat(selectedChatId)}
                disabled={!selectedChatId || isLoadingChat}
                className="rounded-lg border border-purple-600 px-4 py-2 text-sm text-purple-200 hover:bg-purple-900/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingChat ? 'Memuat...' : 'Reload'}
              </button>
            </div>
          </div>

          {connectOpen && (
            <div className="p-4 border-b border-purple-700 bg-purple-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-purple-100 mb-2">
                    Pilih kursus yang dihubungkan
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white"
                    disabled={isLoadingCourses}
                  >
                    <option value="">Tidak terhubung</option>
                    {enrolledCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.courseKey})
                      </option>
                    ))}
                  </select>
                  {isLoadingCourses && <div className="mt-2 text-xs text-purple-200">Memuat kursus...</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCourseConnection}
                    disabled={!selectedChatId || isSavingCourse}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium hover:shadow-lg hover:shadow-purple-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingCourse ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectOpen(false)}
                    className="px-4 py-2 rounded-lg border border-purple-600 text-purple-200 text-sm hover:bg-purple-900/40 transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedChatId ? (
            <div className="p-6 text-purple-200">Pilih chat di sebelah kiri, atau buat chat baru.</div>
          ) : (
            <>
              <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-purple-200 text-sm">
                    Mulai chat dengan mengetik pesan di bawah.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[900px] ${
                        m.role === 'user' ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`rounded-2xl border px-4 py-3 ${
                          m.role === 'user'
                            ? 'border-purple-600 bg-purple-700/30 text-white'
                            : 'border-purple-700 bg-purple-950/20 text-purple-100'
                        }`}
                      >
                        {m.status === 'loading' ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-purple-300 animate-bounce [animation-delay:0ms]" />
                              <span className="h-2 w-2 rounded-full bg-purple-300 animate-bounce [animation-delay:120ms]" />
                              <span className="h-2 w-2 rounded-full bg-purple-300 animate-bounce [animation-delay:240ms]" />
                            </div>
                            <div className="text-xs text-purple-200">AI sedang berpikir...</div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {splitMarkdownBlocks(m.content).map((b, idx) => {
                              const k = `${m.id}_blk_${idx}`;
                              if (b.type === 'code') {
                                const langLabel = b.lang || 'code';
                                const codeText = b.code.replace(/\n$/, '');
                                const copyKey = `${m.id}_code_${idx}`;
                                return (
                                  <div key={k} className="rounded-xl border border-purple-700 bg-black/20 overflow-hidden">
                                    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-purple-800/60 bg-purple-950/20">
                                      <div className="text-xs font-mono text-purple-200 truncate">
                                        {langLabel}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await copyToClipboard(codeText);
                                          setCopiedKey(copyKey);
                                          window.setTimeout(() => setCopiedKey((v) => (v === copyKey ? null : v)), 900);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-900/30 px-2 py-1.5 text-xs text-purple-100 hover:bg-purple-900/50 transition"
                                        title="Salin kode"
                                      >
                                        <CopyIcon className="w-4 h-4" />
                                        {copiedKey === copyKey ? 'Tersalin' : 'Salin'}
                                      </button>
                                    </div>
                                    <pre className="p-3 overflow-x-auto text-xs leading-relaxed text-purple-100">
                                      <code className="font-mono">{codeText}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <div key={k} className="space-y-3">
                                  {renderTextBlock(b.value, k)}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {m.status !== 'loading' && (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-[11px] text-purple-300">
                              {m.createdAt ? displayTime(m.createdAt) : ''}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const key = `${m.id}_copy_msg`;
                                await copyToClipboard(m.content);
                                setCopiedKey(key);
                                window.setTimeout(() => setCopiedKey((v) => (v === key ? null : v)), 900);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-900/30 px-3 py-1.5 text-xs text-purple-100 hover:bg-purple-900/50 transition"
                              title="Salin pesan"
                            >
                              <CopyIcon className="w-4 h-4" />
                              {copiedKey === `${m.id}_copy_msg` ? 'Tersalin' : 'Salin'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-purple-700 bg-purple-950/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-purple-100 mb-2">Pesan</label>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (isCoarsePointer) return;
                        // React typings don't expose `isComposing` on KeyboardEvent.
                        if ((e.nativeEvent as any)?.isComposing) return;
                        if (e.key !== 'Enter') return;
                        if (e.shiftKey) return;
                        if (e.altKey || e.ctrlKey || e.metaKey) return;
                        e.preventDefault();
                        void sendMessage(draft);
                      }}
                      className="w-full min-h-20 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Tulis pertanyaanmu..."
                      disabled={isSending}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Kirim
                  </button>
                </div>
                <div className="mt-2 text-xs text-purple-300">
                  Tips: Hubungkan chat ke kursus untuk konteks (judul & daftar konten kursus).
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
