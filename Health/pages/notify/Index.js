// /pages/notify/Index.js
const h = window.React.createElement;
const { useState, useEffect, useMemo } = window.React;

import { TopBar } from "../../components/TopBar.js";
import { CalendarMonth, ymdLocal } from "../../components/CalendarMonth.js";
import { AppointmentDialog } from "../../components/AppointmentDialog.js";
import { AppointmentList } from "../../components/AppointmentList.js";

// -------------------- ตัวอย่างข้อมูลเริ่มต้น --------------------
const SAMPLE_APTS = [
  { id:"apt-001", date:"2025-10-18", timeStart:"09:00", title:"กายภาพบำบัด", type:"appointment", location:"รพ. ศูนย์", note:"ถึงก่อน 15 นาที" },
  { id:"apt-002", date:"2025-10-18", timeStart:"14:30", title:"ฉีดวัคซีนไข้หวัดใหญ่", type:"appointment", location:"สถานพยาบาล ม.", note:"พกบัตร ปชช." },
  { id:"apt-003", date:"2025-10-20", timeStart:"10:30", title:"ตรวจสุขภาพประจำปี", type:"appointment", location:"คลินิก A", note:"งดน้ำอาหาร 8 ชม." },
  { id:"apt-004", date:"2025-10-22", timeStart:"16:00", title:"รับยา", type:"general", location:"รพ. เขต", note:"" },
];

// -------------------- helpers --------------------
function parseYMD(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y, m-1, d); }
function groupByDate(items){
  const map = {};
  for (const it of items){ (map[it.date] ??= []).push(it); }
  for (const k of Object.keys(map)){
    map[k].sort((a,b)=> (a.timeStart||"").localeCompare(b.timeStart||""));
  }
  return map;
}
function genId(){ return "apt-" + Math.random().toString(36).slice(2,8) + "-" + Date.now().toString(36); }

// -------------------- data hook --------------------
function useAppointments(jsonUrl){
  const [items, setItems] = useState(SAMPLE_APTS);
  const [loading, setLoading] = useState(!!jsonUrl);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jsonUrl) return;
    let ok = true;
    (async () => {
      try {
        const res = await fetch(jsonUrl, { cache:"no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ok && Array.isArray(data)) setItems(data);
      } catch (e) {
        console.warn("Load appointments failed, fallback to sample:", e);
        if (ok) setError(e);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [jsonUrl]);

  return { items, setItems, loading, error };
}

// -------------------- หน้า NotifyIndex --------------------
export function NotifyIndex() {
  const APPOINTMENTS_URL = null;

  const { items, setItems, loading } = useAppointments(APPOINTMENTS_URL);
  const eventsByDate = useMemo(()=> groupByDate(items), [items]);

  const [monthRef, setMonthRef] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  // dialog states
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // สร้างรายการที่จะแสดง (ทั้งเดือน หรือ เฉพาะวัน)
  const visibleList = useMemo(() => {
    if (!selectedDate) {
      const y = monthRef.getFullYear(), m = monthRef.getMonth();
      const first = new Date(y, m, 1), last = new Date(y, m+1, 0);
      return items
        .filter(it => {
          const d = parseYMD(it.date);
          return d >= first && d <= last;
        })
        .sort((a,b)=> (a.date+(a.timeStart||"")).localeCompare(b.date+(b.timeStart||"")));
    } else {
      const key = ymdLocal(selectedDate);
      return (eventsByDate[key] || []).slice();
    }
  }, [items, monthRef, selectedDate, eventsByDate]);

  const headerNote = selectedDate
    ? `รายการนัดหมายวันที่ ${ymdLocal(selectedDate)}`
    : `รายการนัดหมายของเดือน ${monthRef.getMonth()+1}/${monthRef.getFullYear()+543}`;

  // handlers
  function openNewForSelected(){
    const dateKey = ymdLocal(selectedDate || new Date());
    setEditing({ id:null, date:dateKey, timeStart:"", title:"", type:"appointment", location:"", note:"" });
    setDlgOpen(true);
  }
  function openEdit(apt){ setEditing({ ...apt }); setDlgOpen(true); }
  function closeDlg(){ setDlgOpen(false); setEditing(null); }
  function saveApt(apt){
    if (apt.id) setItems(list => list.map(it => it.id===apt.id ? { ...it, ...apt } : it));
    else setItems(list => [...list, { ...apt, id: genId() }]);
    setDlgOpen(false); setEditing(null);
  }
  function deleteApt(id){
    setItems(list => list.filter(it => it.id !== id));
    setDlgOpen(false); setEditing(null);
  }

  return h(React.Fragment, null,
    h("div", { className:"page", role:"main", "aria-label":"นัดหมาย" },
      h(TopBar, { title: "นัดหมาย" }),

      // ปฏิทิน + ปุ่มเพิ่ม
      h("section", { className:"notify-calendar-sec" },
        h(CalendarMonth, {
          value: monthRef,
          eventsByDate,
          onMonthChange: (firstOfMonth) => { setMonthRef(firstOfMonth); setSelectedDate(null); },
          onSelectDate: (dt) => {
            if (dt.getMonth() === monthRef.getMonth() && dt.getFullYear() === monthRef.getFullYear()) setSelectedDate(dt);
            else { setMonthRef(new Date(dt.getFullYear(), dt.getMonth(), 1)); setSelectedDate(dt); }
          },
          startOnMonday: true,
          buddhistYear: true,
        }),
        h("div", { className:"calendar-actions" },
          h("button", { className:"btn", onClick: openNewForSelected }, "เพิ่มการนัด")
        )
      ),

      // รายการนัดหมาย (คอมโพเนนต์แยก)
      loading
        ? h("div", { className:"loading", style:{ padding:"12px 10px 16px" } }, "กำลังโหลด…")
        : h(AppointmentList, {
            header: headerNote,
            items: visibleList,
            onOpen: openEdit,
            onAdd: openNewForSelected,
            groupByDate: !selectedDate, // ถ้าเลือกวันแล้ว ไม่ต้องกรุ๊ปซ้ำ
          })
    ),

    // Dialog เพิ่ม/แก้ไขนัดหมาย
    h(AppointmentDialog, {
      open: dlgOpen,
      initial: editing,
      onSubmit: saveApt,
      onDelete: deleteApt,
      onClose: closeDlg,
      selectedDate: selectedDate || new Date(),
    })
  );
}
