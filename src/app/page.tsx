"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

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
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, [input]);

  const toggleListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("このブラウザは音声入力に対応していません。Chromeをお使いください。");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
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
      {/* ヘッダー */}
      <header className="bg-amber-800 text-white py-4 px-6 shadow-md">
        <h1 className="text-xl font-bold">AI友野</h1>
        <p className="text-amber-200 text-sm">
          障害福祉・居住支援・人生相談 — 友野剛行の考え方でお答えします
        </p>
      </header>

      {/* メインレイアウト */}
      <div className="flex flex-1 overflow-hidden">

        {/* サイドバー */}
        <aside className="hidden md:flex flex-col w-56 bg-amber-900 text-white flex-shrink-0">
          <div className="relative w-full h-64 overflow-hidden">
            <Image
              src="/tomono-pigeon.jpeg"
              alt="友野剛行と鳩"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="p-4 flex flex-col gap-2">
            <p className="font-bold text-lg">友野 剛行</p>
            <p className="text-amber-300 text-xs leading-relaxed">
              株式会社あんど<br />代表取締役
            </p>
            <div className="border-t border-amber-700 pt-3 mt-1">
              <p className="text-amber-300 text-xs leading-relaxed">
                障害福祉・居住支援・<br />親なきあと問題の専門家
              </p>
            </div>
            <div className="border-t border-amber-700 pt-3 mt-1">
              <p className="text-amber-400 text-xs leading-relaxed">
                著書<br />
                「居住支援実践マニュアル」<br />
                「ゼロへの道のり」<br />
                「福祉作業所を立ち上げよう」
              </p>
            </div>
          </div>
        </aside>

        {/* チャットエリア */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1 border-2 border-amber-300">
                    <Image
                      src="/tomono-office.jpeg"
                      alt="友野剛行"
                      width={40}
                      height={40}
                      className="object-cover object-top"
                    />
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
                <div className="w-10 h-10 rounded-full overflow-hidden mr-2 flex-shrink-0 border-2 border-amber-300">
                  <Image
                    src="/tomono-office.jpeg"
                    alt="友野剛行"
                    width={40}
                    height={40}
                    className="object-cover object-top"
                  />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 text-gray-400 shadow-sm">
                  考えています…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </main>

          <footer className="bg-white border-t border-amber-200 px-4 py-4">
            <div className="max-w-2xl mx-auto flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                className="flex-1 border border-amber-300 rounded-xl px-4 py-3 text-sm resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
                style={{ minHeight: "5.5rem", maxHeight: "200px" }}
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={toggleListening}
                  disabled={loading}
                  title={listening ? "音声入力を停止" : "音声入力を開始"}
                  className={`rounded-xl px-3 py-2 text-lg transition-colors ${
                    listening
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                  }`}
                >
                  🎤
                </button>
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 text-white rounded-xl px-5 py-2 text-sm font-bold transition-colors"
                >
                  送信
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-amber-400 mt-2">
              {listening ? "🔴 音声入力中… もう一度🎤を押すと停止" : "Shift+Enter で改行 / Enter で送信"}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
