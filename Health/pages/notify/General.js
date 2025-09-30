const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;
import { PhoneFrame } from "../../components/PhoneFrame.js";

export function NotifyGeneral() {
  return h(PhoneFrame, null,
    h(Link, { to: "/#/notify", className: "back" }, "← การแจ้งเตือนทั่วไป"),
    h("div", { className: "list" },
      h("div", { className: "pill" }, "🎈  การทานยา"),
      h("div", { className: "pill" }, "🔥  การออกกำลังกาย"),
      h("div", { className: "pill" }, "🍱  การทําอาหารเย็น"),
      h("div", { className: "center" },
        h("button", { className: "btn", onClick: () => alert("เพิ่มรายการทั่วไป") }, "+ เพิ่ม")
      )
    )
  );
}
