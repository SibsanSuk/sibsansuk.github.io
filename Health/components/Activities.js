// components/Activities.js
const h = window.React.createElement;
const { useRef, useEffect, useState } = window.React;

export function Activities({ items }) {
  // รายการเริ่มต้น (ใส่เพิ่มได้ตามต้องการ)
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
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(true);

  function updateShadows() {
    const el = ref.current; if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanL(scrollLeft > 2);
    setCanR(scrollLeft + clientWidth < scrollWidth - 2);
  }

  useEffect(() => {
    const el = ref.current; if (!el) return;
    updateShadows();

    // อัปเดตเงาขอบเมื่อเลื่อน/รีไซส์
    const onScroll = () => updateShadows();
    el.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', updateShadows);

    // รองรับเมาส์/ล้อเลื่อนแนวตั้ง -> เลื่อนแนวนอน
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

  // อัปเดตคลาสเงาขอบบน wrapper
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
            key:i, type:"button", className:"tile",
            role:"option",
            "aria-label": it.label,
            onClick: () => alert(it.label)
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
