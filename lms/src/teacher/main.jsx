import { Component, useEffect } from "react";
import { createRoot } from "react-dom/client";
import LegacyTopBar from "./components/LegacyTopBar";
import "./teacher.css";

globalThis.__TEACHER_REACT_MODE__ = false;
globalThis.__TEACHER_REACT_TOPBAR_MODE__ = true;

class TopBarErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    delete document.documentElement.dataset.reactTeacherTopbar;
    console.error("Unable to render the React teacher Topbar", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function TeacherLoadingScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3.5 bg-teal-700 text-white">
      <div className="flex size-24 items-center justify-center rounded-full bg-white shadow-lg">
        <img
          className="h-11 w-16 object-contain"
          src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png"
          alt="MECA"
        />
      </div>
      <div className="font-thai text-[15px] font-bold">กำลังโหลดข้อมูล...</div>
    </div>
  );
}

function TeacherRoot() {
  useEffect(() => {
    let topBarRoot;
    import("../../teacher.js")
      .then((controller) => {
        const topBarElement = document.getElementById("teacher-topbar-root");
        if (!topBarElement) return;
        topBarRoot = createRoot(topBarElement);
        topBarRoot.render(
          <TopBarErrorBoundary>
            <LegacyTopBar controller={controller} />
          </TopBarErrorBoundary>,
        );
      })
      .catch((error) => {
        console.error("Unable to start the teacher dashboard", error);
        const app = document.getElementById("app");
        if (!app) return;
        app.replaceChildren();
        const message = document.createElement("div");
        message.className =
          "font-thai flex h-full items-center justify-center bg-slate-100 p-6 text-center font-semibold text-red-700";
        message.textContent = "ไม่สามารถเริ่มระบบผู้สอนได้ กรุณาลองโหลดหน้าใหม่";
        app.appendChild(message);
      });
    return () => topBarRoot?.unmount();
  }, []);

  return (
    <>
      <div id="app" className="h-full overflow-hidden">
        <TeacherLoadingScreen />
      </div>
      <div id="teacher-topbar-root" />
    </>
  );
}

const rootElement = document.getElementById("teacher-root");

if (!rootElement) {
  throw new Error("Missing #teacher-root");
}

createRoot(rootElement).render(<TeacherRoot />);
