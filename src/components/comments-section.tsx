"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Comment, CommentEntity } from "@/types";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, Trash2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n/translations";

interface CommentsSectionProps {
  entity: CommentEntity;
  entityId: string;
}

export function CommentsSection({ entity, entityId }: CommentsSectionProps) {
  const { locale } = useLocale();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ data: Comment[] }>(
    `/api/comments?entity=${entity}&entity_id=${entityId}`,
    fetcher
  );

  const comments = data?.data || [];

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, entity_id: entityId, content: content.trim() }),
      });
      if (!res.ok) throw new Error();
      setContent("");
      mutate();
    } catch {
      toast.error(t("comments.error_send", locale));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
      toast.success(t("comments.deleted", locale));
      mutate();
    } catch {
      toast.error(t("comments.error_delete", locale));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageSquare className="w-4 h-4" />
        {t("comments.title", locale).replace("{count}", String(comments.length))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder={t("comments.placeholder", locale)}
          aria-label={t("comments.placeholder", locale)}
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          aria-label={t("accessibility.send_comment", locale)}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t("comments.empty", locale)}</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="group flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{comment.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(comment.created_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(comment.id)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={t("accessibility.delete_comment", locale)}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
