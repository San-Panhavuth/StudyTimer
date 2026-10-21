import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

type Update = { message?: { text?: string; chat?: { id?: number } } };

// Telegram calls this when someone messages the bot or posts in a group it's
// in. We handle `/setAccount <Parent ID>` (link this chat to a parent) and
// `/stop` (unlink it). The optional `@botname` is how Telegram addresses a
// command inside a group.
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as Update | null;
  const text = update?.message?.text?.trim() ?? "";
  const chatId = update?.message?.chat?.id;
  if (!chatId) return Response.json({ ok: true });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const setAccount = /^\/setaccount(?:@\w+)?\s+([A-Za-z0-9]+)$/i.exec(text);
  if (setAccount) {
    const { data: linked } = await supabase.rpc("link_telegram_chat", { p_code: setAccount[1], p_chat_id: chatId });
    await sendTelegramMessage(
      chatId,
      linked
        ? "Connected. This chat will get a message whenever your child finishes a study session. Send /stop to turn it off."
        : "No parent account has that ID. Check the Parent ID in your Study Time profile menu.",
    );
    return Response.json({ ok: true });
  }

  if (/^\/stop(?:@\w+)?$/i.test(text)) {
    await supabase.rpc("unlink_telegram_chat", { p_chat_id: chatId });
    await sendTelegramMessage(chatId, "Stopped. This chat won't get study notifications anymore.");
    return Response.json({ ok: true });
  }

  if (/^\/(start|setaccount)(?:@\w+)?$/i.test(text)) {
    await sendTelegramMessage(chatId, "Send /setAccount followed by your Parent ID, for example: /setAccount 1A2B3C4D");
  }
  return Response.json({ ok: true });
}
