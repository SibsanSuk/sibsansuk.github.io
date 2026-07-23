export default function TopBar({ state, actions }) {
  const selected = state.classrooms.find(
    (course) => String(course.id) === String(state.course),
  );
  const initials = (state.teacherName || "T").replace(/\s/g, "").slice(0, 2);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-15 items-center border-b border-slate-200 bg-white px-4 shadow-sm sm:px-7">
        <button
          type="button"
          onClick={state.course ? actions.switchCourse : undefined}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-lg font-black text-white">
            M
          </span>
          <span className="hidden font-inter text-sm font-extrabold tracking-wide text-slate-800 sm:block">
            MECA
          </span>
          {selected && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-thai max-w-[42vw] truncate text-sm font-bold text-slate-700">
                {selected.title}
              </span>
            </>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {state.authed && (
            <>
              <button
                type="button"
                onClick={actions.toggleLeado}
                className="hidden rounded-full border border-slate-200 px-3 py-2 font-thai text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:block"
              >
                ผู้ช่วยสอน
              </button>
              <button
                type="button"
                onClick={actions.toggleNotif}
                aria-label="การแจ้งเตือน"
                className="flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                🔔
              </button>
              <button
                type="button"
                onClick={actions.toggleUserMenu}
                className="font-thai flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 text-xs font-bold text-slate-700"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-teal-600 text-white">
                  {initials}
                </span>
                <span className="hidden max-w-36 truncate sm:block">
                  {state.teacherName || "ผู้สอน"}
                </span>
              </button>
            </>
          )}
        </div>
      </header>

      {state.userMenuOpen && (
        <>
          <button
            type="button"
            aria-label="ปิดเมนู"
            className="fixed inset-0 z-40 cursor-default"
            onClick={actions.closeUserMenu}
          />
          <div className="fixed right-4 top-16 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:right-7">
            <div className="border-b border-slate-100 p-3">
              <div className="font-thai truncate text-sm font-bold text-slate-900">
                {state.teacherName || "ผู้สอน"}
              </div>
              <div className="mt-1 truncate font-inter text-xs text-slate-400">
                {state.teacherEmail || "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={actions.openEdit}
              className="font-thai mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              แก้ไขข้อมูลผู้สอน
            </button>
            <button
              type="button"
              onClick={actions.signOut}
              className="font-thai w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              ออกจากระบบ
            </button>
          </div>
        </>
      )}

      {state.notifOpen && (
        <FloatingPanel title="การแจ้งเตือน" onClose={actions.closeNotif}>
          ยังไม่มีการแจ้งเตือนใหม่
        </FloatingPanel>
      )}

      {state.leadoOpen && (
        <FloatingPanel title="ผู้ช่วยสอน" onClose={actions.closeLeado}>
          สอบถามข้อมูลการเรียนรู้และห้องเรียนได้จากส่วนนี้
        </FloatingPanel>
      )}
    </>
  );
}

function FloatingPanel({ title, children, onClose }) {
  return (
    <>
      <button
        type="button"
        aria-label="ปิดแผง"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div className="fixed right-4 top-16 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:right-7">
        <div className="flex items-center gap-3">
          <div className="font-thai flex-1 text-base font-extrabold text-slate-900">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="font-thai mt-4 text-sm leading-6 text-slate-500">
          {children}
        </div>
      </div>
    </>
  );
}
