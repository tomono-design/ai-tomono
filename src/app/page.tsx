"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "こんにちは。ぼくは「AI友野」です。障害のある方の住まいや、親なきあとのこと、居住支援のこと、あるいは人生のこと、何でも気軽に話しかけてください。一緒に考えましょう。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const history = messages.slice(1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "申し訳ありません、エラーが発生しました。もう一度お試しください。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-800 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold">AI友野</h1>
        <p className="text-amber-200 text-sm">
          障害福祉・居住支援・人生相談 — 友野剛行の考え方でお答えします
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
                友
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-amber-700 text-white rounded-tr-none"
                  : "bg-white text-gray-800 shadow-sm rounded-tl-none"
              }`}
            >
              {msg.content || (loading && i === messages.length - 1 ? "▌" : "")}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
              友
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 text-gray-400 shadow-sm">
              考えています…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="bg-white border-t border-amber-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            className="flex-1 border border-amber-300 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            rows={2}
            placeholder="質問や相談を入力してください…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 text-white rounded-xl px-5 py-2 text-sm font-bold transition-colors"
          >
            送信
          </button>
        </div>
        <p className="text-center text-xs text-amber-400 mt-2">
          Shift+Enter で改行 / Enter で送信
        </p>
      </footer>
    </div>
  );
}
