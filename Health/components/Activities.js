// components/Activities.js
const h = window.React.createElement;
const { useRef, useEffect, useState } = window.React;
const { useNavigate } = (window.ReactRouterDOM || {});

export function Activities({ items }) {
  const iconBase = "./images/icons";

  // ตอนนี้ใช้ไฟล์ภาพแทน emoji
  const defaultData = [
    { icon: `${iconBase}/ico_exercise.png`,  label: "ออกกำลังกาย", path: "/exercise" },
    { icon: `${iconBase}/ico_mood.png`,      label: "อารมณ์",       path: "/mood" },
    { icon: `${iconBase}/ico_assessment.png`,label: "ประเมินตนเอง", path: "/assessment" },
  ];
  const data = Array.isArray(items) && items.length ? items : defaultData;

  const ref = useRef(null);
  const press = useRef({ active: false, startX: 0, moved: false });
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);
  const supportsPointer = "PointerEvent" in window;

  const nav = (typeof useNavigate === "function") ? useNavigate() : null;
  const go = (path) => {
    if (!path) return;
    if (nav) nav(path);
    else location.hash = "#" + (path.startsWith("/") ? path : "/" + path);
  };

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

  const start = (x) => { press.current = { active: true, startX: x, moved: false }; };
  const move  = (x) => { if (press.current.active && Math.abs(x - press.current.startX) > 8) press.current.moved = true; };
  const end   = () => { press.current.active = false; };

  const onPointerDown = (e) => { if (e.pointerType) start(e.clientX); };
  const onPointerMove =  (e) => { if (e.pointerType) move(e.clientX);  };
  const onPointerUp   =  (e) => { if (e.pointerType) end();             };
  const onTouchStart  = (e) => start(e.touches[0].clientX);
  const onTouchMove   = (e) => move(e.touches[0].clientX);
  const onTouchEnd    = ()  => end();

  const onItemClick = (item) => (e) => {
    if (press.current.moved) { press.current.moved = false; e.preventDefault(); e.stopPropagation(); return; }
    if (item?.path) go(item.path);
  };

  const wrapProps = {
    className: "carousel-wrap" + (canL ? " shadow-left" : "") + (canR ? " shadow-right" : "")
  };

  // ช่วยให้ยังรองรับ props.items ที่ส่งมาเป็น emoji ได้ด้วย
  const isImage = (s) => typeof s === "string" && (/\.(png|jpe?g|gif|webp|svg)$/i.test(s) || s.startsWith("data:"));

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
            isImage(it.icon)
              ? h("img", { src: it.icon, alt: "", className: "icon", "aria-hidden": "true" })
              : h("span", { className: "emoji" }, it.icon),
            h("span", null, it.label)
          )
        )
      ),
      h(
        "div",
        { className: "carousel-nav", "aria-hidden": "true" },
        h("button", { className: "nav-ctl prev", disabled: !canL, onClick: () => scrollByAmount(-1), type: "button" }, "‹"),
        h("button", { className: "nav-ctl next", disabled: !canR, onClick: () => scrollByAmount(1),  type: "button" }, "›")
      )
    )
  );
}
