// pages/exercise/Videos.js
const h = window.React.createElement;
const { useEffect, useState, useMemo, useCallback } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

// ปรับค่าความสูงสูงสุดของวิดีโอจากตรงนี้ได้
const VIDEO_MAX_PX = 240; // เช่น 240px บนมือถือ (จะไม่สูงเกินนี้)

export function ExerciseVideos({ data }) {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  const sampleData = {
    title: "เรียนออกกำลังกายด้วย VDO",
    description: "เลือกคลิปเพื่อเล่นด้านบน (ปรับชื่อไฟล์/รายละเอียดใน JSON ได้ภายหลัง)",
    items: [
      { id: "STCU1", title: "Squat (STCU1)", src: "/videos/STCU1.mp4", emoji: "🦵", duration: "00:45", level: "Beginner" },
      { id: "STCU2", title: "ท่าออกกำลังกาย STCU2", src: "https://sibsansuk.github.io/Health/videos/STCU1.mp4", emoji: "🎬", duration: "00:45" },
      { id: "STCU3", title: "ท่าออกกำลังกาย STCU3", src: "/videos/STCU3.mp4", emoji: "🎬" },
      { id: "STCU4", title: "ท่าออกกำลังกาย STCU4", src: "/videos/STCU4.mp4", emoji: "🎬" },
      { id: "STCU5", title: "ท่าออกกำลังกาย STCU5", src: "/videos/STCU5.mp4", emoji: "🎬" },
      { id: "STCU6", title: "ท่าออกกำลังกาย STCU6", src: "/videos/STCU6.mp4", emoji: "🎬" },
    ]
  };

  const playlist = (data && Array.isArray(data.items) && data.items.length) ? data : sampleData;

  const [currentId, setCurrentId] = useState(playlist.items[0]?.id);
  const current = useMemo(
    () => playlist.items.find(it => it.id === currentId) || playlist.items[0],
    [playlist, currentId]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = playlist.title || "VDO ออกกำลังกาย";
    }
  }, [playlist.title]);

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
    return h("div", {
      className: "card",
      // sticky ด้านบนของ .page
      style: {
        position: "sticky",
        top: "6px",          // ถ้ามี topbar แบบ fixed ค่อยชดเชยเพิ่มได้
        zIndex: 2
      }
    },
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
        current.level ? h("span", { className: "pill", style: { padding: "6px 10px" } }, `🏷 ${current.level}`) : null,
        h("span", { style: { opacity: .75, fontSize: "13px" } }, current.src)
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

  return h("main", { className: "page", role: "main" },
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, playlist.title || "VDO ออกกำลังกาย")
    ),

    playlist.description ? h("div", { className: "bubble" }, playlist.description) : null,

    // Player ติดบนสุด
    h(VideoPlayer),

    // เพลย์ลิสต์ที่เลื่อนได้
    h("div", { className: "notify-list", role: "list", "aria-label": "รายการวิดีโอออกกำลังกาย" },
      playlist.items.map((it) => h(ListItem, { key: it.id, it }))
    ),

    h("div", { style: { height: "12px" } })
  );
}
