// pages/Profile.js
const h = window.React.createElement;
const { useHistory } = window.ReactRouterDOM;

import { PhoneFrame } from "../components/PhoneFrame.js";
import { TopBar } from "../components/TopBar.js";
import { useAuth } from "../auth.js";

export function Profile(){
  const { user, logout } = useAuth();
  const history = useHistory();

  const displayName = (user && (user.name || user.username)) || "ผู้ใช้";
  const username = user && user.username;
  const initials = (displayName || "U").trim().split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();

  const onLogout = () => { logout(); history.replace("/login"); };

  return h(PhoneFrame, null,
    h(TopBar, { title: "ข้อมูลผู้ใช้", backTo: "/" }),
    h("div", { className:"card center profile-card" },
      h("div", { className:"avatar-lg" }, initials),
      h("div", { className:"profile-name" }, displayName),
      username ? h("div", { className:"profile-username" }, "@", username) : null
    ),
    h("div", { className:"center", style:{marginTop:"10px"} },
      h("button", { className:"btn logout-btn", onClick:onLogout }, "ออกจากระบบ")
    )
  );
}
