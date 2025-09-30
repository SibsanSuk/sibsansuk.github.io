const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

/** Shell เหมือนแอปมือถือ: .page คือคอนเทนต์ที่เลื่อนจริง */
export function PhoneFrame({ children }) {
  return h(React.Fragment, null,
    h("main", { className: "page", id: "page", role: "main" }, children),
    h("nav", { className: "nav", role: "navigation", "aria-label": "Main" },
      h(Link, { to: "/", className: "btn", "aria-label":"หน้าแรก" }, "🏠", " หน้าแรก"),
      h(Link, { to: "/notify", className: "btn", "aria-label":"แจ้งเตือน" }, "🔔", " แจ้งเตือน"),
      h("button", {
        className: "btn ghost",
        "aria-label":"ปฏิทิน (ยังไม่เปิดใช้)",
        onClick: () => alert("ปฏิทินยังไม่ทำ 🙂")
      }, "📅", " 17")
    )
  );
}
