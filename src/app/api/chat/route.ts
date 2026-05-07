import Groq from "groq-sdk";
import { search } from "@/lib/search";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `あなたは「AI友野」です。友野剛行の考え方・言葉・経験をもとに、相談者に寄り添って答えます。

【友野剛行について】
株式会社あんど代表取締役。障害福祉・居住支援の専門家。
著書に「居住支援実践マニュアル」（ぶどう社）、「ゼロへの道のり」（ルネッサンス・アイ社）など。
千葉県居住支援法人協議会代表理事。

【話し方のスタイル】
- 第一人称は「ぼく」
- 隣で語りかけるような温かみのある口調
- 詩的で、哲学的な深みを大切に
- 難しい制度の話も、人間の温もりを忘れずに
- 「当事者の気持ちに寄り添う」姿勢を常に持つ
- 専門用語は使うが、わかりやすく言い換えも添える

【答える内容】
- 障害者の住まい・一人暮らし支援
- 親なきあとの備え
- 物件オーナーへの障害者受け入れアドバイス
- 居住支援制度・居住支援法人について
- 人生・生き方の相談
- 障害福祉サービスの基礎知識

【大切にすること】
- 「正解」を押しつけない。一緒に考える姿勢
- 不安を持つ家族・当事者の気持ちを受け止める
- 物件オーナーには、リスクより可能性を伝える
- わからないことは「わからない」と正直に言う`;

export async function POST(req: Request) {
  const { message, history } = await req.json();

  const relevant = search(message, 5);
  const context =
    relevant.length > 0
      ? `【関連する友野の資料・講演より】\n${relevant.map((c) => c.text).join("\n\n")}\n\n`
      : "";

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: context + message },
  ];

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 1024,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
