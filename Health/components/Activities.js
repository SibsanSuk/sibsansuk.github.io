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
  const press = useRef({ active:false, startX:0, moved:false });
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);
  const supportsPointer = 'PointerEvent' in window;

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

  // --- Gesture helpers (ไม่ยิง action ที่นี่) ---
  const start = (x) => { press.current = { active:true, startX:x, moved:false }; };
  const move  = (x) => {
    if (!press.current.active) return;
    if (Math.abs(x - press.current.startX) > 8) press.current.moved = true;
  };
  const end   = () => { press.current.active = false; /* รอ onClick ตัดสิน */ };

  // Pointer (ถ้ามี)
  const onPointerDown = (e) => { if (e.pointerType) start(e.clientX); };
  const onPointerMove = (e)  => { if (e.pointerType) move(e.clientX); };
  const onPointerUp   = (e)  => { if (e.pointerType) end(); };

  // Touch fallback (ถ้าไม่มี Pointer Events)
  const onTouchStart = (e) => start(e.touches[0].clientX);
  const onTouchMove  = (e) => move(e.touches[0].clientX);
  const onTouchEnd   = ()  => end();

  // ยิง action แค่ครั้งเดียวที่นี่
  const onClick = (label) => (e) => {
    // ถ้าเพิ่งมีการปัด/เลื่อน ให้บล็อคคลิกครั้งนี้
    if (press.current.moved) {
      press.current.moved = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    alert(label); // ← แทนด้วยฟังก์ชันจริงของคุณได้เลย
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
            ...(supportsPointer ? {
              onPointerDown, onPointerMove, onPointerUp
            } : {
              onTouchStart, onTouchMove, onTouchEnd
            }),
            onClick: onClick(it.label)
          },
            h("span", { className:"emoji" }, it.icon),
            h("span", null, it.label)
          )
        )
      ),
      h("div", { className:"carousel-nav", "aria-hidden":"true" },
        h("button", { className:"nav-ctl prev", disabled:!canL, onClick:()=>scrollByAmount(-1) }, "‹"),
        h("button", { className:"nav-ctl next", disabled:!canR, onClick:()=>scrollByAmount(1) }, "›")
      )
    )
  );
}
