// pages/Exercise.js
const h = window.React.createElement;
const { useEffect, useCallback } = window.React;
const { useNavigate, Link } = window.ReactRouterDOM || {};

export function Exercise() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  useEffect(() => { if (typeof document !== "undefined") document.title = "ออกกำลังกาย"; }, []);

  const go = useCallback((path) => (e) => {
    e.preventDefault();
    if (!path) return;
    if (navigate) navigate(path);
    else location.hash = "#" + (path.startsWith("/") ? path : "/" + path);
  }, [navigate]);

  const back = (e) => { e.preventDefault(); if (navigate) navigate(-1); else history.back(); };

  const iconBase = "./images/icons";

  // ใช้ "icon" (รูปภาพ) แทน "emoji"
  const items = [
    {
      icon: `${iconBase}/ico_video.png`,
      title: "ออกกำลังกายด้วย VDO",
      path: "/exercise/videos",
      children: [
        { label: "ทั่วไป",          path: "/exercise/videos" },
        { label: "ฝึกกล้ามเนื้อ",   path: "/exercise/videos" },
        { label: "ฝึกความยืดหยุ่น", path: "/exercise/videos" },
      ]
    },
    {
      icon: `${iconBase}/ico_youngfit.png`,
      title: "ออกกำลังกายด้วย เรา Young Fit",
      path: "/exercise/youngfit",
      children: [
        { label: "ทั่วไป",          path: "/exercise/youngfit" },
        { label: "ฝึกกล้ามเนื้อ",   path: "/exercise/youngfit" },
        { label: "ฝึกความยืดหยุ่น", path: "/exercise/youngfit" },
      ]
    },
  ];

  // สไตล์ย่อย: เพิ่ม .notify-icon แทน .notify-emoji
  const LocalStyle = () => h("style", { dangerouslySetInnerHTML: { __html: `
    .sublist {
      display: flex; flex-direction: column; gap: 8px; margin-top: 10px;
    }
    .subitem {
      display: flex; align-items: center; gap: 4px;
      background: #eaf2ff; border-radius: 12px; padding: 10px 12px;
      box-shadow: var(--shadow); text-decoration: none; color: inherit;
    }
    .subitem .bullet { font-weight: 900; width: 22px; text-align: center; opacity: .9; }
    .subitem .label { font-weight: 800; }
    .subitem .arrow { margin-left: auto; font-weight: 900; }
    .subitem:active { transform: translateY(1px) scale(.98); transition: transform 120ms ease; }

    /* ไอคอนหัวข้อหลัก */
    .notify-icon {
      width: 92px; height: 92px; margin-right: 4px; flex: 0 0 auto;
      object-fit: contain;
    }

    /* เดิมมี .notify-emoji อยู่ใน layout — เผื่อยังมีหน้าอื่นใช้ */
    .notify-emoji { display:none; }
  `}});

  return h(React.Fragment, null,
    h(LocalStyle),

    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, "ออกกำลังกาย")
    ),

    h("div", { className: "notify-list", role: "list", "aria-label": "เลือกประเภทการออกกำลังกาย" },
      items.map((it, i) =>
        h("div", { key: i, className: "notify-item", role: "listitem" },
          // ใช้รูปแทน
          h("img", { src: it.icon, alt: "", className: "notify-icon", "aria-hidden": "true" }),
          h("div", { className: "notify-chip" },
            h("div", { style: { fontWeight: 800 } }, it.title),
            h("div", { className: "sublist", role: "group", "aria-label": `หมวดย่อยของ ${it.title}` },
              it.children.map((c, idx) =>
                h(Link || "a", {
                  key: idx, to: c.path, href: c.path, className: "subitem", onClick: go(c.path)
                },
                  h("span", { className: "bullet" }, idx + 1),
                  h("span", { className: "label" }, c.label),
                  h("span", { className: "arrow", "aria-hidden": "true" }, "›")
                )
              )
            )
          )
        )
      )
    )
  );
}
