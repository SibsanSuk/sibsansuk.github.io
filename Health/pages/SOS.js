// pages/SOS.js
const h = window.React.createElement;
const CALLS_KEY = "sosEmergencyCalls";
const defaultCalls = [
  { label: "1669 ฉุกเฉินการแพทย์ (EMS)", tel: "1669" },
  { label: "191 ตำรวจ", tel: "191" },
  { label: "1667 สายด่วนสุขภาพ (สธ.)", tel: "1667" }
];

const getStoredCalls = () => {
  if (typeof window === "undefined" || !window.localStorage) return defaultCalls;
  try {
    const raw = window.localStorage.getItem(CALLS_KEY);
    if (!raw) return defaultCalls;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultCalls;
  } catch (err) {
    console.warn("ไม่สามารถอ่านเบอร์ฉุกเฉินจาก localStorage", err);
    return defaultCalls;
  }
};

const sanitizeCall = (item = {}) => ({
  label: (item.label || "").trim(),
  tel: (item.tel || "").replace(/\s+/g, "")
});

export function SOS() {
  const [confirmData, setConfirmData] = React.useState(null);
  const [emergencyCalls, setEmergencyCalls] = React.useState(() => getStoredCalls());
  const [manageOpen, setManageOpen] = React.useState(false);
  const [editableCalls, setEditableCalls] = React.useState(() => getStoredCalls());
  const [manageMessage, setManageMessage] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(CALLS_KEY, JSON.stringify(emergencyCalls));
  }, [emergencyCalls]);

  React.useEffect(() => {
    if (!manageOpen) return;
    setEditableCalls(emergencyCalls);
    setManageMessage("");
  }, [manageOpen, emergencyCalls]);

  const callEntries = React.useMemo(() => [...emergencyCalls], [emergencyCalls]);

  const handleManageChange = (index, field) => (e) => {
    const value = e.target.value;
    setEditableCalls((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleManageRemove = (index) => {
    setEditableCalls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManageAdd = () => {
    setEditableCalls((prev) => [...prev, { label: "", tel: "" }]);
  };

  const moveCall = (index, direction) => {
    setEditableCalls((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleManageSave = (e) => {
    e?.preventDefault?.();
    const next = editableCalls.map(sanitizeCall).filter((item) => item.label && item.tel);
    if (!next.length) {
      setManageMessage("ต้องมีเบอร์ฉุกเฉินอย่างน้อย 1 รายการ");
      return;
    }
    setEmergencyCalls(next);
    setManageMessage("บันทึกเบอร์ฉุกเฉินแล้ว");
    setTimeout(() => {
      setManageMessage("");
      setManageOpen(false);
    }, 800);
  };

  const handleCallClick = (item) => setConfirmData(item);
  const handleConfirm = () => {
    if (confirmData) {
      window.location.href = `tel:${confirmData.tel}`;
      setConfirmData(null);
    }
  };
  const handleCancel = () => setConfirmData(null);

  return h(
    React.Fragment,
    null,

    // ใส่คอนเทนต์ทั้งหมดของหน้านี้ไว้ใน main.page เพื่อให้เลื่อนได้
    h(
      "main",
      { className: "page", id: "page", role: "main" },
      h("div", { className: "topbar" }, h("h1", null, "ช่วยเหลือ (SOS)")),

      h(
        "div",
        { className: "card" },
        h("div", { className: "section-title" }, "เบอร์โทรฉุกเฉิน"),
        h(
          "div",
          { className: "sos-list" },
          callEntries.map((c) =>
            h(
              "button",
              {
                key: c.tel,
                className: "btn sos-btn",
                type: "button",
                onClick: () => handleCallClick(c),
              },
              "📞 ",
              c.label
            )
          )
        ),
        h(
          "div",
          { className: "bubble", style: { marginTop: 12 } },
          "หมายเหตุ: เมื่อกดยืนยัน ระบบจะเปิดแอปโทรศัพท์ของอุปกรณ์ทันที"
        ),
        h("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 12 } },
          h("button", {
            type: "button",
            className: "btn",
            style: { background: "#fff", color: "#2b4b88", border: "1px solid #b8c4f4" },
            onClick: () => setManageOpen(true)
          }, "จัดการเบอร์ฉุกเฉิน")
        )
      )
    ),

    // Dialog ยืนยันโทร (ซ้อนทับทั้งหน้า)
    confirmData &&
      h(
        "div",
        { className: "sos-dialog" },
        h(
          "div",
          { className: "sos-dialog-box" },
          h("div", { className: "sos-dialog-title" }, "ยืนยันการโทรออก"),
          h("div", { className: "sos-dialog-number" }, "📞 ", confirmData.label),
          h(
            "div",
            { className: "sos-dialog-actions" },
            h("button", { className: "btn sos-cancel", onClick: handleCancel }, "ยกเลิก"),
            h("button", { className: "btn sos-confirm", onClick: handleConfirm }, "โทรออก")
          )
        )
      ),

    manageOpen &&
      h(
        "div",
        { className: "sos-dialog" },
        h(
          "div",
          {
            className: "sos-dialog-box",
            style: {
              maxWidth: "400px",
              maxHeight: "90vh",
              overflowY: "auto"
            }
          },
          h("div", { className: "sos-dialog-title" }, "จัดการเบอร์ฉุกเฉิน"),
          h("p", { style: { margin: "6px 0 12px", color: "#4c5773" } }, "เพิ่ม แก้ไข หรือลบเบอร์ที่ใช้ติดต่อในยามฉุกเฉิน"),
          h("form", { onSubmit: handleManageSave, style: { display: "flex", flexDirection: "column", gap: "8px" } },
            editableCalls.map((item, idx) =>
              h("div", {
                key: `edit-${idx}`,
                style: {
                  border: "1px solid #e0e7ff",
                  borderRadius: "12px",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }
              },
                h("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px"
                  }
                },
                  h("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#5c6a9e" } }, `เบอร์ที่ ${idx + 1}`),
                  h("div", { style: { display: "flex", gap: "6px" } },
                    h("button", {
                      type: "button",
                      className: "btn",
                      style: {
                        background: "#f0f3ff",
                        color: "#2b4b88",
                        padding: "4px 10px"
                      },
                      onClick: () => moveCall(idx, -1),
                      disabled: idx === 0,
                      title: "เลื่อนขึ้น"
                    }, "↑"),
                    h("button", {
                      type: "button",
                      className: "btn",
                      style: {
                        background: "#f0f3ff",
                        color: "#2b4b88",
                        padding: "4px 10px"
                      },
                      onClick: () => moveCall(idx, 1),
                      disabled: idx === editableCalls.length - 1,
                      title: "เลื่อนลง"
                    }, "↓")
                  )
                ),
                h("input", {
                  type: "text",
                  className: "input",
                  placeholder: "ชื่อสายด่วน / หน่วยงาน",
                  value: item.label || "",
                  onChange: handleManageChange(idx, "label")
                }),
                h("div", {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "8px",
                    alignItems: "center"
                  }
                },
                  h("input", {
                    type: "tel",
                    className: "input",
                    placeholder: "หมายเลขโทรศัพท์",
                    value: item.tel || "",
                    onChange: handleManageChange(idx, "tel")
                  }),
                  editableCalls.length > 1 ? h("button", {
                    type: "button",
                    className: "btn",
                    style: { background: "#ffe3e3", color: "#c22525", minWidth: "64px" },
                    onClick: () => handleManageRemove(idx)
                  }, "ลบ") : null
                )
              )
            ),
            h("button", {
              type: "button",
              className: "btn",
              style: { background: "#f4f7ff", color: "#2b4b88", border: "1px dashed #9eb0f2" },
              onClick: handleManageAdd
            }, "เพิ่มเบอร์ใหม่"),
            manageMessage ? h("div", {
              style: {
                fontWeight: 600,
                color: manageMessage.includes("ต้องมี") ? "#c22525" : "#2f9e44",
                textAlign: "center"
              }
            }, manageMessage) : null,
            h("div", { className: "sos-dialog-actions", style: { marginTop: "12px" } },
              h("button", {
                type: "button",
                className: "btn sos-cancel",
                onClick: () => { setManageOpen(false); setManageMessage(""); }
              }, "ยกเลิก"),
              h("button", {
                type: "submit",
                className: "btn sos-confirm"
              }, "บันทึก")
            )
          )
        )
      )
  );
}
