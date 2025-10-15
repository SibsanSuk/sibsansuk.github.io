// /components/AppointmentDialog.js
const h = window.React.createElement;
const { useEffect, useMemo, useState } = window.React;

import { ymdLocal } from "./CalendarMonth.js";

function fmtThaiDateLarge(date) {
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const y = date.getFullYear() + 543;
  return `${date.getDate()} ${months[date.getMonth()]} ${y}`;
}
function pad2(n){ return String(n).padStart(2,"0"); }

function TimeSimple({ valueH, valueM, onChange }) {
  const STEP = 15; // นาทีเพิ่ม/ลดทีละ 15
  function incHour(){ onChange({ h:(valueH+1)%24, m:valueM }); }
  function decHour(){ onChange({ h:(valueH+23)%24, m:valueM }); }
  function incMin(){
    let m = valueM + STEP;
    let h = valueH;
    if (m >= 60) { m -= 60; h = (h+1)%24; }
    onChange({ h, m });
  }
  function decMin(){
    let m = valueM - STEP;
    let h = valueH;
    if (m < 0) { m += 60; h = (h+23)%24; }
    onChange({ h, m });
  }

  return h("div", { className:"time-simple" },
    h("div", { className:"time-col" },
      h("button", { type:"button", className:"time-btn", onClick:incHour, "aria-label":"เพิ่มชั่วโมง" }, "+"),
      h("div", { className:"time-display" }, pad2(valueH)),
      h("button", { type:"button", className:"time-btn", onClick:decHour, "aria-label":"ลดชั่วโมง" }, "−"),
      h("div", { className:"time-label" }, "ชั่วโมง")
    ),
    h("div", { className:"time-sep" }, ":"),
    h("div", { className:"time-col" },
      h("button", { type:"button", className:"time-btn", onClick:incMin, "aria-label":"เพิ่มนาที" }, "+"),
      h("div", { className:"time-display" }, pad2(valueM)),
      h("button", { type:"button", className:"time-btn", onClick:decMin, "aria-label":"ลดนาที" }, "−"),
      h("div", { className:"time-label" }, "นาที")
    )
  );
}

export function AppointmentDialog({
  open,
  initial,          // { id?, date:"YYYY-MM-DD", timeStart, title, type, location, note }
  onSubmit,         // (apt) => void
  onDelete,         // (id) => void
  onClose,          // () => void
  selectedDate,     // Date
}) {
  const [form, setForm] = useState(initial || {});
  // เริ่มต้นที่ 12:00 (ถ้ามีค่าเดิม ใช้ค่าจากเดิม)
  const [hm, setHM] = useState(() => {
    if (initial?.timeStart) {
      const [h,m] = initial.timeStart.split(":").map(Number);
      return { h, m };
    }
    return { h: 12, m: 0 };
  });

  useEffect(() => {
    setForm(initial || {});
    if (initial?.timeStart) {
      const [h,m] = initial.timeStart.split(":").map(Number);
      setHM({ h, m });
    } else {
      setHM({ h: 12, m: 0 });
    }
  }, [initial, open]);

  const isEdit = !!form?.id;
  const selDate = useMemo(() => selectedDate || new Date(), [selectedDate]);

  function setField(k){ return (e) => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e })); }

  function submit(e){
    e.preventDefault();
    if (!form.title?.trim()) return alert("กรุณาใส่ชื่อการนัด");
    const payload = {
      id: form.id || null,
      date: form.date || ymdLocal(selDate),
      timeStart: `${pad2(hm.h)}:${pad2(hm.m)}`,
      title: form.title.trim(),
      type: form.type || "appointment",
      location: form.location || "",
      note: form.note || "",
    };
    onSubmit?.(payload);
  }

  if (!open) return null;

  return h("div", { className:"dlg-backdrop", role:"presentation", onClick:(e)=>{ if(e.target===e.currentTarget) onClose?.(); } },
    h("div", { className:"dlg dlg-senior", role:"dialog", "aria-modal":"true", "aria-label": isEdit ? "แก้ไขนัดหมาย" : "เพิ่มนัดหมาย" },
      h("div", { className:"dlg-header" },
        h("button", { className:"btn-link", type:"button", onClick:onClose }, "ยกเลิก"),
        h("div", { className:"dlg-date center" }, fmtThaiDateLarge(selDate)),
        h("button", { className:"btn-link strong", type:"submit", form:"apt-form" }, isEdit ? "บันทึก" : "เพิ่ม"),
      ),

      h("form", { id:"apt-form", className:"dlg-form", onSubmit:submit },
        h("input", { type:"hidden", value: form.date || ymdLocal(selDate), onChange:setField("date") }),

        // เวลาเริ่มแบบง่าย: 12:00 + ปุ่ม +/- ชั่วโมง/นาที (นาที step 15)
        h("div", { className:"dlg-field" },
          h("span", { className:"dlg-label-lg" }, "เวลาเริ่ม"),
          h(TimeSimple, { valueH: hm.h, valueM: hm.m, onChange: setHM })
        ),

        // ชื่อการนัด
        h("label", { className:"dlg-field" },
          h("span", { className:"dlg-label-lg" }, "ชื่อการนัด"),
          h("input", {
            className:"dlg-input-xl",
            type:"text",
            placeholder:"เช่น ตรวจสุขภาพ / รับยา",
            value: form.title || "",
            onChange: setField("title")
          })
        ),

        // ประเภท (สองปุ่มใหญ่)
        h("div", { className:"dlg-field" },
          h("span", { className:"dlg-label-lg" }, "ประเภท"),
          h("div", { className:"type-row" },
            h("button", {
              type:"button",
              className: "type-chip" + ((form.type||"appointment")==="appointment" ? " selected":""),
              onClick: ()=> setField("type")("appointment")
            }, "การแจ้งเตือนนัด"),
            h("button", {
              type:"button",
              className: "type-chip" + ((form.type||"appointment")==="general" ? " selected":""),
              onClick: ()=> setField("type")("general")
            }, "การแจ้งเตือนทั่วไป")
          )
        ),

        // ตัวเลือกเพิ่มเติม (ซ่อน)
        h("details", { className:"dlg-more" },
          h("summary", null, "ตัวเลือกเพิ่มเติม"),
          h("label", { className:"dlg-field" },
            h("span", null, "สถานที่ (ถ้ามี)"),
            h("input", { type:"text", value:form.location || "", onChange:setField("location") })
          ),
          h("label", { className:"dlg-field" },
            h("span", null, "หมายเหตุ"),
            h("textarea", { rows:3, value:form.note || "", onChange:setField("note") })
          )
        ),

        // ปุ่มล่าง
        h("div", { className:"dlg-actions" },
          isEdit && h("button", {
            type:"button",
            className:"btn danger btn-xl",
            onClick:()=>{ if(confirm("ลบนัดหมายนี้?")) onDelete?.(form.id); }
          }, "ลบ"),
          h("div", { className:"flex1" }),
          h("button", { type:"button", className:"btn light btn-xl", onClick:onClose }, "ยกเลิก"),
          h("button", { type:"submit", className:"btn btn-xl" }, isEdit ? "บันทึก" : "เพิ่ม"),
        )
      )
    )
  );
}
