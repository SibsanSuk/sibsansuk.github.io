// /components/CalendarMonth.js
const h = window.React.createElement;

/** ===== Helper ===== */
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function pad2(n){ return String(n).padStart(2,"0"); }

/** ✅ ใช้วันที่แบบ Local timezone (ไม่เลื่อนวัน) */
export function ymdLocal(date){
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}

/**
 * CalendarMonth
 * props:
 *  - value: Date                 (วันที่ใดก็ได้ภายในเดือน)
 *  - eventsByDate: { "YYYY-MM-DD": Apt[] }
 *  - onMonthChange(firstOfMonth)
 *  - onSelectDate(Date)
 *  - startOnMonday: boolean
 *  - buddhistYear: boolean
 */
export function CalendarMonth({
  value,
  eventsByDate = {},
  onMonthChange,
  onSelectDate,
  startOnMonday = true,
  buddhistYear = true,
}) {
  const first = startOfMonth(value);
  const last  = endOfMonth(value);
  const daysInMonth = last.getDate();

  const weekdays = startOnMonday
    ? ["จ.","อ.","พ.","พฤ.","ศ.","ส.","อา."]
    : ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];

  function dayOffset(d){
    const dow = d.getDay(); // 0=อา..6=ส.
    return startOnMonday ? (dow + 6) % 7 : dow;
  }

  const firstIdx = dayOffset(first);
  const cells = [];
  for (let i=0;i<firstIdx;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++){
    cells.push(new Date(value.getFullYear(), value.getMonth(), d));
  }

  const todayKey = ymdLocal(new Date());
  const monthNames = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const titleYear = (value.getFullYear() + (buddhistYear ? 543 : 0));
  const title = `${monthNames[value.getMonth()]} ${titleYear}`;

  const goPrev = () => onMonthChange?.(new Date(value.getFullYear(), value.getMonth()-1, 1));
  const goNext = () => onMonthChange?.(new Date(value.getFullYear(), value.getMonth()+1, 1));

  return h("div", { className:"calendar", role:"group", "aria-label":"ปฏิทินประจำเดือน" },
    // ส่วนหัวเดือน
    h("div", { className:"cal-head", role:"group", "aria-label":"ตัวเลือกเดือน" },
      h("button", { className:"cal-nav", onClick:goPrev, "aria-label":"เดือนก่อนหน้า" }, "‹"),
      h("div", { className:"cal-title" }, title),
      h("button", { className:"cal-nav", onClick:goNext, "aria-label":"เดือนถัดไป" }, "›"),
    ),

    // ชื่อวัน
    h("div", { className:"cal-weekdays", role:"row" },
      weekdays.map((w,i)=> h("div",{ key:i, className:"cal-weekday", role:"columnheader" }, w))
    ),

    // ตารางวัน
    h("div", { className:"cal-grid", role:"grid" },
      cells.map((dt, idx) => {
        if (!dt)
          return h("div", { key:"e"+idx, className:"cal-cell empty", role:"gridcell", "aria-hidden":"true" });

        const key = ymdLocal(dt);
        const hasEvents = !!eventsByDate[key];
        const isToday = key === todayKey;

        return h("button", {
          key,
          className: "cal-cell" + (isToday ? " today" : "") + (hasEvents ? " has-events" : ""),
          role: "gridcell",
          "aria-label": `${dt.getDate()}${hasEvents ? " มีนัดหมาย" : ""}`,
          onClick: () => onSelectDate?.(dt),
        },
          h("span", { className:"cal-daynum" }, dt.getDate()),
          hasEvents ? h("span", { className:"cal-dot", "aria-hidden":"true" }) : null
        );
      })
    )
  );
}
