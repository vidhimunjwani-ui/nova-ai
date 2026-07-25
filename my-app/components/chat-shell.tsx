"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ImageIcon,
  Loader2,
  MessageSquarePlus,
  PencilLine,
  Plus,
  Search,
  SendHorizonal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nova-ai-conversations-v1";

type MessageRole = "user" | "assistant";
type MessageType = "text" | "image";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  imageUrl?: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `msg-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function readStorage() {
  if (typeof window === "undefined") {
    return [] as Conversation[];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [] as Conversation[];
    }

    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as Conversation[];
  }
}

function createConversation(title = "New chat"): Conversation {
  return {
    id: createId(),
    title,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

async function readChatText(response: Response) {
  if (!response.body) {
    return "I'm here and ready to help.";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // AI SDK v7 UIMessage stream format: lines like `0:"text chunk"` (type 0 = text delta)
      // Also handle legacy `data:` SSE format for compatibility.
      if (trimmed.startsWith("0:")) {
        const raw = trimmed.slice(2).trim();
        try {
          const text = JSON.parse(raw);
          if (typeof text === "string") {
            output += text;
          }
        } catch {
          // Ignore malformed stream chunks.
        }
        continue;
      }

      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const raw = trimmed.slice(5).trim();
      if (!raw || raw === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "text-delta" && typeof parsed.delta === "string") {
          output += parsed.delta;
        } else if (parsed.type === "text" && typeof parsed.value === "string") {
          output += parsed.value;
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }

  return output.trim() || "I'm here and ready to help.";
}

export function ChatShell() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isImageMode, setIsImageMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = readStorage();
    if (stored.length > 0) {
      setConversations(stored);
      setActiveConversationId(stored[0].id);
    } else {
      const initial = createConversation("Welcome");
      setConversations([initial]);
      setActiveConversationId(initial.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(query),
    );
  }, [conversations, search]);

  const startNewChat = () => {
    const next = createConversation("New chat");
    setConversations((prev) => [next, ...prev]);
    setActiveConversationId(next.id);
    setDraft("");
    setIsImageMode(false);
  };

  const renameConversation = (conversationId: string) => {
    const target = conversations.find((conversation) => conversation.id === conversationId);
    if (!target) {
      return;
    }

    const nextTitle = window.prompt("Rename conversation", target.title)?.trim();
    if (!nextTitle) {
      return;
    }

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title: nextTitle, updatedAt: new Date().toISOString() }
          : conversation,
      ),
    );
  };

  const deleteConversation = (conversationId: string) => {
    const nextConversations = conversations.filter((conversation) => conversation.id !== conversationId);
    if (nextConversations.length === 0) {
      const fallback = createConversation("New chat");
      setConversations([fallback]);
      setActiveConversationId(fallback.id);
      return;
    }

    setConversations(nextConversations);
    if (activeConversationId === conversationId) {
      setActiveConversationId(nextConversations[0].id);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeConversation) {
      return;
    }

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    setDraft("");
    setIsLoading(true);

    const nextMessages = [...activeConversation.messages, userMessage];
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              title:
                conversation.messages.length === 0
                  ? trimmed.slice(0, 32) || "New chat"
                  : conversation.title,
              messages: nextMessages,
              updatedAt: new Date().toISOString(),
            }
          : conversation,
      ),
    );

    try {
      if (isImageMode) {
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? data.message ?? "Image generation failed.");
        }

        if (!data.imageUrl) {
          throw new Error("No image URL returned from the API.");
        }

        const assistantMessage: Message = {
          id: createId(),
          role: "assistant",
          content: trimmed,
          type: "image",
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
        };

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                  ...conversation,
                  messages: [...nextMessages, assistantMessage],
                  updatedAt: new Date().toISOString(),
                }
              : conversation,
          ),
        );
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: [
              {
                type: "text" as const,
                text: message.type === "image" ? "[Generated image]" : message.content,
              },
            ],
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Chat request failed.");
      }

      const assistantText = await readChatText(response);
      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        type: "text",
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                messages: [...nextMessages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : conversation,
        ),
      );
    } catch (error) {
      const assistantMessage: Message = {
        id: createId(),
        role: "assistant",
        content:
          error instanceof Error ? error.message : "The assistant could not respond right now.",
        type: "text",
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                messages: [...nextMessages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : conversation,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(224,242,254,0.85)_35%,_rgba(191,219,254,0.6)_100%)] text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-56 w-56 rounded-full bg-white/70 blur-3xl" />
        <div className="absolute right-[-5%] top-10 h-64 w-64 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-72 w-72 rounded-full bg-cyan-100/70 blur-3xl" />
        <div className="absolute bottom-24 right-1/4 h-24 w-24 rounded-full bg-white/60 blur-2xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <aside
          className={cn(
            "relative flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/60 p-3 shadow-[0_25px_80px_-30px_rgba(2,132,199,0.45)] backdrop-blur-xl transition-all duration-300",
            isSidebarOpen ? "w-full max-w-[320px]" : "w-[72px]",
          )}
        >
          <div className="flex items-center justify-between rounded-2xl border border-sky-100/80 bg-white/70 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-200">
                <Sparkles className="h-5 w-5" />
              </div>
              {isSidebarOpen ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Nova AI</p>
                  <p className="text-xs text-slate-500">Chat + image studio</p>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setIsSidebarOpen((value) => !value)}
            >
              <Plus className={cn("h-4 w-4 transition-transform", !isSidebarOpen && "rotate-45")} />
            </Button>
          </div>

          {isSidebarOpen ? (
            <>
              <Button
                onClick={startNewChat}
                className="mt-3 h-12 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                New chat
              </Button>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search chats"
                  className="h-10 rounded-2xl border-slate-200 bg-white/80 pl-9"
                />
              </div>

              <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group rounded-2xl border px-3 py-3 transition-all",
                      conversation.id === activeConversationId
                        ? "border-sky-200 bg-sky-50/80 shadow-sm"
                        : "border-transparent bg-white/50 hover:border-sky-100 hover:bg-white/70",
                    )}
                  >
                    <button
                      className="flex w-full items-start gap-3 text-left"
                      onClick={() => setActiveConversationId(conversation.id)}
                    >
                      <div className="mt-0.5 rounded-xl bg-sky-100 p-2 text-sky-600">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {conversation.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {conversation.messages.length > 0 ? `${conversation.messages.length} messages` : "Start a new conversation"}
                        </p>
                      </div>
                    </button>

                    <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => renameConversation(conversation.id)}
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => deleteConversation(conversation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </aside>

        <main className="flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/55 p-3 shadow-[0_25px_80px_-30px_rgba(2,132,199,0.35)] backdrop-blur-xl sm:p-4 lg:p-5">
          <div className="flex-1 overflow-y-auto rounded-[24px] border border-white/70 bg-white/70 p-4 sm:p-6">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-sky-200 bg-gradient-to-br from-sky-50/80 to-white p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-200">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">What do you want to create today?</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Ask the assistant for help or switch to image mode to generate visuals directly inside this conversation.
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-[24px] px-4 py-3 shadow-sm sm:max-w-[72%]",
                        message.role === "user"
                          ? "bg-gradient-to-br from-sky-600 to-cyan-500 text-white"
                          : "border border-slate-200 bg-slate-50/90 text-slate-700",
                      )}
                    >
                      {message.type === "image" && message.imageUrl ? (
                        <div className="space-y-3">
                          <img
                            src={message.imageUrl}
                            alt={message.content}
                            className="w-full rounded-[18px] border border-white/50 object-cover"
                          />
                          <p className="text-sm leading-6 text-slate-700">{message.content}</p>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                      {isImageMode ? "Generating image..." : "Thinking..."}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 rounded-[24px] border border-sky-100 bg-white/85 p-2 shadow-[0_16px_40px_-18px_rgba(2,132,199,0.35)]">
            <div className="flex items-end gap-2 rounded-[20px] border border-slate-200 bg-slate-50/80 p-2">
              <Button
                type="button"
                variant={isImageMode ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-11 w-11 shrink-0 rounded-2xl",
                  isImageMode ? "bg-gradient-to-br from-sky-600 to-cyan-500" : "bg-white",
                )}
                onClick={() => setIsImageMode((value) => !value)}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={1}
                placeholder={isImageMode ? "Generate an image of..." : "Ask anything..."}
                className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              <Button
                type="submit"
                className="h-11 w-11 shrink-0 rounded-2xl bg-slate-900 p-0 text-white hover:bg-slate-800"
                disabled={isLoading || !draft.trim()}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between px-2 text-xs text-slate-500">
              <span>{isImageMode ? "Image mode is on" : "Chat mode is on"}</span>
              <span>Press Enter to send • Shift + Enter for a new line</span>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
