"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

const getProfileId = (): string | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("classroomProfile");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { _id?: string };
    return parsed?._id ?? null;
  } catch (error) {
    console.warn("Failed to parse profile id", error);
    return null;
  }
};

function coerceStatus(base: Status, patch?: Partial<Status> | Status | null): Status {
  if (!patch) return base;

  return {
    ...base,
    ...patch,
    createdBy: patch.createdBy ?? base.createdBy,
    comment: patch.comment ?? base.comment ?? [],
    like: patch.like ?? base.like ?? [],
    likeCount: patch.likeCount ?? base.likeCount,
    hasLiked: patch.hasLiked ?? base.hasLiked,
  };
}

const safeAuthor = (status: Status) => {
  if (!status) return "Unknown";
  if (typeof status.createdBy === "string") {
    return status.createdBy || "Unknown";
  }
  return status.createdBy?.name ?? "Unknown";
};

const safeCreatedAt = (date?: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const likeMeta = (count: number) => {
  if (count === 0) return "ยังไม่มีใครถูกใจ";
  if (count === 1) return "มี 1 ถูกใจ";
  return `มี ${count} ถูกใจ`;
};

const cloneStatuses = (entries: Status[]): Status[] =>
  entries.map((item) => ({
    ...item,
    comment: item.comment ? [...item.comment] : [],
    like: item.like ? [...item.like] : [],
  }));

const inferHasLiked = (status: Status, userId: string | null) => {
  if (!userId) return status.hasLiked ?? false;
  const likes = status.like ?? [];
  return likes.some((entry) =>
    typeof entry === "string" ? entry === userId : entry?._id === userId
  );
};

export default function StatusesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [flash, setFlash] = useState<Flash>(initialFlash);
  const [content, setContent] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [unlikeAvailable, setUnlikeAvailable] = useState(true);

  useEffect(() => {
    const storedToken = getClientToken();
    if (!storedToken) {
      setFlash({ text: "กำลังพาไปหน้าลงชื่อเข้าใช้...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    setToken(storedToken);
    setUserId(getProfileId());
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void loadStatuses(token, userId);
  }, [token, userId]);

  const loadStatuses = async (activeToken: string, profileId: string | null) => {
    try {
      setLoading(true);
      const data = await fetchStatuses(activeToken);
      const enriched = data.map((status) => ({
        ...status,
        hasLiked: inferHasLiked(status, profileId),
      }));
      setStatuses(enriched);
      if (enriched.length === 0) {
        setFlash({ text: "ยังไม่มีโพสต์ ลองเป็นคนแรกดูสิ!", tone: "idle" });
      } else {
        setFlash(initialFlash);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "ไม่สามารถโหลดโพสต์ได้";
      setFlash({ text, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setFlash({ text: "ไม่พบโทเคน กำลังพาไปหน้าลงชื่อเข้าใช้...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    if (!content.trim()) {
      setFlash({ text: "กรุณาพิมพ์ข้อความก่อนโพสต์", tone: "error" });
      return;
    }

    try {
      setPosting(true);
      await createStatus({ content: content.trim() }, token);
      setContent("");
      setFlash({ text: "โพสต์เรียบร้อยแล้ว", tone: "success" });
      await loadStatuses(token, userId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "ไม่สามารถโพสต์ได้";
      setFlash({ text, tone: "error" });
    } finally {
      setPosting(false);
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, statusId: string) => {
    event.preventDefault();
    if (!token) {
      setFlash({ text: "ไม่พบโทเคน กำลังพาไปหน้าลงชื่อเข้าใช้...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    const draft = commentDrafts[statusId]?.trim();
    if (!draft) {
      setFlash({ text: "กรุณาพิมพ์ความคิดเห็นก่อนส่ง", tone: "error" });
      return;
    }

    try {
      await createComment({ content: draft, statusId }, token);
      setCommentDrafts((prev) => ({ ...prev, [statusId]: "" }));
      await loadStatuses(token, userId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "ไม่สามารถเพิ่มความคิดเห็นได้";
      setFlash({ text, tone: "error" });
    }
  };

  const toggleLike = async (statusId: string, hasLiked: boolean) => {
    if (!token) {
      setFlash({ text: "ไม่พบโทเคน กำลังพาไปหน้าลงชื่อเข้าใช้...", tone: "error" });
      router.replace(loginRedirect(redirectTarget));
      return;
    }

    const previous = cloneStatuses(statuses);
    const delta = hasLiked ? -1 : 1;

    setStatuses((prev) =>
      prev.map((item) =>
        item._id === statusId
          ? {
              ...item,
              hasLiked: !hasLiked,
              likeCount: Math.max(0, (item.likeCount ?? 0) + delta),
            }
          : item
      )
    );

    try {
      const updated = hasLiked
        ? await unlikeStatus(statusId, token)
        : await likeStatus(statusId, token);

      if (!updated) {
        await loadStatuses(token, userId);
        return;
      }

      setStatuses((prev) =>
        prev.map((item) =>
          item._id === statusId
            ? {
                ...coerceStatus(item, updated),
                hasLiked: updated.hasLiked ?? !hasLiked,
                likeCount:
                  typeof updated.likeCount === "number"
                    ? updated.likeCount
                    : item.likeCount,
              }
            : item
        )
      );
      setUnlikeAvailable(true);
    } catch (error) {
      setStatuses(previous);
      const message = error instanceof Error ? error.message : "ไม่สามารถอัปเดตยอดถูกใจได้";
      const is404 = message.includes("404") || message.toLowerCase().includes("not found") || message.includes("<!DOCTYPE");

      if (hasLiked && is404) {
        setUnlikeAvailable(false);
        setFlash({
          text: "ระบบยังไม่เปิดให้ยกเลิกถูกใจ กรุณาลองใหม่ภายหลัง",
          tone: "error",
        });
      } else {
        setFlash({ text: message, tone: "error" });
      }
    }
  };

  const commentDraftValue = useMemo(() => commentDrafts, [commentDrafts]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Status Board</h1>
        <p>โพสต์อัปเดต พูดคุย แลกเปลี่ยนความคิดเห็น และติดตามบทสนทนาจากเพื่อนร่วมชั้น</p>
      </header>

      <section className={styles.postBox}>
        <form onSubmit={handlePost} className={styles.postForm}>
          <textarea
            rows={4}
            placeholder="เล่าเรื่องราวหรืออัปเดตของคุณที่นี่..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={!token || posting}
          />
          <div className={styles.postActions}>
            <button type="submit" disabled={!token || posting}>
              {posting ? "กำลังโพสต์..." : "Post status"}
            </button>
            {!token ? <span className={styles.postHint}>ต้องลงชื่อเข้าใช้ก่อนจึงจะโพสต์ได้</span> : null}
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
        {loading ? <p className={styles.loading}>กำลังโหลดโพสต์...</p> : null}

        {!loading && statuses.length === 0 && !flash.text ? (
          <p className={styles.empty}>ยังไม่มีโพสต์ในขณะนี้</p>
        ) : null}

        {statuses.map((status) => {
          const disableUnlike = status.hasLiked && !unlikeAvailable;

          return (
            <article key={status._id} className={styles.card}>
              <header className={styles.cardHeader}>
                <div className={styles.cardMeta}>
                  <h2>{safeAuthor(status)}</h2>
                  <time dateTime={status.createdAt ?? ""}>{safeCreatedAt(status.createdAt)}</time>
                </div>
                <div className={styles.likeGroup}>
                  <button
                    type="button"
                    className={`${styles.likeToggle} ${status.hasLiked ? styles.likeActive : ""}`}
                    onClick={() => toggleLike(status._id, status.hasLiked)}
                    disabled={!token || disableUnlike}
                    aria-pressed={status.hasLiked}
                    aria-label={status.hasLiked ? "Unlike this status" : "Like this status"}
                  >
                    <span className={styles.likeIcon} aria-hidden="true">
                      {status.hasLiked ? "♥" : "♡"}
                    </span>
                    <span className={styles.likeTotal} aria-hidden="true">{status.likeCount}</span>
                    <span className={styles.likeLabel}>
                      {disableUnlike ? "Liked" : status.hasLiked ? "Unlike" : "Like"}
                    </span>
                  </button>
                  <span className={styles.likeMeta} aria-live="polite">
                    {likeMeta(status.likeCount ?? 0)}
                  </span>
                  {disableUnlike ? (
                    <span className={styles.likeNotice}>ระบบยังไม่รองรับการยกเลิกถูกใจ</span>
                  ) : null}
                </div>
              </header>

              <p className={styles.content}>{status.content}</p>

              <section className={styles.comments}>
                <h3>Comments</h3>
                {status.comment?.length ? (
                  <ul>
                    {status.comment.map((comment) => (
                      <li key={comment._id}>
                        <p>{comment.content}</p>
                        <time dateTime={comment.createdAt ?? ""}>{safeCreatedAt(comment.createdAt)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyComment}>ยังไม่มีความคิดเห็น</p>
                )}

                <form className={styles.commentForm} onSubmit={(event) => handleComment(event, status._id)}>
                  <input
                    type="text"
                    placeholder="พิมพ์ความคิดเห็นของคุณ"
                    value={commentDraftValue[status._id] ?? ""}
                    onChange={(event) =>
                      setCommentDrafts((prev) => ({ ...prev, [status._id]: event.target.value }))
                    }
                    disabled={!token}
                  />
                  <button type="submit" disabled={!token}>Comment</button>
                </form>
              </section>
            </article>
          );
        })}
      </section>
    </div>
  );
}
