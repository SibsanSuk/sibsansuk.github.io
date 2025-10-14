// components/HomePins.js
const h = window.React.createElement;
const { useRef, useEffect, useCallback, useMemo, useState } = window.React;

/**
 * แถว Post-it ที่เลื่อนซ้าย-ขวา + เงา fade ซ้าย/ขวา และ **มี dialog feedback ในตัว**
 *
 * Props:
 * - pins: Array<{ id, title, time, to? }>
 * - onPinsChange?(nextPins): callback เมื่อมีการลบ/เปลี่ยนลิสต์ (ถ้าให้มาจะทำงานแบบ controlled)
 * - onSubmitFeedback?(payload): callback ตอนกดบันทึกฟีดแบ็ก (ส่ง payload ให้)
 * - ariaLabel?: string
 * - className?: string
 *
 * หมายเหตุ:
 * - ถ้า **ไม่** ส่ง onPinsChange มา คอมโพเนนต์จะดูแล state pins ภายในเอง (uncontrolled)
 * - ถ้าส่ง onPinsChange มา ให้ถือเป็น controlled: ค่าแสดงผลจะตาม props.pins เท่านั้น
 */
export function HomePins({
  pins = [],
  onPinsChange,
  onSubmitFeedback,
  ariaLabel = "การนัดที่ปักหมุด",
  className = ""
}) {
  // ===== Controlled / Uncontrolled =====
  const controlled = typeof onPinsChange === "function";
  const [innerPins, setInnerPins] = useState(pins);

  // sync เมื่อ props.pins เปลี่ยน (รองรับกรณีที่ parent อัปเดต)
  useEffect(() => {
    if (!controlled) setInnerPins(pins);
  }, [pins, controlled]);

  const list = controlled ? pins : innerPins;

  const setPins = useCallback((next) => {
    if (controlled) onPinsChange(next);
    else setInnerPins(next);
  }, [controlled, onPinsChange]);

  // ===== Fade edges controller (ซ้าย/ขวา) =====
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);

  const updateShadow = useCallback(() => {
    const wrap = wrapRef.current;
    const sc = scrollRef.current;
    if (!wrap || !sc) return;

    const EPS = 2;
    const left  = sc.scrollLeft > EPS;
    const right = (sc.scrollWidth - sc.clientWidth - sc.scrollLeft) > EPS;

    wrap.classList.toggle("shadow-left", left);
    wrap.classList.toggle("shadow-right", right);
  }, []);

  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;

    // เริ่มต้นให้ชิดซ้าย
    if (sc.scrollLeft !== 0) sc.scrollTo({ left: 0, top: 0, behavior: "auto" });

    sc.addEventListener("scroll", updateShadow, { passive: true });

    // เดสก์ทอป: หมุนล้อแนวตั้งให้เลื่อนแนวนอน
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        sc.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    sc.addEventListener("wheel", onWheel, { passive: false });

    window.addEventListener("resize", updateShadow);
    updateShadow();

    return () => {
      sc.removeEventListener("scroll", updateShadow);
      sc.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", updateShadow);
    };
  }, [updateShadow, list.length]);

  // ===== Dialog + Feedback ภายในคอมโพเนนต์ =====
  const [activePin, setActivePin] = useState(null);
  const [done, setDone] = useState(false);
  const [rate, setRate] = useState(0);
  const [note, setNote] = useState("");

  // ล็อกพื้นหลังไม่ให้เลื่อนขณะเปิด dialog
  useEffect(() => {
    const html = document.documentElement;
    if (activePin) html.classList.add("html-lock"); else html.classList.remove("html-lock");
    return () => html.classList.remove("html-lock");
  }, [activePin]);

  const openPinDialog = useCallback((pin) => {
    setActivePin(pin);
    setDone(false);
    setRate(0);
    setNote("");
  }, []);

  const closePinDialog = useCallback(() => {
    setActivePin(null);
  }, []);

  const submitPinDialog = useCallback(() => {
    const payload = {
      id: activePin?.id,
      title: activePin?.title,
      time: activePin?.time,
      done,
      rate,
      note
    };
    try {
      onSubmitFeedback?.(payload);
    } catch (e) {
      // ป้องกันไม่ให้ throw หลุด
      console.warn("onSubmitFeedback error:", e);
    }

    // ถ้าทำกิจกรรมแล้ว → ลบออกจากลิสต์
    if (done && activePin) {
      const next = (list || []).filter(p => p.id !== activePin.id);
      setPins(next);
    }

    setActivePin(null);
  }, [activePin, done, rate, note, list, setPins, onSubmitFeedback]);

  const onClick = (pin) => (e) => {
    e.preventDefault();
    openPinDialog(pin);
  };

  if (!list || list.length === 0) return null;

  // emoji กรณีอยากใช้ต่อใน dialog (ตอนนี้ยังไม่ใช้)
  // const faces = ["😞","🙁","😐","🙂","😄"];

  return h(
    React.Fragment,
    null,
    // แถว Post-it เลื่อนซ้าย-ขวา
    h("section", {
      ref: wrapRef,
      className: `pin-hwrap ${className}`.trim(),
      "aria-label": ariaLabel
    },
      h("div", { ref: scrollRef, className: "pin-hscroll", role: "list" },
        list.map((ap, idx) =>
          h("button", {
              key: ap.id,
              type: "button",
              onClick: onClick(ap),
              className: `pin-card pin-color-${(idx % 3) + 1}`,
              role: "listitem",
              "aria-label": `${ap.title} เวลา ${ap.time}`
            },
            h("div", { className: "pin-ico", "aria-hidden":"true" }, "📌"),
            h("div", { className: "pin-title" }, ap.title),
            h("div", { className: "pin-time"  }, ap.time)
          )
        )
      )
    ),

    // Dialog ภายใน (ใช้สไตล์จาก home.css ที่คุณมีอยู่แล้ว)
    activePin && h("div", { className: "pin-dialog", role:"dialog", "aria-modal":"true", "aria-labelledby":"pinDlgTitle" },
      h("div", { className: "pin-dialog-box" },
        h("div", { className: "pin-dialog-head" },
          h("div", { id: "pinDlgTitle", className: "pin-dialog-title" }, "บันทึกผลกิจกรรม"),
          h("div", { className: "pin-dialog-sub" }, `${activePin.title} • ${activePin.time}`)
        ),

        h("label", { className: "pin-row pin-check" },
          h("input", {
            type: "checkbox",
            checked: done,
            onChange: (e) => setDone(e.target.checked)
          }),
          h("span", null, "ทำเรียบร้อยแล้ว")
        ),

        h("div", { className: "pin-row" },
          h("div", { className: "pin-label" }, "ให้คะแนนความรู้สึก"),
          h("div", { className: "pin-rate" },
            [1,2,3,4,5].map((n) =>
              h("button", {
                key: n,
                type: "button",
                className: `pin-face ${rate === n ? "active" : ""}`,
                onClick: () => setRate(n),
                "aria-label": `ให้คะแนน ${n}`
              }, ["😞","🙁","😐","🙂","😄"][n-1])
            )
          )
        ),

        h("div", { className: "pin-row" },
          h("label", { className: "pin-label", htmlFor: "pinNote" }, "ความเห็น/ความรู้สึกเพิ่มเติม"),
          h("textarea", {
            id: "pinNote",
            className: "pin-note",
            rows: 3,
            placeholder: "พิมพ์ประเมินความรู้สึกของกิจกรรม…",
            value: note,
            onChange: (e) => setNote(e.target.value)
          })
        ),

        h("div", { className: "pin-dialog-actions" },
          h("button", { className: "btn pin-cancel", type:"button", onClick: closePinDialog }, "ยกเลิก"),
          h("button", {
              className: "btn pin-save",
              type:"button",
              onClick: submitPinDialog,
              disabled: rate === 0 && !done && note.trim() === ""
            }, "บันทึก")
        )
      )
    )
  );
}
