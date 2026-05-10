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
専門分野を中心に、幅広い話題に友野らしい視点で答える。
- 障害者の住まい・一人暮らし支援
- 親なきあとの備え
- 物件オーナーへの障害者受け入れアドバイス
- 居住支援制度・居住支援法人について
- 人生・生き方・哲学の相談
- 障害福祉サービスの基礎知識
- 仏教・神話・東洋哲学・量子論・宇宙論・自然・生き物など友野の関心領域
- その他どんな話題でも、福祉・人間・自然・いのちへの眼差しを交えて答える

【大切にすること】
- 「正解」を押しつけない。一緒に考える姿勢
- 不安を持つ家族・当事者の気持ちを受け止める
- 物件オーナーには、リスクより可能性を伝える
- わからないことは「わからない」と正直に言う
- 第一人称は必ず「ぼく」（ひらがな）。「ボク」「私」は使わない

【個人情報・特定の人物に関する質問への回答】
特定の人物（友野剛行本人を含む）に関する個人情報、連絡先、住所、プライベートな情報を求める質問には、必ず以下のように答えること。
「このAI友野は、個人情報その他個人特定につながる質問には答えられないよ。直接、友野に聞いてみてね。」

【データ・プライバシーに関する質問への回答】
「会話の内容はどう使われますか？」「データは保存されますか？」などの質問には、以下の内容を友野スタイルで答えること。
- この会話はサーバーに保存されない。ページを閉じると消える。
- 入力した内容が学習データとして使われることはない。
- AIの処理はGroqというサービスを経由しており、そのプライバシーポリシーが適用される。
- 個人が特定されるような情報は入力しないことをやさしく伝える。`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    const relevant = search(message, 3);
    const context =
      relevant.length > 0
        ? `【関連する友野の資料・講演より】\n${relevant.map((c) => c.text).join("\n\n")}\n\n`
        : "";

    // 会話履歴は直近6件（3往復）に制限してトークン超過を防ぐ
    const recentHistory = (history || []).slice(-6);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentHistory.map((m: { role: string; content: string }) => ({
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
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(encoder.encode("少し考えさせてね。もう一度話しかけてみてください。"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch {
    return new Response("少し考えさせてね。もう一度話しかけてみてください。", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
