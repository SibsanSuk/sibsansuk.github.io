// pages/notify/General.js
const h = window.React.createElement;
import { PhoneFrame } from "../../components/PhoneFrame.js";
import { TopBar } from "../../components/TopBar.js";

export function NotifyGeneral() {
  return h(PhoneFrame, null,
    h(TopBar, { title: "การแจ้งเตือนทั่วไป", backTo: "/notify" }),

    h("div", { className: "notify-list" },
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🎈"),
        h("span", { className: "notify-chip" }, "การทานยา")
      ),
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🏃‍♀️"),
        h("span", { className: "notify-chip" }, "การออกกำลังกาย")
      ),
      h("div", { className: "notify-item" },
        h("span", { className: "notify-emoji" }, "🍱"),
        h("span", { className: "notify-chip" }, "การทำอาหารเย็น")
      ),
      h("div", { className: "center" },
        h("button", { className: "btn btn-sm", onClick: () => alert("เพิ่มรายการทั่วไป") }, "+ เพิ่ม")
      )
    )
  );
}
