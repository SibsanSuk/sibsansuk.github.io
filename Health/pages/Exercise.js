// pages/Exercise.js
const h = window.React.createElement;
const { useEffect, useCallback, useState } = window.React;
const { useNavigate, Link } = window.ReactRouterDOM || {};

const EXERCISE_MENU_URL = "./apidata/exercise-menu.json";

export function Exercise() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;
  const [feedback, setFeedback] = useState("");
  const [feedbackAlert, setFeedbackAlert] = useState(null);

  useEffect(() => { if (typeof document !== "undefined") document.title = "ออกกำลังกาย"; }, []);
  useEffect(() => {
    if (!feedbackAlert || feedbackAlert.type !== "success") return;
    const timer = setTimeout(() => setFeedbackAlert(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackAlert]);

  const go = useCallback((path) => (e) => {
    e.preventDefault();
    if (!path) return;
    if (navigate) navigate(path);
    else location.hash = "#" + (path.startsWith("/") ? path : "/" + path);
  }, [navigate]);

  const back = (e) => { e.preventDefault(); if (navigate) navigate(-1); else history.back(); };
  const handleFeedbackChange = useCallback((e) => {
    setFeedback(e.target.value);
    if (feedbackAlert && feedbackAlert.type === "error") setFeedbackAlert(null);
  }, [feedbackAlert]);
  const handleFeedbackSubmit = useCallback((e) => {
    e.preventDefault();
    const text = feedback.trim();
    if (!text) {
      setFeedbackAlert({ type: "error", text: "กรุณากรอกความคิดเห็นก่อนส่ง" });
      return;
    }
    setFeedback("");
    setFeedbackAlert({ type: "success", text: "ส่งความคิดเห็นเรียบร้อยแล้ว ขอบคุณมากค่ะ!" });
  }, [feedback]);

  const iconBase = "./images/icons";

  // ใช้ "icon" (รูปภาพ) แทน "emoji"
  const defaultItems = [
    {
      icon: `${iconBase}/ico_video.png`,
      title: "ออกกำลังกายด้วย VDO",
      path: "/exercise/videos",
      note: "ควรทำท่าละ 10 ครั้ง จำนวน 3 เซ็ต",
      children: [
        { label: "ฝึกกล้ามเนื้อ", path: "/exercise/videos" }
      ]
    }
  ];
  const [items, setItems] = useState(defaultItems);
  const [loadState, setLoadState] = useState({ status: "idle", error: null });

  useEffect(() => {
    if (typeof fetch !== "function") {
      setLoadState({ status: "error", error: "อุปกรณ์ไม่รองรับการโหลดข้อมูล" });
      return;
    }
    let cancelled = false;
    setLoadState({ status: "loading", error: null });
    fetch(EXERCISE_MENU_URL)
      .then((res) => {
        if (!res.ok) throw new Error("โหลดเมนูออกกำลังกายไม่สำเร็จ");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json?.categories) ? json.categories : [];
        if (list.length) {
          setItems(list);
          setLoadState({ status: "success", error: null });
        } else {
          setLoadState({ status: "error", error: "ยังไม่มีรายการเมนูในไฟล์ข้อมูล" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState({ status: "error", error: err?.message || "โหลดข้อมูลไม่ได้" });
      });
    return () => { cancelled = true; };
  }, []);

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

    .feedback-card {
      display: flex; flex-direction: column; gap: 8px; margin-top: 8px;
    }
    .feedback-label { font-weight: 700; color: #1c2756; }
    .feedback-hint { font-size: 0.85rem; color: #5f6c94; }
    .feedback-input {
      width: 100%; border-radius: 16px; border: 1px solid #cfd7f2;
      padding: 12px 14px; min-height: 96px; resize: vertical;
      font-family: inherit; font-size: 0.95rem; color: #1c2756;
      box-shadow: inset 0 1px 2px rgba(16, 24, 40, .06);
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .feedback-input:focus {
      outline: none;
      border-color: #4c6ef5;
      box-shadow: 0 0 0 3px rgba(76, 110, 245, .2);
    }
    .feedback-actions {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
    }
    .feedback-submit {
      border: none; border-radius: 999px; padding: 9px 22px;
      background: linear-gradient(135deg, #4c6ef5, #8394ff);
      color: #fff; font-weight: 700; cursor: pointer;
      box-shadow: 0 8px 18px rgba(76, 110, 245, .25);
      transition: transform .15s ease, opacity .15s ease;
    }
    .feedback-submit:disabled {
      opacity: .6; cursor: not-allowed; box-shadow: none;
    }
    .feedback-submit:not(:disabled):active {
      transform: translateY(1px);
    }
    .feedback-message {
      font-size: 0.9rem; font-weight: 600;
    }
    .feedback-message.success { color: #17813a; }
    .feedback-message.error { color: #c13515; }

    .exercise-tip {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #334677;
      background: #f6f8ff;
      border-radius: 10px;
      padding: 8px 10px;
      border: 1px dashed #cfd8ff;
    }
  `}});

  return h(React.Fragment, null,
    h(LocalStyle),

    h("main", { className: "page exercise-page", id: "page", role: "main" },
      h("div", { className: "topbar" },
        h("h1", null, "ออกกำลังกาย")
      ),

      h("div", { className: "notify-list", role: "list", "aria-label": "เลือกประเภทการออกกำลังกาย" },
        loadState.status === "loading"
          ? h("div", { className: "bubble" }, "กำลังโหลดเมนูออกกำลังกาย…")
          : null,
        loadState.status === "error" && loadState.error
          ? h("div", {
              className: "bubble",
              style: { background: "#ffecec", color: "#c13515" }
            }, loadState.error)
          : null,
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

                    h("span", { className: "label" }, c.label),
                    h("span", { className: "arrow", "aria-hidden": "true" }, "›")
                  )
                )
              ),
              it.note ? h("div", { className: "exercise-tip" }, it.note) : null
            )
          )
        ),
        h("div", { className: "notify-item", role: "form" },
          h("img", { src: `${iconBase}/ico_youngfit.png`, alt: "", className: "notify-icon", "aria-hidden": "true" }),
          h("div", { className: "notify-chip" },
            h("div", { style: { fontWeight: 800 } }, "ส่งความคิดเห็นเกี่ยวกับการออกกำลังกาย"),
            h("form", { className: "feedback-card", onSubmit: handleFeedbackSubmit },
              h("label", { htmlFor: "exercise-feedback", className: "feedback-label" }, "ความคิดเห็นของคุณ"),
              h("textarea", {
                id: "exercise-feedback",
                className: "feedback-input",
                placeholder: "แชร์ท่าออกกำลังกายที่อยากเห็น หรือปัญหาที่ต้องการความช่วยเหลือ...",
                value: feedback,
                onChange: handleFeedbackChange
              }),
              h("small", { className: "feedback-hint" }, "ทีมงานจะใช้ความคิดเห็นเพื่อเพิ่มคอนเทนต์ที่เหมาะกับคุณ"),
              h("div", { className: "feedback-actions" },
                h("button", {
                  type: "submit",
                  className: "feedback-submit",
                  disabled: !feedback.trim()
                }, "ส่งความคิดเห็น"),
                feedbackAlert && h("div", {
                  className: `feedback-message ${feedbackAlert.type}`,
                  role: feedbackAlert.type === "error" ? "alert" : "status"
                }, feedbackAlert.text)
              )
            )
          )
        )
      )
    )
  );
}
