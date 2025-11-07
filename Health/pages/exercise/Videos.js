// pages/exercise/Videos.js
const h = window.React.createElement;
const { useEffect, useState, useMemo, useCallback } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

const EXERCISE_VIDEOS_URL = "./apidata/exercise-videos.json";

// ปรับค่าความสูงสูงสุดของวิดีโอจากตรงนี้ได้
const VIDEO_MAX_PX = 420; // รองรับวิดีโอแนวตั้ง (สูงขึ้น)

export function ExerciseVideos({ data }) {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  const hasPropData = !!(data && Array.isArray(data.items) && data.items.length);
  const [remotePlaylist, setRemotePlaylist] = useState(null);
  const [loadState, setLoadState] = useState({ status: "idle", error: null });

  useEffect(() => {
    if (hasPropData) return;
    if (typeof fetch !== "function") {
      setLoadState({ status: "error", error: "อุปกรณ์ไม่รองรับการโหลดข้อมูล" });
      return;
    }
    let cancelled = false;
    setLoadState({ status: "loading", error: null });
    fetch(EXERCISE_VIDEOS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("โหลดรายการวิดีโอไม่สำเร็จ");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json && Array.isArray(json.items) && json.items.length) {
          setRemotePlaylist(json);
          setLoadState({ status: "success", error: null });
        } else {
          setRemotePlaylist(null);
          setLoadState({ status: "error", error: "ไม่พบวิดีโอในไฟล์ข้อมูล" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setRemotePlaylist(null);
        setLoadState({ status: "error", error: err?.message || "โหลดวิดีโอไม่ได้" });
      });
    return () => { cancelled = true; };
  }, [hasPropData]);

  const playlist = hasPropData ? data : remotePlaylist;

  const [currentId, setCurrentId] = useState(null);
  useEffect(() => {
    setCurrentId(playlist?.items?.[0]?.id || null);
  }, [playlist]);

  const current = useMemo(() => {
    if (!playlist) return null;
    return playlist.items.find(it => it.id === currentId) || playlist.items[0];
  }, [playlist, currentId]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = (playlist?.title) || "VDO ออกกำลังกาย";
    }
  }, [playlist?.title]);

  const back = useCallback((e) => {
    e?.preventDefault?.();
    if (navigate) navigate(-1);
    else history.back();
  }, [navigate]);

  const onSelect = (id) => (e) => {
    e?.preventDefault?.();
    setCurrentId(id);
    // ไม่ต้อง scrollIntoView เพราะ player ถูก sticky อยู่แล้ว
  };

  const VideoPlayer = () => {
    if (!current) return null;
    return h("div", { className: "card video-player-card" },
      h("div", { className: "section-title" }, current.title || "วิดีโอ"),
      h("div", {
        // wrapper กัน layout shift และล็อกขนาด
        style: {
          width: "100%",
          maxHeight: `${VIDEO_MAX_PX}px`,
          borderRadius: "12px",
          overflow: "hidden",
          background: "#000"
        }
      },
        h("video", {
          key: current.src,
          id: "exercise-video-player",
          src: current.src,
          poster: current.poster || undefined,
          controls: true,
          playsInline: true,
          // ล็อกความสูงสูงสุด + ให้คงอยู่เสมอ
          style: {
            width: "100%",
            height: `${VIDEO_MAX_PX}px`,
            maxHeight: `${VIDEO_MAX_PX}px`,
            display: "block",
            objectFit: "contain", // ภาพไม่บิดเบี้ยว, ไม่เกินกรอบ
            background: "#000",
            outline: "none"
          }
        })
      ),
      h("div", { style: { marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" } },
        current.duration ? h("span", { className: "pill", style: { padding: "6px 10px" } }, `⏱ ${current.duration}`) : null,
        current.level ? h("span", { className: "pill", style: { padding: "6px 10px" } }, `🏷 ${current.level}`) : null
        //h("span", { style: { opacity: .75, fontSize: "13px" } }, current.src)
      )
    );
  };

  const ListItem = ({ it }) =>
    h("a", {
      href: "#",
      className: "notify-item",
      role: "listitem",
      onClick: onSelect(it.id),
      "aria-current": current?.id === it.id ? "true" : "false",
      style: current?.id === it.id ? { outline: "3px solid #6c8cff" } : null
    },
      h("div", { className: "notify-emoji" }, it.emoji || "🎬"),
      h("div", { className: "notify-chip" },
        h("div", { style: { fontWeight: 800 } }, it.title || it.id),
        (it.duration || it.level) ? h("div", { style: { fontSize: "13px", opacity: .8, marginTop: "2px" } },
          [it.duration ? `⏱ ${it.duration}` : null, it.level ? ` • ${it.level}` : null].filter(Boolean).join("")
        ) : null
      ),
      h("button", {
        className: "btn btn-sm",
        type: "button",
        onClick: (e) => { e.preventDefault(); onSelect(it.id)(e); }
      }, current?.id === it.id ? "กำลังเล่น" : "เล่น")
    );

  return h("main", { className: "page exercise-videos-page", role: "main" },
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, (playlist?.title) || "VDO ออกกำลังกาย")
    ),

    playlist?.description ? h("div", { className: "bubble" }, playlist.description) : null,
    (!data && loadState.status === "loading")
      ? h("div", { className: "bubble" }, "กำลังโหลดรายการวิดีโอ…")
      : null,
    loadState.error
      ? h("div", { className: "bubble", style: { background: "#ffecec", color: "#c13515" } }, loadState.error)
      : null,

    h("div", { className: "video-layout" },
      h("div", { className: "video-player-pane" }, h(VideoPlayer)),
      h("div", { className: "video-list-pane" },
        playlist
          ? h("div", { className: "video-list-scroll", role: "list", "aria-label": "รายการวิดีโอออกกำลังกาย" },
              playlist.items.map((it) => h(ListItem, { key: it.id, it }))
            )
          : h("div", { className: "video-list-scroll", style: { padding: "12px" } }, "ยังไม่มีรายการวิดีโอ")
      )
    )
  );
}
