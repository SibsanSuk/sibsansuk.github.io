import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import TeacherOverlays from "./components/TeacherOverlays";
import TopBar from "./components/TopBar";
import useTeacherState from "./useTeacherState";

export default function TeacherApp({ controller }) {
  const state = useTeacherState(controller);
  const actions = controller.getTeacherActions();
  const dispatchInput = controller.dispatchTeacherInput;
  const dispatchChange = controller.dispatchTeacherChange;

  if (!state.ready) {
    return (
      <div className="font-thai flex h-full flex-col items-center justify-center gap-4 bg-teal-700 text-white">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-white text-3xl font-black text-teal-700 shadow-xl">
          M
        </div>
        <div className="text-sm font-bold">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-slate-100">
      <TopBar state={state} actions={actions} />
      <div className="h-full pt-15">
        {state.course ? (
          <Dashboard
            state={state}
            actions={actions}
            dispatchInput={dispatchInput}
            dispatchChange={dispatchChange}
          />
        ) : (
          <LandingPage state={state} actions={actions} />
        )}
      </div>
      <TeacherOverlays
        state={state}
        actions={actions}
        dispatchInput={dispatchInput}
        dispatchChange={dispatchChange}
      />
    </div>
  );
}
