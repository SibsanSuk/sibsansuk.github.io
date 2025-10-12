// pages/SOS.js
const h = window.React.createElement;

export function SOS() {
  const [confirmData, setConfirmData] = React.useState(null);

  const calls = [
    { label: "1669 ฉุกเฉินการแพทย์ (EMS)", tel: "1669" },
    { label: "191 ตำรวจ", tel: "191" },
    { label: "199 ดับเพลิง / กู้ภัย", tel: "199" },
    { label: "1155 ตำรวจท่องเที่ยว", tel: "1155" },
    { label: "1300 พม. สังคมสงเคราะห์", tel: "1300" },
    { label: "1667 สายด่วนสุขภาพ (สธ.)", tel: "1667" },
  ];

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
        { className: "card profile-card" },
        h("div", { className: "section-title" }, "เบอร์โทรฉุกเฉิน"),
        h(
          "div",
          { className: "sos-list" },
          calls.map((c) =>
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
      )
  );
}
