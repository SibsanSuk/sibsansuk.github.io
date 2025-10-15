// /components/HomePins.js
const h = window.React.createElement;
const { useRef, useEffect, useCallback, useState } = window.React;

const STORAGE_KEY = "appointments_v1";

function parseYMD(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y, m-1, d); }
function pad2(n){ return String(n).padStart(2,"0"); }

/** อ่าน/เขียน localStorage แบบปลอดภัย */
function readAppointments(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    console.warn("อ่าน appointments_v1 ไม่ได้:", e);
    return [];
  }
}
function writeAppointments(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  }catch(e){
    console.warn("บันทึก appointments_v1 ไม่ได้:", e);
  }
}

/** ===== HomePins: Post-it ของนัดหมายที่ใกล้ถึง (วันนี้→14วัน) ===== */
export function HomePins({
  onSubmitFeedback,
  ariaLabel = "การนัดที่ปักหมุด",
  className = ""
}) {
  const [pins, setPins] = useState([]);

  /** โหลดข้อมูลจาก localStorage เฉพาะนัดหมายในอีก 14 วัน */
  useEffect(() => {
    const list = readAppointments();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoWeeks = new Date(today); twoWeeks.setDate(today.getDate() + 14);

    const upcoming = list
      .filter(it => {
        if (!it?.date) return false;
        const d = parseYMD(it.date);
        return d >= today && d <= twoWeeks;
      })
      .sort((a,b)=> (a.date+(a.timeStart||"")).localeCompare(b.date+(b.timeStart||"")));

    const mapped = upcoming.map(it => ({
      id: it.id,
      title: it.title || "นัดหมาย",
      time: `${it.date} ${it.timeStart || ""}`,
    }));
    setPins(mapped);
  }, []);

  // ===== Scroll shadow effect =====
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
    sc.addEventListener("scroll", updateShadow, { passive: true });
    updateShadow();
    return () => sc.removeEventListener("scroll", updateShadow);
  }, [updateShadow, pins.length]);

  // ===== Dialog feedback =====
  const [activePin, setActivePin] = useState(null);
  const [done, setDone] = useState(false);
  const [rate, setRate] = useState(0);
  const [note, setNote] = useState("");
  useEffect(() => {
    document.documentElement.classList.toggle("html-lock", !!activePin);
    return () => document.documentElement.classList.remove("html-lock");
  }, [activePin]);

  const openPinDialog = (pin) => { setActivePin(pin); setDone(false); setRate(0); setNote(""); };
  const closePinDialog = () => setActivePin(null);

  const submitPinDialog = () => {
    const payload = { id: activePin?.id, title: activePin?.title, time: activePin?.time, done, rate, note };
    try { onSubmitFeedback?.(payload); } catch(e){ console.warn(e); }

    // ถ้าผู้ใช้ติ๊กว่า "ทำเรียบร้อยแล้ว" → ลบทั้งใน UI และใน localStorage
    if (done && activePin?.id) {
      // 1) ลบจาก state ปัจจุบัน
      setPins(p => p.filter(x => x.id !== activePin.id));

      // 2) ลบจาก localStorage appointments_v1
      const current = readAppointments();
      const next = current.filter(it => it.id !== activePin.id);

      // เผื่อกรณีข้อมูลเก่าบาง record ไม่มี id ให้ลองจับคู่แบบ fallback
      if (current.length === next.length && activePin.time) {
        const [dStr, tStr=""] = activePin.time.split(" ");
        const title = activePin.title;
        const fallback = current.filter(it => !(it.title===title && it.date===dStr && (it.timeStart||"")===tStr));
        writeAppointments(fallback);
      } else {
        writeAppointments(next);
      }
    }

    setActivePin(null);
  };

  if (!pins || pins.length === 0) return null;

  return h(React.Fragment, null,
    // ===== แถว post-it =====
    h("section", { ref: wrapRef, className:`pin-hwrap ${className}`.trim(), "aria-label":ariaLabel },
      h("div", { ref:scrollRef, className:"pin-hscroll", role:"list" },
        pins.map((p, i) =>
          h("button", {
              key:p.id || `${p.time}-${i}`, type:"button",
              onClick:()=>openPinDialog(p),
              className:`pin-card pin-color-${(i%3)+1}`, role:"listitem",
              "aria-label":`${p.title} ${p.time}`
            },
            h("div", { className:"pin-ico" }, "📌"),
            h("div", { className:"pin-title" }, p.title),
            h("div", { className:"pin-time" }, p.time)
          )
        )
      )
    ),

    // ===== Dialog =====
    activePin && h("div", { className:"pin-dialog", role:"dialog", "aria-modal":"true" },
      h("div", { className:"pin-dialog-box" },
        h("div", { className:"pin-dialog-head" },
          h("div", { className:"pin-dialog-title" }, "บันทึกผลกิจกรรม"),
          h("div", { className:"pin-dialog-sub" }, `${activePin.title} • ${activePin.time}`)
        ),
        h("label", { className:"pin-row pin-check" },
          h("input", { type:"checkbox", checked:done, onChange:(e)=>setDone(e.target.checked) }),
          h("span", null, "ทำเรียบร้อยแล้ว")
        ),
        h("div", { className:"pin-row" },
          h("div", { className:"pin-label" }, "ให้คะแนนความรู้สึก"),
          h("div", { className:"pin-rate" },
            [1,2,3,4,5].map((n)=>
              h("button",{key:n,type:"button",
                className:`pin-face ${rate===n?"active":""}`,
                onClick:()=>setRate(n)
              },["😞","🙁","😐","🙂","😄"][n-1])
            )
          )
        ),
        h("div", { className:"pin-row" },
          h("label",{className:"pin-label",htmlFor:"pinNote"},"ความเห็น/ความรู้สึกเพิ่มเติม"),
          h("textarea",{id:"pinNote",className:"pin-note",rows:3,
            placeholder:"พิมพ์ประเมินความรู้สึกของกิจกรรม…",
            value:note,onChange:(e)=>setNote(e.target.value)})
        ),
        h("div",{className:"pin-dialog-actions"},
          h("button",{className:"btn pin-cancel",type:"button",onClick:closePinDialog},"ยกเลิก"),
          h("button",{className:"btn pin-save",type:"button",onClick:submitPinDialog,
            disabled:rate===0&&!done&&note.trim()===""
          },"บันทึก")
        )
      )
    )
  );
}
