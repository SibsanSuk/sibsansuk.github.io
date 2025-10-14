// components/HomeChat.js
const h = window.React.createElement;
const { useEffect, useState } = window.React;

/**
 * HomeChat — แสดงแชตผู้เชี่ยวชาญแบบทีละข้อความพร้อมแอนิเมชัน
 *
 * Props:
 * - messages: Array<{ id: string, author: "doctor"|"me", text: string }>
 * - meAvatarText?: string                // ตัวอักษรย่อฝั่งผู้ใช้ (เช่น "AB")
 * - doctorAvatarSrc?: string             // รูปหมอ เช่น "./images/doctor.png"
 * - animate?: boolean                    // เปิด/ปิดแอนิเมชัน (default: true)
 * - startDelay?: number                  // หน่วงก่อนเริ่มครั้งแรก (ms) (default: 200)
 * - stepMs?: number                      // เวลาห่างแต่ละข้อความ (ms) (default: 650)
 * - ariaLabel?: string                   // label บล็อกแชต (default: "คำแนะนำจากผู้เชี่ยวชาญ")
 */
export function HomeChat({
  messages = [],
  meAvatarText = "U",
  doctorAvatarSrc = "./images/doctor.png",
  animate = true,
  startDelay = 200,
  stepMs = 650,
  ariaLabel = "คำแนะนำจากผู้เชี่ยวชาญ",
}) {
  const [visible, setVisible] = useState(() =>
    animate ? [] : messages
  );

  useEffect(() => {
    if (!animate) { setVisible(messages); return; }

    let cancelled = false;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    (async () => {
      setVisible([]);
      await sleep(startDelay);
      for (const m of messages) {
        if (cancelled) break;
        setVisible(prev => [...prev, m]);
        await sleep(stepMs);
      }
    })();

    return () => { cancelled = true; };
  }, [messages, animate, startDelay, stepMs]);

  // สไตล์แอนิเมชันเข้า (คงไว้ local เพื่อใช้ได้ทุกหน้า)
  const ChatAnimStyle = () => h("style", { dangerouslySetInnerHTML: { __html: `
    .msg-anim {
      opacity: 0;
      transform: translateY(6px) scale(.98);
      animation: homeChatIn .28s ease forwards;
    }
    @keyframes homeChatIn {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .msg-anim { animation: none; opacity: 1; transform: none; }
    }
  `}});

  return h(React.Fragment, null,
    animate ? h(ChatAnimStyle) : null,
    h("section", {
      className: "chat",
      "aria-label": ariaLabel,
      "aria-live": "polite"
    },
      visible.map(msg => {
        const isDoctor = msg.author === "doctor";
        return h("div", {
          key: msg.id,
          className: `msg ${isDoctor ? "msg--doctor" : "msg--me"} ${animate ? "msg-anim" : ""}`.trim()
        },
          isDoctor
            ? h("div", { className: "msg-avatar" },
                h("img", { src: doctorAvatarSrc, alt: "หมอ", width: 40, height: 40 })
              )
            : h("div", { className: "msg-avatar" }, meAvatarText),
          h("div", { className: "msg-bubble" }, msg.text)
        );
      })
    )
  );
}
