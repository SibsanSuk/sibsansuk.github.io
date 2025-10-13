// pages/Login.js
const h = window.React.createElement;
const { useState, useEffect } = React;
const { useHistory, useLocation } = window.ReactRouterDOM;
import { useAuth } from "../auth.js";

export function Login(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const { user, login } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const from = (location && location.state && location.state.from) || "/";

  useEffect(() => { if (user) history.replace("/"); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const res = login({ username: username.trim(), password, remember });
    if (res.ok) history.replace(from);
    else setErr(res.message || "เข้าสู่ระบบไม่สำเร็จ");
  };

  return h("main", { className: "page login-wrap" },
    h("div", { className: "brand" }, "Personalised Wellness"),
    h("form", { className: "login-card", onSubmit: submit, noValidate: true },
      h("h2", null, "เข้าสู่ระบบ"),
      h("label", { className: "input-row" },
        h("span", null, "ผู้ใช้"),
        h("input", {
          className: "input",
          type: "text",
          placeholder: "nectec",
          value: username,
          onChange: e => setUsername(e.target.value),
          autoComplete: "username",
          inputMode: "text",
          required: true
        })
      ),
      h("label", { className: "input-row" },
        h("span", null, "รหัสผ่าน"),
        h("input", {
          className: "input",
          type: "password",
          placeholder: "••••••",
          value: password,
          onChange: e => setPassword(e.target.value),
          autoComplete: "current-password",
          required: true
        })
      ),
      h("label", { className: "checkbox-row" },
        h("input", { type: "checkbox", checked: remember, onChange: e => setRemember(e.target.checked) }),
        h("span", null, "จำฉันในอุปกรณ์นี้")
      ),
      err ? h("div", { style:{color:"#c0392b", fontWeight:700} }, err) : null,
      h("button", {
        className: "btn login-btn",
        type: "submit",
        disabled: !(username.trim() && password)
      }, "เข้าสู่ระบบ")
    ),
    // เคล็ดลับ: บอกบัญชีทดสอบสำหรับการเดโม (ลบได้ภายหลัง)
    h("p", { className:"center", style:{color:"#fff", opacity:.7, marginTop:"10px"} })
  );
}
