// pages/Exercise.js
const h = window.React.createElement;
const { useEffect, useCallback } = window.React;
const { useNavigate, Link } = window.ReactRouterDOM || {};

export function Exercise() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  // ตั้งชื่อหน้า (ถ้าต้องการ)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "ออกกำลังกาย";
    }
  }, []);

  const go = useCallback((path) => (e) => {
    e.preventDefault();
    if (!path) return;
    if (navigate) {
      navigate(path);
    } else {
      // fallback: hash routing
      const p = path.startsWith("/") ? path : ("/" + path);
      location.hash = "#" + p;
    }
  }, [navigate]);

  const back = (e) => {
    e.preventDefault();
    if (navigate) navigate(-1);
    else history.back();
  };

  // ช้อยส์สองแบบ: VDO และ เรา Young Fit
  const items = [
    { emoji: "🎬", title: "ออกกำลังกายด้วย VDO", path: "/exercise/videos" },
    { emoji: "💪", title: "ออกกำลังกายด้วย เรา Young Fit", path: "/exercise/youngfit" },
  ];

  return h(React.Fragment, null,
    // TopBar + Back มาตรฐาน
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, "ออกกำลังกาย")
    ),

    // รายการแบบเดียวกับ "การนัด"
    h("div", { className: "notify-list", role: "list", "aria-label": "เลือกประเภทการออกกำลังกาย" },
      items.map((it, i) =>
        h(Link || "a", {
          key: i,
          className: "notify-item",
          role: "listitem",
          to: it.path,
          href: it.path,
          onClick: go(it.path)
        },
          h("div", { className: "notify-emoji" }, it.emoji),
          h("div", { className: "notify-chip" }, it.title),
          h("button", {
            className: "btn btn-sm",
            type: "button",
            onClick: (e) => { e.preventDefault(); (navigate ? navigate(it.path) : (location.hash = "#" + it.path)); }
          }, "เปิด")
        )
      )
    )
  );
}
