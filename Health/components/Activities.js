// components/Activities.js
const h = window.React.createElement;
const { useRef, useEffect, useState } = window.React;

export function Activities({ items }) {
  const data = items || [
    { icon:"🧘‍♂️", label:"กิจกรรม" },
    { icon:"❤️",   label:"บันทึกสุขภาพ" },
    { icon:"😊",   label:"อันทัศนคติ" },
    { icon:"📋",   label:"ประเมิน" },
    { icon:"🥗",   label:"โภชนาการ" },
    { icon:"💤",   label:"การนอน" },
    { icon:"🚶‍♂️", label:"ก้าวเดิน" },
    { icon:"🩺",   label:"ความดัน" },
    { icon:"💧",   label:"ดื่มน้ำ" },
    { icon:"☀️",   label:"อากาศ/UV" }
  ];

  const ref = useRef(null);
  const press = useRef({ x:0, moved:false });
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

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
    el.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', updateShadows);

    // เดสก์ท็อป: หมุนล้อแนวตั้งให้เลื่อนแนวนอน
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive:false });

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', updateShadows);
    };
  }, []);

  const scrollByAmount = (dir) => {
    const el = ref.current; if (!el) return;
    const amount = Math.max(140, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  // จับ tap vs swipe (ทั้ง pointer และ touch)
  const onStart = (e) => {
    const x = (e.touches && e.touches[0]?.clientX) ?? e.clientX ?? 0;
    press.current = { x, moved:false };
  };
  const onMove = (e) => {
    const x = (e.touches && e.touches[0]?.clientX) ?? e.clientX ?? 0;
    if (Math.abs(x - press.current.x) > 8) press.current.moved = true;
  };
  const onEnd = (label) => (e) => {
    if (!press.current.moved) alert(label); // tap จริง → ยิงคลิก
  };

  const wrapProps = { className: "carousel-wrap" + (canL ? " shadow-left" : "") + (canR ? " shadow-right" : "") };

  return h("div", { className:"card", role:"region", "aria-label":"กิจกรรมในวันนี้" },
    h("div", { className:"section-title" }, "กิจกรรมในวันนี้"),
    h("div", wrapProps,
      h("div", {
        ref,
        className:"carousel",
        role:"listbox",
        "aria-label":"รายการกิจกรรม (ปัดซ้าย-ขวาเพื่อดูเพิ่มเติม)"
      },
        data.map((it, i) =>
          h("button", {
            key:i, type:"button", className:"tile", role:"option",
            // รองรับ pointer events (เดสก์ท็อปใหม่ ๆ)
            onPointerDown: onStart,
            onPointerMove: onMove,
            onPointerUp: onEnd(it.label),
            // fallback ทัช (iOS/Safari)
            onTouchStart: onStart,
            onTouchMove: onMove,
            onTouchEnd: onEnd(it.label),
            // เมาส์/คีย์บอร์ดเดสก์ท็อป → คลิกได้ตามปกติ
            onClick: (e) => { if (isTouch) return; alert(it.label); }
          },
            h("span", { className:"emoji" }, it.icon),
            h("span", null, it.label)
          )
        )
      ),
      // ปุ่มเลื่อนซ้าย/ขวา แสดงเฉพาะ non-touch (มือถือจะถูกซ่อนไว้ด้วย CSS .touch .nav-ctl)
      h("div", { className:"carousel-nav", "aria-hidden":"true" },
        h("button", { className:"nav-ctl prev", disabled:!canL, onClick:()=>scrollByAmount(-1) }, "‹"),
        h("button", { className:"nav-ctl next", disabled:!canR, onClick:()=>scrollByAmount(1) }, "›")
      )
    )
  );
}
