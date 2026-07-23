import { useEffect, useState } from "react";
import useTeacherState from "../useTeacherState";

const MECA_LOGO =
  "https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png";
const NECTEC_LOGO =
  "https://www.nectec.or.th/wp-content/uploads/2021/08/cropped-logo.png";
const LEADO_ICON =
  "https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png";

export default function LegacyTopBar({ controller }) {
  const state = useTeacherState(controller);
  const actions = controller.getTeacherActions();
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!state.ready) {
      delete document.documentElement.dataset.reactTeacherTopbar;
      return undefined;
    }
    document.documentElement.dataset.reactTeacherTopbar = "ready";
    return () => {
      delete document.documentElement.dataset.reactTeacherTopbar;
    };
  }, [state.ready]);

  if (!state.ready) return null;

  const zoom =
    state.fontSize === "sm" ? 0.9 : state.fontSize === "lg" ? 1.15 : 1;
  const phone = viewportWidth / zoom < 700;
  const showLanding = !state.course;
  const inCourse = !!state.course;
  const showProfile = state.authed;
  const initials = (state.teacherName || "").replace(/\s/g, "").slice(0, 2);
  const langFlag = state.lang === "th" ? "🇹🇭" : "🇬🇧";
  const selected = state.classrooms.find(
    (course) => String(course.id) === String(state.course),
  );
  const courseTitle =
    selected?.title ||
    selected?.courseName ||
    state.courseTitle ||
    state.courseData?.courseTitle ||
    state.courseData?.title ||
    state.courseData?.display_name ||
    "-";

  const stopAnd = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  return (
    <>
      {(state.userMenuOpen || state.notifOpen || state.leadoOpen) && (
        <button
          type="button"
          aria-label="ปิดแผง"
          onClick={actions.closeAllPanels}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1190,
            border: "none",
            background: "transparent",
            cursor: "default",
          }}
        />
      )}
      <div
        onClick={actions.closeAllPanels}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          zIndex: 1200,
          background: "rgba(255,255,255,.9)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0,0,0,.06)",
          boxShadow: "0 2px 10px rgba(16,24,40,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${phone ? 12 : 22}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            flex: 1,
          }}
        >
          {showLanding && (
            <>
              <button
                type="button"
                title="หน้าแรก"
                onClick={stopAnd(actions.switchCourse)}
                className="h-soft2"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 8,
                }}
              >
                <img
                  src={MECA_LOGO}
                  alt="MECA"
                  style={{ height: 34, objectFit: "contain" }}
                />
              </button>
              {!phone && (
                <>
                  <div style={{ width: 1, height: 24, background: "#e6e8ec" }} />
                  <img
                    src={NECTEC_LOGO}
                    alt="NECTEC"
                    style={{ height: 34, objectFit: "contain" }}
                  />
                </>
              )}
            </>
          )}
          {inCourse && (
            <>
              <button
                type="button"
                onClick={stopAnd(actions.switchCourse)}
                className="h-soft"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#f4f5f7",
                  border: "none",
                  cursor: "pointer",
                  padding: "9px 14px",
                  borderRadius: 10,
                  font: "700 14px 'Noto Sans Thai'",
                  color: "#0f766e",
                }}
              >
                <Icon type="home" size={26} color="#0f766e" />
                หน้าแรก
              </button>
              <div style={{ width: 1, height: 26, background: "#e6e8ec" }} />
              <span
                style={{
                  display: "block",
                  flex: 1,
                  minWidth: 0,
                  font: "700 14px 'Noto Sans Thai'",
                  color: "#1d2939",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 420,
                }}
              >
                {courseTitle}
              </span>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "flex-end",
            flex: "none",
          }}
        >
          {showProfile && (
            <>
              <Leado
                state={state}
                actions={actions}
                dispatchInput={controller.dispatchTeacherInput}
              />
              <Notifications state={state} actions={actions} />
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={stopAnd(actions.toggleUserMenu)}
                  className="h-soft"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    background: "#f4f5f7",
                    border: "1px solid #e9ebef",
                    borderRadius: 999,
                    padding: "5px 10px 5px 6px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ position: "relative", width: 36, height: 36 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#19b3a6,#0d9488)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        font: "700 14px 'Noto Sans Thai'",
                        color: "#fff",
                      }}
                    >
                      {initials}
                    </div>
                    <span
                      style={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        border: "1.5px solid #fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        boxShadow: "0 1px 3px rgba(16,24,40,.25)",
                      }}
                    >
                      {langFlag}
                    </span>
                  </div>
                  <Icon type="chevron" size={17} color="#98a2b3" />
                </button>
                {state.userMenuOpen && (
                  <UserMenu
                    state={state}
                    actions={actions}
                    initials={initials}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Leado({ state, actions, dispatchInput }) {
  const [greeting, setGreeting] = useState("");
  const fullGreeting = "Leado พร้อมให้บริการ ถามข้อมูลได้ที่นี่นะครับ";

  useEffect(() => {
    if (!state.leadoOpen) {
      setGreeting("");
      return undefined;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setGreeting(fullGreeting.slice(0, index));
      if (index >= fullGreeting.length) window.clearInterval(timer);
    }, 34);
    return () => window.clearInterval(timer);
  }, [state.leadoOpen]);

  return (
    <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={actions.toggleLeado}
        className="h-soft"
        style={circleButtonStyle}
      >
        <img
          src={LEADO_ICON}
          alt="Leado"
          style={{ width: 30, height: 30, objectFit: "contain" }}
        />
      </button>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          right: 0,
          zIndex: 98,
          width: 308,
          transformOrigin: "top right",
          opacity: state.leadoOpen ? 1 : 0,
          transform: state.leadoOpen
            ? "scale(1) translateY(0)"
            : "scale(.4) translateY(-14px)",
          animation: state.leadoOpen
            ? "leadoIn .3s cubic-bezier(.2,.8,.2,1)"
            : "none",
          pointerEvents: state.leadoOpen ? "auto" : "none",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #ececf1",
            borderRadius: 16,
            boxShadow: "0 18px 44px rgba(16,24,40,.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              background: "linear-gradient(100deg,#0f766e,#12a594)",
              color: "#fff",
            }}
          >
            <img
              src={LEADO_ICON}
              alt="Leado"
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#fff",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ font: "800 13.5px 'Noto Sans Thai'" }}>Leado</div>
              <div
                style={{
                  font: "500 10.5px 'Noto Sans Thai'",
                  color: "#d5f2ec",
                }}
              >
                ผู้ช่วย AI
              </div>
            </div>
            <button
              type="button"
              onClick={actions.closeLeado}
              style={{
                border: "none",
                background: "rgba(255,255,255,.18)",
                color: "#fff",
                width: 24,
                height: 24,
                borderRadius: 7,
                cursor: "pointer",
                font: "700 12px Inter",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: "14px 16px", background: "#f7fdfb" }}>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e3f3ee",
                borderRadius: 14,
                borderTopLeftRadius: 4,
                padding: "11px 14px",
                font: "500 13px/1.6 'Noto Sans Thai'",
                color: "#344054",
                boxShadow: "0 1px 2px rgba(16,24,40,.04)",
                minHeight: 44,
              }}
            >
              {greeting}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 14px",
              borderTop: "1px solid #f2f4f7",
            }}
          >
            <input
              autoFocus={state.leadoOpen}
              value={state.leadoMsg}
              onChange={(event) =>
                dispatchInput("setLeadoMsg", event.target.value)
              }
              placeholder="พิมพ์คำถามของคุณ..."
              className="fld"
              style={{
                flex: 1,
                minWidth: 0,
                border: "1px solid #e4e7ec",
                borderRadius: 10,
                padding: "9px 12px",
                font: "500 13px 'Noto Sans Thai'",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="h-teal"
              style={{
                border: "none",
                background: "#0d9488",
                color: "#fff",
                width: 38,
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon type="send" size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Notifications({ state, actions }) {
  return (
    <div style={{ position: "relative" }} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={actions.toggleNotif}
        className="h-soft"
        style={{ ...circleButtonStyle, color: "#344054" }}
      >
        <Icon type="bell" size={25} />
      </button>
      {state.notifOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 98,
            width: 320,
            background: "#fff",
            border: "1px solid #eceef1",
            borderRadius: 14,
            boxShadow: "0 14px 34px rgba(16,24,40,.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #f2f4f7",
              font: "700 14px 'Noto Sans Thai'",
              color: "#101828",
            }}
          >
            การแจ้งเตือน
          </div>
          <div style={{ padding: "34px 20px", textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#f4f5f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                color: "#cdd2da",
              }}
            >
              <Icon type="bell" size={22} />
            </div>
            <div
              style={{
                font: "700 13px 'Noto Sans Thai'",
                color: "#475467",
              }}
            >
              ยังไม่มีการแจ้งเตือน
            </div>
            <div
              style={{
                font: "500 11.5px 'Noto Sans Thai'",
                color: "#98a2b3",
                marginTop: 4,
              }}
            >
              เราจะแจ้งเตือนคุณเมื่อมีความเคลื่อนไหว
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ state, actions, initials }) {
  const languageButton = (code, flag, label) => {
    const active = state.lang === code;
    return (
      <button
        key={code}
        type="button"
        onClick={() => actions.pickLang(code)}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          border: `1px solid ${active ? "#0d9488" : "#e4e7ec"}`,
          borderRadius: 9,
          padding: "8px 6px",
          font: "600 12.5px 'Noto Sans Thai'",
          cursor: "pointer",
          background: active ? "#e9fbf4" : "#fff",
          color: active ? "#0f766e" : "#667085",
        }}
      >
        <span style={{ fontSize: 15 }}>{flag}</span>
        {label}
      </button>
    );
  };
  const fontButton = (size, sample) => {
    const active = state.fontSize === size;
    return (
      <button
        key={size}
        type="button"
        onClick={() => actions.pickFont(size)}
        style={{
          flex: 1,
          border: `1px solid ${active ? "#0d9488" : "#e4e7ec"}`,
          borderRadius: 9,
          padding: "8px 4px",
          font: `700 ${sample} 'Noto Sans Thai'`,
          cursor: "pointer",
          background: active ? "#e9fbf4" : "#fff",
          color: active ? "#0f766e" : "#667085",
        }}
      >
        A
      </button>
    );
  };

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        zIndex: 97,
        width: 236,
        background: "#fff",
        border: "1px solid #eceef1",
        borderRadius: 13,
        boxShadow: "0 14px 34px rgba(16,24,40,.18)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #f2f4f7",
          display: "flex",
          alignItems: "center",
          gap: 11,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "#f0fdfa",
            color: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "700 14px 'Noto Sans Thai'",
            flex: "none",
            border: "1px solid #d6f5ee",
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              font: "700 13.5px 'Noto Sans Thai'",
              color: "#101828",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {state.teacherName}
          </div>
          <div
            style={{
              font: "500 11px Inter",
              color: "#98a2b3",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {state.teacherEmail || "—"}
          </div>
        </div>
      </div>
      <MenuLabel>ภาษา</MenuLabel>
      <div style={{ display: "flex", gap: 6, padding: "0 16px 11px" }}>
        {languageButton("th", "🇹🇭", "ไทย")}
        {languageButton("en", "🇬🇧", "English")}
      </div>
      <Divider />
      <MenuLabel>ขนาดตัวอักษร</MenuLabel>
      <div style={{ display: "flex", gap: 6, padding: "0 16px 11px" }}>
        {fontButton("sm", "13px")}
        {fontButton("md", "15px")}
        {fontButton("lg", "18px")}
      </div>
      <Divider />
      <MenuAction onClick={actions.openEdit} icon="edit">
        แก้ไขข้อมูลผู้ใช้
      </MenuAction>
      <Divider />
      <MenuAction onClick={actions.signOut} icon="logout" danger>
        ออกจากระบบ
      </MenuAction>
    </div>
  );
}

function MenuLabel({ children }) {
  return (
    <div
      style={{
        padding: "11px 16px 4px",
        font: "700 11px 'Noto Sans Thai'",
        color: "#98a2b3",
      }}
    >
      {children}
    </div>
  );
}

function MenuAction({ children, onClick, icon, danger = false }) {
  const color = danger ? "#dc2626" : "#344054";
  return (
    <button
      type="button"
      onClick={onClick}
      className={danger ? "h-red" : "h-light"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: "12px 16px",
        font: "600 13.5px 'Noto Sans Thai'",
        color,
        textAlign: "left",
      }}
    >
      <Icon type={icon} size={18} color={danger ? "#dc2626" : "#667085"} />
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f2f4f7" }} />;
}

const circleButtonStyle = {
  position: "relative",
  width: 46,
  height: 46,
  borderRadius: "50%",
  background: "#f4f5f7",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function Icon({ type, size, color = "currentColor" }) {
  const paths = {
    home: [
      "M3.5 11.5 12 4.5l8.5 7",
      "M5.5 10v9.5h13V10",
      "M10 19.5v-5.5h4v5.5",
    ],
    bell: [
      "M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z",
      "M9.7 19a2.3 2.3 0 0 0 4.6 0",
    ],
    send: ["M4 12l16-7-6 16-2.5-6.5L4 12z"],
    chevron: ["M6 9l6 6 6-6"],
    edit: [
      "M4 20.5h4L18.6 9.9a1.9 1.9 0 0 0-2.7-2.7L5.3 17.8 4 20.5z",
      "M14.3 7.2l2.7 2.7",
    ],
    logout: [
      "M15 4.5h2.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15",
      "M10.5 16.5l4.5-4.5-4.5-4.5",
      "M15 12H4",
    ],
  };
  return (
    <span
      style={{
        width: size,
        height: size,
        color,
        display: "inline-flex",
        flex: "none",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={type === "home" || type === "edit" || type === "logout" ? 2 : 2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "100%", height: "100%" }}
      >
        {(paths[type] || []).map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  );
}
