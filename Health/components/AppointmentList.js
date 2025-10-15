// /components/AppointmentList.js
const h = window.React.createElement;

function pad2(n){ return String(n).padStart(2,"0"); }
function shortThaiDate(ymd){
  const [y,m,d] = ymd.split("-").map(Number);
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const year = (y + 543) % 100; // 68 แทน 2568
  return `${d} ${months[m-1]} ${year}`;
}

/** แถวรายการเดียว (อ่านง่ายผู้สูงอายุ) */
function AptCard({ apt, onOpen }) {
  const dateStr = shortThaiDate(apt.date);
  const timeStr = apt.timeStart ? `เวลา ${apt.timeStart.replace(/^0/, '')}` : "";
  const typeLabel = apt.type === "general" ? "แจ้งเตือนทั่วไป" : "แจ้งเตือนนัด";
  const icon = apt.type === "general" ? "📝" : "🏥";

  return h("div", { className:"apt-card", role:"listitem" },
    h("div", { className:"apt-icon", "aria-hidden":"true" }, icon),
    h("div", { className:"apt-main" },
      h("div", { className:"apt-title" }, apt.title || "(ไม่มีชื่อ)"),
      h("div", { className:"apt-detail" },
        `${dateStr} ${timeStr}`,
        apt.location ? ` • ${apt.location}` : ""
      )
    ),
    h("div", { className:"apt-actions" },
      h("button", { className:"apt-btn", onClick:()=>onOpen?.(apt) }, "ดู / แก้ไข")
    )
  );
}

/**
 * AppointmentList
 * props:
 *  - header: string
 *  - items: Apt[]
 *  - onOpen(apt)
 *  - onAdd()
 *  - groupByDate: boolean
 */
export function AppointmentList({
  header,
  items = [],
  onOpen,
  onAdd,
  groupByDate = true,
}) {
  // สร้างกลุ่มตามวัน (YYYY-MM-DD)
  let groups = [{ key: "all", label: "", list: items }];
  if (groupByDate) {
    const map = {};
    for (const it of items) (map[it.date] ??= []).push(it);
    groups = Object.keys(map).sort().map(k => ({
      key: k,
      label: shortThaiDate(k),
      list: map[k].sort((a,b)=> (a.timeStart||"").localeCompare(b.timeStart||"")),
    }));
  }

  return h("section", { className:"apt-list-section" },
    header ? h("div", { className:"section-title big" }, header) : null,

    items.length === 0
      ? h("div", { className:"empty big" },
          "ยังไม่มีนัดหมาย",
          h("div", { style:{ marginTop:8 } },
            h("button", { className:"btn big", onClick:onAdd }, "เพิ่มการนัด")
          )
        )
      : h(React.Fragment, null,
          groups.map(g => h(React.Fragment, { key:g.key },
            g.label ? h("div", { className:"apt-date-head" }, g.label) : null,
            h("div", { className:"apt-list", role:"list" },
              g.list.map(apt => h(AptCard, { key: apt.id, apt, onOpen }))
            )
          ))
        )
  );
}
