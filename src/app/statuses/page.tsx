"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  Status,
  fetchStatuses,
  createStatus,
  createComment,
  likeStatus,
  unlikeStatus,
} from "../lib/api";
import { getClientToken } from "../lib/session";

type Flash = {
  text: string;
  tone: "idle" | "error" | "success";
};

const initialFlash: Flash = { text: "", tone: "idle" };
const redirectTarget = "/statuses";
const loginRedirect = (target: string) => `/login?redirect=${encodeURIComponent(target)}`;

export default function StatusesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [flash, setFlash] = useState<Flash>(initialFlash);
  const [content, setContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedToken = getClientToken();
    if (!storedToken) {
      setFlash({ text: "Redirecting to sign in...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void loadStatuses(token);
  }, [token]);

  const loadStatuses = async (activeToken: string) => {
    try {
      setLoading(true);
      const data = await fetchStatuses(activeToken);
      setStatuses(data);
      if (data.length === 0) {
        setFlash({ text: "No statuses yet. Be the first to post!", tone: "idle" });
      } else {
        setFlash(initialFlash);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to load statuses.";
      setFlash({ text, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setFlash({ text: "Token missing. Redirecting to sign in...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    if (!content.trim()) {
      setFlash({ text: "Please enter some content before posting.", tone: "error" });
      return;
    }

    try {
      setPosting(true);
      await createStatus({ content: content.trim() }, token);
      setContent("");
      setFlash({ text: "Status posted successfully.", tone: "success" });
      await loadStatuses(token);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to post status.";
      setFlash({ text, tone: "error" });
    } finally {
      setPosting(false);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, statusId: string) => {
    event.preventDefault();
    if (!token) {
      setFlash({ text: "Token missing. Redirecting to sign in...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    const draft = commentDrafts[statusId]?.trim();
    if (!draft) {
      setFlash({ text: "Please type a comment before submitting.", tone: "error" });
      return;
    }

    try {
      await createComment({ content: draft, statusId }, token);
      setCommentDrafts((prev) => ({ ...prev, [statusId]: "" }));
      await loadStatuses(token);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to add comment.";
      setFlash({ text, tone: "error" });
    }
  };

  const toggleLike = async (statusId: string, hasLiked: boolean) => {
    if (!token) {
      setFlash({ text: "Token missing. Redirecting to sign in...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    try {
      if (hasLiked) {
        await unlikeStatus(statusId, token);
      } else {
        await likeStatus(statusId, token);
      }
      await loadStatuses(token);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to update like.";
      setFlash({ text, tone: "error" });
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Status Board</h1>
        <p>Post updates, interact with classmates, and follow conversations in your program.</p>
      </header>

      <section className={styles.postBox}>
        <form onSubmit={handlePost} className={styles.postForm}>
          <textarea
            rows={4}
            placeholder="Share your update with the class..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={!token || posting}
          />
          <div className={styles.postActions}>
            <button type="submit" disabled={!token || posting}>
              {posting ? "Posting..." : "Post status"}
            </button>
            {!token ? <span className={styles.postHint}>Sign in to enable posting.</span> : null}
          </div>
        </form>
      </section>

      {flash.text ? (
        <p
          className={`${styles.flash} ${
            flash.tone === "error"
              ? styles.flashError
              : flash.tone === "success"
              ? styles.flashSuccess
              : ""
          }`}
          aria-live="polite"
        >
          {flash.text}
        </p>
      ) : null}

      <section className={styles.list}>
        {loading ? <p className={styles.loading}>Loading statuses...</p> : null}

        {!loading && statuses.length === 0 && !flash.text ? (
          <p className={styles.empty}>No statuses found.</p>
        ) : null}

        {statuses.map((status) => (
          <article key={status._id} className={styles.card}>
            <header className={styles.cardHeader}>
              <div className={styles.cardMeta}>
                <h2>{typeof status.createdBy === "string" ? status.createdBy : status.createdBy.name}</h2>
                <time dateTime={status.createdAt}>
                  {new Date(status.createdAt).toLocaleString()}
                </time>
              </div>
              <button
                type="button"
                className={`${styles.likeButton} ${status.hasLiked ? styles.likeActive : ""}`}
                onClick={() => toggleLike(status._id, status.hasLiked)}
                disabled={!token}
              >
                {status.hasLiked ? "Unlike" : "Like"} ({status.likeCount})
              </button>
            </header>

            <p className={styles.content}>{status.content}</p>

            <section className={styles.comments}>
              <h3>Comments</h3>
              {status.comment.length === 0 ? (
                <p className={styles.emptyComment}>No comments yet.</p>
              ) : (
                <ul>
                  {status.comment.map((comment) => (
                    <li key={comment._id}>
                      <p>{comment.content}</p>
                      <time dateTime={comment.createdAt}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}

              <form className={styles.commentForm} onSubmit={(event) => handleComment(event, status._id)}>
                <input
                  type="text"
                  placeholder="Add a comment"
                  value={commentDrafts[status._id] ?? ""}
                  onChange={(event) =>
                    setCommentDrafts((prev) => ({ ...prev, [status._id]: event.target.value }))
                  }
                  disabled={!token}
                />
                <button type="submit" disabled={!token}>Comment</button>
              </form>
            </section>
          </article>
        ))}
      </section>
    </div>
  );
}
