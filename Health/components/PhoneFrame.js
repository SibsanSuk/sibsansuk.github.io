// components/PhoneFrame.js
const h = window.React.createElement;
const { Link, useLocation } = window.ReactRouterDOM;

export function PhoneFrame({ children, dock }) {
  // ไฮไลต์ tab ตาม path ปัจจุบัน
  const loc = useLocation();
  const isNotify = loc.pathname.startsWith("/notify");
  const isHome = loc.pathname === "/"; // หน้าหลักเท่านั้น (หน้าอื่นจะไม่ไฮไลต์)

  // toggle เผื่อพื้นที่ dock
  React.useEffect(() => {
    const root = document.documentElement;
    if (dock) root.classList.add('has-dock');
    else root.classList.remove('has-dock');
    return () => root.classList.remove('has-dock');
  }, [!!dock]);

  return h(React.Fragment, null,
    h("main", { className: "page", id: "page", role: "main" }, children),

    dock ? h("div", { className: "dock", role:"complementary", "aria-label":"แผงกิจกรรมลัด" },
            h("div", { className: "dock-inner" }, dock)
          ) : null,

    h("nav", { className: "nav", role: "navigation", "aria-label": "Main" },
      h(Link, {
          to: "/", className: `btn tab ${isHome ? "active" : ""}`,
          role: "tab", "aria-current": isHome ? "page" : undefined, "aria-label":"หน้าแรก"
        },
        "🏠", " หน้าแรก",
        h("span", { className: "dot", "aria-hidden": "true" })
      ),
      h(Link, {
          to: "/notify", className: `btn tab ${isNotify ? "active" : ""}`,
          role: "tab", "aria-current": isNotify ? "page" : undefined, "aria-label":"แจ้งเตือน"
        },
        "🔔", " แจ้งเตือน",
        h("span", { className: "dot", "aria-hidden": "true" })
      ),
      h("button", {
          className: "btn tab ghost", type: "button", "aria-disabled": "true",
          onClick: () => alert("ปฏิทินยังไม่ทำ 🙂")
        },
        "📅", " 17"
      )
    )
  );
}
