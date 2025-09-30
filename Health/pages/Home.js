const h = window.React.createElement;
import { PhoneFrame } from "../components/PhoneFrame.js";

export function Home() {
  return h(PhoneFrame, null,
    h("h1", null, "Personalised Wellness"),
    h("div", { className: "bubble" }, h("span", null, "📝"), h("div", null, "วันนี้บันทึกความดันด้วยนะครับ")),
    h("div", { className: "bubble" }, h("span", null, "💧"), h("div", null, "วันนี้ดื่มน้ำอีกอย่างน้อย 3 แก้วนะครับ")),
    h("div", { className: "card" },
      h("div", { className: "section-title" }, "กิจกรรมในวันนี้"),
      h("div", { className: "grid" },
        ["กิจกรรม","บันทึกสุขภาพ","อันทัศนคติ","ประเมิน"].map((label,i)=>
          h("div", { key: i, className: "tile", onClick: () => alert(label) },
            h("span", { className: "emoji" }, ["🧘‍♂️","❤️","😊","📋"][i]),
            h("span", null, label)
          )
        )
      )
    )
  );
}
