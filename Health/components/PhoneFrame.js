// components/PhoneFrame.js
const h = window.React.createElement;

export function PhoneFrame({ children, dock }) {
  // เผื่อพื้นที่เมื่อมี dock ซ้อนอยู่เหนือ navbar
  React.useEffect(() => {
    const root = document.documentElement;
    if (dock) root.classList.add("has-dock");
    else root.classList.remove("has-dock");
    return () => root.classList.remove("has-dock");
  }, [!!dock]);

  return h(
    React.Fragment,
    null,
    h("main", { className: "page", id: "page", role: "main" }, children),
    dock
      ? h(
          "div",
          { className: "dock", role: "complementary", "aria-label": "แผงกิจกรรมลัด" },
          h("div", { className: "dock-inner" }, dock)
        )
      : null
  );
}
