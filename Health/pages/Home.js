// pages/Home.js
const h = window.React.createElement;
const { Link } = window.ReactRouterDOM;

const HOME_CHAT_URL = "./apidata/home-chat.json";

// import { Activities } from "../components/Activities.js";
import { HomePins } from "../components/HomePins.js";
import { HomeChat } from "../components/HomeChat.js";
import { useAuth } from "../auth.js";
import { News } from "../components/News.js";

export function Home() {
  const { user } = useAuth();
  const displayName =
    (user && (user.name || user.username)) || "ผู้ใช้";
  const initials = (displayName || "U")
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // mock data
  const defaultTips = [
    { id: "m1", author: "doctor", text: "วันนี้ดื่มน้ำไปแล้ว 4 แก้ว ดื่มให้ครบ 8 แก้วนะครับ 💧" },
    { id: "m2", author: "doctor", text: "เช้านี้เรายืนแกว่งแขนกันสัก 30 รอบนะครับ 🏃‍♂️" },
    { id: "m3", author: "doctor", text: "วันนี้อากาศสดใส" },
  ];
  const data = {
    pinnedAppointments: [
      { id: "ap1", title: "พบแพทย์อายุรกรรม", time: "วันนี้ 14:30",  to: "/notify/appointment" },
      { id: "ap2", title: "ตรวจเลือด",         time: "พรุ่งนี้ 07:00", to: "/notify/appointment" },
      { id: "ap3", title: "กินโต๊ะแชร์ ม.ปลาย", time: "พรุ่งนี้ 11:30", to: "/notify/appointment" },
      { id: "ap4", title: "กายภาพ",             time: "พรุ่งนี้ 09:00", to: "/notify/appointment" },
    ]
  };
  const [tips, setTips] = React.useState(defaultTips);
  const [chatState, setChatState] = React.useState({ status: "idle", error: null });

  React.useEffect(() => {
    if (typeof fetch !== "function") {
      setChatState({ status: "error", error: "บราวเซอร์ไม่รองรับการโหลดข้อมูล" });
      return;
    }
    let cancelled = false;
    setChatState({ status: "loading", error: null });
    fetch(HOME_CHAT_URL)
      .then((res) => {
        if (!res.ok) throw new Error("โหลดบทสนทนาไม่สำเร็จ");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (Array.isArray(json) && json.length) {
          setTips(json);
          setChatState({ status: "success", error: null });
        } else {
          setChatState({ status: "error", error: "ไม่มีข้อมูลบทสนทนา" });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setChatState({ status: "error", error: err?.message || "โหลดข้อมูลไม่ได้" });
      });
    return () => { cancelled = true; };
  }, []);

  // ตรวจ orientation แบบ reactive
  const [isPortrait, setIsPortrait] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)").matches
      : true
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = () => setIsPortrait(mq.matches);
    mq.addEventListener?.("change", onChange);
    onChange();
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // (optional) feedback จาก HomePins (ไว้ยิง API)
  const onSubmitFeedback = (payload) => {
    console.log("PIN_FEEDBACK from HomePins:", payload);
  };

  // ช่วยให้แนวตั้งเผื่อพื้นที่ให้ dock (ของหน้า Home เอง ไม่ใช่ PhoneFrame)
  React.useEffect(() => {
    const root = document.documentElement;
    if (isPortrait) root.classList.add("home-has-act-dock");
    else root.classList.remove("home-has-act-dock");
    return () => root.classList.remove("home-has-act-dock");
  }, [isPortrait]);

  const renderNews = () => h(News);
  return h(
    React.Fragment,
    null,

    // เนื้อหา
    h("div", { className: "page home-page", id: "page", role: "main" },

      // User profile bar
      h("div", { className: "userbar" },
        h("div", { className: "userbar-name" }, "สวัสดี, ", displayName),
        h(Link, { to: "/profile", className: "avatar", "aria-label": "โปรไฟล์ผู้ใช้" }, initials)
      ),

      h("h1", null, "Personalised Wellness"),

      // Pins (กลางจอในแนวนอน, flow ปกติในแนวตั้ง)
      h("div", { className: "home-pins-wrap" },
      h(HomePins, {
        pins: data.pinnedAppointments,
        onSubmitFeedback,
        ariaLabel: "การนัดที่ปักหมุด"
      })
    ),
      renderNews(),

      // MAIN AREA
      (() => {
        const chatBlock = h(React.Fragment, null,
          chatState.status === "loading"
            ? h("div", { className: "bubble" }, "กำลังโหลดบทสนทนา…")
            : null,
          chatState.status === "error" && chatState.error
            ? h("div", { className: "bubble", style: { background: "#ffecec", color: "#c13515" } }, chatState.error)
            : null,
          h(HomeChat, {
            messages: tips,
            meAvatarText: initials,
            doctorAvatarSrc: "./images/doctor.png",
            animate: true,
            startDelay: 200,
            stepMs: 650,
            ariaLabel: "คำแนะนำจากผู้เชี่ยวชาญ"
          })
        );
        return isPortrait
          ? chatBlock
          : h("div", { className: "home-main" },
              h("div", { className: "home-left" }, chatBlock)
            );
      })()
    ),

    // แนวตั้งเท่านั้น: กรอบ Activities เป็น dock (ของหน้า Home เอง)
    // isPortrait && h("div", { className: "activities-dock", role: "complementary", "aria-label": "แผงกิจกรรมลัด" },
    //   h("div", { className: "inner" },
    //     h("div", { className: "activities" }, h(Activities, null))
    //   )
    // )
  );
}
