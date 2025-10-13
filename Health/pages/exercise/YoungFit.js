// pages/exercise/YoungFit.js
const h = window.React.createElement;
const { useEffect, useState, useCallback } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

export function YoungFit() {
  const navigate = (typeof useNavigate === "function") ? useNavigate() : null;

  useEffect(() => { if (typeof document !== "undefined") document.title = "เรา Young Fit – ค้นหาอุปกรณ์"; }, []);

  const back = useCallback((e) => {
    e?.preventDefault?.();
    if (navigate) navigate(-1); else history.back();
  }, [navigate]);

  // จำลองการ “ค้นหาอยู่” (อนาคตค่อยต่อ BLE/WebBluetooth จริง)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => (n + 1) % 3), 800);
    return () => clearInterval(t);
  }, []);

  const retry = (e) => {
    e?.preventDefault?.();
    // ในอนาคต: รีสแกนอุปกรณ์จริง
    setTick(0);
  };

  return h("main", { className: "page", role: "main" },
    // -- local CSS สำหรับแอนิเมชัน (แยกไฟล์ภายหลังได้)
    h("style", { dangerouslySetInnerHTML: { __html: `
      .yf-center { display:flex; flex-direction:column; align-items:center; gap:14px; padding:16px 8px; }
      .yf-radar {
        position: relative; width: 220px; height: 220px; border-radius: 50%;
        background: radial-gradient( circle at center, rgba(124,169,255,.25) 0%, rgba(124,169,255,.12) 40%, rgba(124,169,255,.06) 60%, transparent 70%);
        box-shadow: inset 0 0 0 2px rgba(124,169,255,.35), var(--shadow);
        overflow: hidden;
      }
      .yf-dot {
        position:absolute; inset: 0; margin:auto; width: 16px; height: 16px; border-radius: 50%;
        background:#6c8cff; box-shadow: 0 0 0 6px rgba(108,140,255,.25);
      }
      .yf-ring {
        position:absolute; inset: 0; margin:auto; width: 40px; height: 40px; border-radius: 50%;
        border: 3px solid rgba(124,169,255,.55); opacity: 0; animation: yf-ping 2.4s linear infinite;
      }
      .yf-ring.r2 { animation-delay: .6s; }
      .yf-ring.r3 { animation-delay: 1.2s; }
      @keyframes yf-ping {
        0%   { transform: scale(.4); opacity: .8; }
        70%  { opacity: .15; }
        100% { transform: scale(3.2); opacity: 0; }
      }
      .yf-sweep {
        position:absolute; width: 50%; height: 2px; left: 50%; top: 50%;
        background: linear-gradient(90deg, rgba(108,140,255,0) 0%, rgba(108,140,255,.85) 60%, rgba(108,140,255,0) 100%);
        transform-origin: left center; animation: yf-sweep 3.8s linear infinite;
        filter: drop-shadow(0 0 6px rgba(108,140,255,.6));
      }
      @keyframes yf-sweep { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
      .yf-label { font-weight:900; color:#2b4b88; text-align:center; }
      .yf-sub { opacity:.8; text-align:center; font-size:14px; }
      .yf-dots { font-weight:900; letter-spacing:2px; min-width: 20px; display:inline-block; }
      .yf-row { display:flex; gap:10px; align-items:center; justify-content:center; flex-wrap:wrap; }
      .yf-card { background: var(--card); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); margin: 12px 6px; }
    `}}),

    // TopBar
    h("div", { className: "topbar" },
      h("a", { href: "#", className: "back", onClick: back, "aria-label": "ย้อนกลับ" }, "‹"),
      h("h1", null, "ออกกำลังกายด้วย เรา Young Fit")
    ),

    // Hero / สถานะค้นหา
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "กำลังค้นหาอุปกรณ์"),
      h("div", { className: "yf-center", "aria-live": "polite" },
        // Radar animation
        h("div", { className: "yf-radar", role: "img", "aria-label": "เรดาร์กำลังค้นหาอุปกรณ์" },
          h("div", { className: "yf-ring r1" }),
          h("div", { className: "yf-ring r2" }),
          h("div", { className: "yf-ring r3" }),
          h("div", { className: "yf-sweep" }),
          h("div", { className: "yf-dot", title: "ตัวคุณ" })
        ),
        h("div", { className: "yf-label" }, "กำลังค้นหาอุปกรณ์ เรา Young Fit"),
        h("div", { className: "yf-sub" },
          "โปรดอยู่ใกล้อุปกรณ์และเปิดบลูทูธ ",
          h("span", { className: "yf-dots" }, ".".repeat(tick + 1))
        ),
        h("div", { className: "yf-row" },
          h("button", { className: "btn", type: "button", onClick: retry }, "สแกนอีกครั้ง"),
          h("button", { className: "btn", type: "button", onClick: back }, "ยกเลิก")
        )
      )
    ),

    // คู่มือสั้น ๆ
    h("div", { className: "yf-card" },
      h("div", { className: "section-title" }, "วิธีเตรียมอุปกรณ์"),
      h("ul", { style: { margin: "8px 0 0 18px" } },
        h("li", null, "ชาร์จอุปกรณ์ให้เพียงพอ"),
        h("li", null, "เปิดบลูทูธบนมือถือของคุณ"),
        h("li", null, "อยู่ห่างอุปกรณ์ไม่เกิน ~2 เมตร"),
        h("li", null, "หากไม่พบ ให้กด “สแกนอีกครั้ง”")
      )
    ),

    h("div", { style: { height: "14px" } })
  );
}
