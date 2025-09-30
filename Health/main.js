// main.js
const h = window.React.createElement;
const ReactDOM = window.ReactDOM;
const { HashRouter, Switch, Route } = window.ReactRouterDOM;

import { LoaderSkeleton } from "./components/Loader.js";
import { AuthProvider, PrivateRoute } from "./auth.js";
import { Login } from "./pages/Login.js";

// lazy pages
const Home               = React.lazy(() => import("./pages/Home.js").then(m => ({ default: m.Home })));
const NotifyIndex        = React.lazy(() => import("./pages/notify/Index.js").then(m => ({ default: m.NotifyIndex })));
const NotifyAppointment  = React.lazy(() => import("./pages/notify/Appointment.js").then(m => ({ default: m.NotifyAppointment })));
const NotifyGeneral      = React.lazy(() => import("./pages/notify/General.js").then(m => ({ default: m.NotifyGeneral })));
const Profile             = React.lazy(() => import("./pages/Profile.js").then(m => ({ default: m.Profile })));


// App
function App(){
  return h(AuthProvider, null,
    h(HashRouter, null,
      h(React.Suspense, { fallback: h(LoaderSkeleton) },
        h(Switch, null,
          // เปิดได้โดยไม่ล็อกอิน
          h(Route, { exact:true, path:"/login", component: Login }),

          // ต้องล็อกอินก่อน
          h(PrivateRoute, { exact:true, path:"/", component: Home }),
          h(PrivateRoute, { exact:true, path:"/notify", component: NotifyIndex }),
          h(PrivateRoute, { exact:true, path:"/notify/appointment", component: NotifyAppointment }),
          h(PrivateRoute, { exact:true, path:"/notify/general", component: NotifyGeneral }),
          h(PrivateRoute, { exact:true, path:"/profile", component: Profile }),

          // fallback
          h(PrivateRoute, { component: Home })
        )
      )
    )
  );
}

ReactDOM.render(h(App), document.getElementById("root"));
