// components/Activities.js
const h = window.React.createElement;
const { useRef, useEffect, useState } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

/**
 * Activities — แถบกิจกรรมแนวนอนแบบ carousel
 *
 * Props:
 *  - items?: Array<{ icon: string, label: string, path?: string }>
 *    ถ้าไม่ส่งมา จะใช้ defaultData ด้านล่าง
 *
 * หมายเหตุ:
 *  - สไตล์ใช้ไฟล์ activity.css (สcope ภายใต้ .activities)
 *  - ใช้ useNavigate ถ้ามี React Router; ถ้าไม่มีก็ fallback เป็น hash routing
 */
export function Activities({ items }) {
  // --- default data (สามารถถูกแทนด้วย props.items จาก API) ---
  const defaultData = [
    { icon: "🧘‍♂️", label: "ออกกำลังกาย", path: "/exercise" },
    { icon: "😊",   label: "อารมณ์",   path: "/mood" },
    { icon: "📋",   label: "ประเมินตนเอง",      path: "/assessment" },
    
  ];
  const data = Array.isArray(items) && items.length ? items : defaultData;

  const ref = useRef(null);
  const press = useRef({ active: false, startX: 0, moved: false });
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);
  const supportsPointer = "PointerEvent" in window;

  // --- Navigation helper ---
  const nav = (typeof useNavigate === "function") ? useNavigate() : null;
  const go = (path) => {
    if (!path) return;
    if (nav) nav(path);
    else {
      const p = path.startsWith("/") ? path : ("/" + path);
      location.hash = "#" + p;
    }
  };

  // ใส่/เอา .touch ที่ <html> เพื่อคุมการแสดงปุ่มเลื่อนบนเดสก์ท็อปใน CSS
  useEffect(() => {
    const root = document.documentElement;
    const isTouch = "ontouchstart" in window || (navigator && navigator.maxTouchPoints > 0);
    root.classList.toggle("touch", !!isTouch);
  }, []);

  function updateShadows() {
    const el = ref.current; if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanL(scrollLeft > 2);
    setCanR(scrollLeft + clientWidth < scrollWidth - 2);
  }

  useEffect(() => {
    const el = ref.current; if (!el) return;
    updateShadows();

    const onScroll = () => updateShadows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateShadows);

    // เดสก์ท็อป: หมุนล้อแนวตั้งให้เลื่อนแนวนอน
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    const raf = requestAnimationFrame(updateShadows);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", updateShadows);
    };
  }, []);

  const scrollByAmount = (dir) => {
    const el = ref.current; if (!el) return;
    const amount = Math.max(140, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // --- Gesture guard (กันคลิกตอนลาก) ---
  const start = (x) => { press.current = { active: true, startX: x, moved: false }; };
  const move  = (x) => {
    if (!press.current.active) return;
    if (Math.abs(x - press.current.startX) > 8) press.current.moved = true;
  };
  const end   = () => { press.current.active = false; };

  // Pointer (ถ้ามี)
  const onPointerDown = (e) => { if (e.pointerType) start(e.clientX); };
  const onPointerMove =  (e) => { if (e.pointerType) move(e.clientX);  };
  const onPointerUp   =  (e) => { if (e.pointerType) end();             };

  // Touch fallback (ถ้าไม่มี Pointer Events)
  const onTouchStart = (e) => start(e.touches[0].clientX);
  const onTouchMove  = (e) => move(e.touches[0].clientX);
  const onTouchEnd   = ()  => end();

  // ยิง action โดยอ่าน path จาก item (และกันคลิกถ้าเพิ่งลาก)
  const onItemClick = (item) => (e) => {
    if (press.current.moved) {
      press.current.moved = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (item?.path) go(item.path);
  };

  const wrapProps = {
    className: "carousel-wrap" + (canL ? " shadow-left" : "") + (canR ? " shadow-right" : "")
  };

  return h(
    "div",
    { className: "card activities", role: "region", "aria-label": "กิจกรรมในวันนี้" },
    h("div", { className: "section-title" }, "กิจกรรมในวันนี้"),
    h("div", wrapProps,
      h(
        "div",
        {
          ref,
          className: "carousel",
          role: "listbox",
          "aria-label": "รายการกิจกรรม (ปัดซ้าย-ขวาเพื่อดูเพิ่มเติม)"
        },
        data.map((it, i) =>
          h(
            "button",
            {
              key: i,
              type: "button",
              className: "tile",
              role: "option",
              ...(supportsPointer
                ? { onPointerDown, onPointerMove, onPointerUp }
                : { onTouchStart, onTouchMove, onTouchEnd }),
              onClick: onItemClick(it)
            },
            h("span", { className: "emoji" }, it.icon),
            h("span", null, it.label)
          )
        )
      ),
      h(
        "div",
        { className: "carousel-nav", "aria-hidden": "true" },
        h(
          "button",
          { className: "nav-ctl prev", disabled: !canL, onClick: () => scrollByAmount(-1), type: "button" },
          "‹"
        ),
        h(
          "button",
          { className: "nav-ctl next", disabled: !canR, onClick: () => scrollByAmount(1), type: "button" },
          "›"
        )
      )
    )
  );
}
