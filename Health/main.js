const h = window.React.createElement;
const ReactDOM = window.ReactDOM;
const { HashRouter, Switch, Route } = window.ReactRouterDOM;

// ใช้ React.lazy + dynamic import (ทำงานกับ React 17 ได้)
const Home = React.lazy(() => import("./pages/Home.js").then(m => ({ default: m.Home })));
const NotifyIndex = React.lazy(() => import("./pages/notify/Index.js").then(m => ({ default: m.NotifyIndex })));
const NotifyAppointment = React.lazy(() => import("./pages/notify/Appointment.js").then(m => ({ default: m.NotifyAppointment })));
const NotifyGeneral = React.lazy(() => import("./pages/notify/General.js").then(m => ({ default: m.NotifyGeneral })));

function Loader(){ return h("div", { className: "screen" }, h("div", { className: "phone" }, "กำลังโหลด...")); }

function App(){
  return h(HashRouter, null,
    h(React.Suspense, { fallback: h(Loader) },
      h(Switch, null,
        h(Route, { exact: true, path: "/", component: Home }),
        h(Route, { exact: true, path: "/notify", component: NotifyIndex }),
        h(Route, { exact: true, path: "/notify/appointment", component: NotifyAppointment }),
        h(Route, { exact: true, path: "/notify/general", component: NotifyGeneral }),
        h(Route, { component: Home })
      )
    )
  );
}

ReactDOM.render(h(App), document.getElementById("root"));
