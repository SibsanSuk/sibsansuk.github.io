// main.js
const h = window.React.createElement;
const ReactDOM = window.ReactDOM;
const { HashRouter, Switch, Route, useLocation } = window.ReactRouterDOM;

import { LoaderSkeleton } from "./components/Loader.js";
import { AuthProvider, PrivateRoute } from "./auth.js";
import { Login } from "./pages/Login.js";
import { NavBar } from "./components/NavBar.js";

// lazy pages
const Home = React.lazy(() =>
  import("./pages/Home.js").then((m) => ({ default: m.Home }))
);
const NotifyIndex = React.lazy(() =>
  import("./pages/notify/Index.js").then((m) => ({ default: m.NotifyIndex }))
);
const NotifyAppointment = React.lazy(() =>
  import("./pages/notify/Appointment.js").then((m) => ({ default: m.NotifyAppointment }))
);
const NotifyGeneral = React.lazy(() =>
  import("./pages/notify/General.js").then((m) => ({ default: m.NotifyGeneral }))
);
const Profile = React.lazy(() =>
  import("./pages/Profile.js").then((m) => ({ default: m.Profile }))
);
const SOS = React.lazy(() =>
  import("./pages/SOS.js").then((m) => ({ default: m.SOS }))
);

const Exercise = React.lazy(() =>
  import("./pages/Exercise.js").then((m) => ({ default: m.Exercise }))
);

const ExerciseVideos = React.lazy(() =>
  import("./pages/exercise/Videos.js").then((m) => ({ default: m.ExerciseVideos }))
);

const YoungFit = React.lazy(() =>
  import("./pages/exercise/YoungFit.js").then((m) => ({ default: m.YoungFit }))
);

const Mood = React.lazy(() =>
  import("./pages/Mood.js").then((m) => ({ default: m.Mood }))
);

const Assessment = React.lazy(() =>
  import("./pages/Assessment.js").then((m) => ({ default: m.Assessment }))
);

// Shell: แยกโครงหน้า + คุมการแสดง NavBar
function Shell() {
  const loc = useLocation();
  const onLogin = (loc.pathname || "") === "/login";

  return h(
    React.Fragment,
    null,
    h(
      React.Suspense,
      { fallback: h(LoaderSkeleton) },
      h(
        Switch,
        null,
        // เปิดได้โดยไม่ล็อกอิน
        h(Route, { exact: true, path: "/login", component: Login }),

        // ต้องล็อกอินก่อน
        h(PrivateRoute, { exact: true, path: "/", component: Home }),
        h(PrivateRoute, { exact: true, path: "/notify", component: NotifyIndex }),
        h(PrivateRoute, { exact: true, path: "/notify/appointment", component: NotifyAppointment }),
        h(PrivateRoute, { exact: true, path: "/notify/general", component: NotifyGeneral }),
        h(PrivateRoute, { exact: true, path: "/profile", component: Profile }),
        h(PrivateRoute, { exact: true, path: "/sos", component: SOS }),
        h(PrivateRoute, { exact: true, path: "/exercise", component: Exercise }),
        h(PrivateRoute, { exact: true, path: "/exercise/videos", component: ExerciseVideos }),
        h(PrivateRoute, { exact: true, path: "/exercise/youngfit", component: YoungFit }),
        h(PrivateRoute, { exact: true, path: "/mood", component: Mood }),
        h(PrivateRoute, { exact: true, path: "/assessment", component: Assessment }),
        // fallback
        h(PrivateRoute, { component: Home })
      )
    ),
    onLogin ? null : h(NavBar)
  );
}

// App
function App() {
  return h(AuthProvider, null, h(HashRouter, null, h(Shell)));
}

ReactDOM.render(h(App), document.getElementById("root"));
