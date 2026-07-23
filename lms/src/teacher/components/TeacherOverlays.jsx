export default function TeacherOverlays({
  state,
  actions,
  dispatchInput,
  dispatchChange,
}) {
  return (
    <>
      {state.student != null && <StudentDrawer state={state} actions={actions} />}
      {state.editOpen && (
        <EditProfileModal
          state={state}
          actions={actions}
          dispatchInput={dispatchInput}
        />
      )}
      {state.addOpen && (
        <AddCourseModal
          state={state}
          actions={actions}
          dispatchInput={dispatchInput}
          dispatchChange={dispatchChange}
        />
      )}
      {state.delTarget && <RemoveCourseModal state={state} actions={actions} />}
      {state.loadingCourse && <LoadingOverlay />}
      {state.authError && (
        <div className="font-thai fixed left-1/2 top-18 z-[1500] flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-white p-4 text-sm font-semibold text-red-700 shadow-2xl">
          <span>⚠️</span>
          <span className="flex-1">{state.authError}</span>
          <button type="button" onClick={actions.closeError} className="size-8 rounded-lg bg-red-50">
            ✕
          </button>
        </div>
      )}
      {state.sessionExpired && (
        <ModalFrame>
          <div className="font-thai p-7 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-orange-50 text-2xl font-black text-orange-700">
              !
            </div>
            <h2 className="mt-5 text-xl font-extrabold text-slate-900">เซสชันหมดอายุ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              กรุณาเข้าสู่ระบบอีกครั้งเพื่อโหลดข้อมูลต่อ
            </p>
            <button
              type="button"
              onClick={actions.relogin}
              className="mt-6 w-full rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white"
            >
              เข้าสู่ระบบอีกครั้ง
            </button>
          </div>
        </ModalFrame>
      )}
    </>
  );
}

function StudentDrawer({ state, actions }) {
  const student = state.students.find(
    (item) => String(item.id) === String(state.student),
  );
  if (!student) return null;
  const detail =
    String(state.studentDetail?.studentId) === String(student.id)
      ? state.studentDetail
      : null;

  return (
    <div className="fixed inset-0 z-[1300] flex justify-end">
      <button
        type="button"
        aria-label="ปิดรายละเอียดผู้เรียน"
        onClick={actions.closeStudent}
        className="absolute inset-0 bg-slate-950/45"
      />
      <aside className="relative h-full w-[min(600px,96vw)] overflow-y-auto bg-slate-100 shadow-2xl">
        <header className="bg-gradient-to-br from-teal-800 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="font-thai text-xs font-semibold text-teal-100">
              รายละเอียดผู้เรียน
            </span>
            <button
              type="button"
              onClick={actions.closeStudent}
              className="size-9 rounded-xl bg-white/15"
            >
              ✕
            </button>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="font-thai flex size-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-extrabold">
              {student.initials}
            </div>
            <div className="min-w-0">
              <h2 className="font-thai truncate text-xl font-extrabold">{student.name}</h2>
              <div className="truncate font-inter text-xs text-teal-100">{student.email}</div>
              <div className="font-thai mt-2 text-xs">{student.room}</div>
            </div>
          </div>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="ความคืบหน้า" value={`${student.progress}%`} />
            <Metric label="คะแนน Quiz" value={student.quizText} />
            <Metric
              label="เวลาทำแบบฝึกหัด"
              value={
                detail?.chatbotLoading
                  ? "กำลังโหลด..."
                  : formatDuration(detail?.chatbotSeconds)
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ProgressSummary
              title="ความคืบหน้าการอ่าน"
              icon="▤"
              loading={detail?.readingLoading}
              summary={detail?.reading}
            />
            <ProgressSummary
              title="ความคืบหน้าวิดีโอ"
              icon="▶"
              loading={detail?.videoLoading}
              summary={detail?.video}
            />
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-thai text-sm font-extrabold text-slate-900">
              หัวข้อการเรียนรู้รายบท
            </h3>
            <div className="mt-3 divide-y divide-slate-100">
              {state.activities.map((activity) => (
                <ActivityProgress key={activity.id} activity={activity} detail={detail} />
              ))}
            </div>
          </article>

          {!!detail?.errors?.length && (
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-thai text-xs font-extrabold text-amber-800">
                รายการที่โหลดไม่สำเร็จ
              </div>
              {detail.errors.map((error) => (
                <div
                  key={error}
                  className="mt-2 break-words font-mono text-[11px] leading-5 text-amber-700"
                >
                  {error}
                </div>
              ))}
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}

function ActivityProgress({ activity, detail }) {
  const tools = activity.tools.map((tool) => {
    const label = String(tool.label || "").toLowerCase();
    const entries =
      label === "video"
        ? detail?.videoEntries
        : label === "bookroll"
          ? detail?.readingEntries
          : null;
    const loading =
      label === "video"
        ? detail?.videoLoading
        : label === "bookroll"
          ? detail?.readingLoading
          : false;
    const entry = findProgress(activity.name, entries);
    return {
      ...tool,
      progress: entry?.progress,
      loading,
      tracked: label === "video" || label === "bookroll",
    };
  });
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-40 flex-1">
        <div className="font-thai text-xs font-bold text-slate-800">{activity.name}</div>
        <div className="font-inter text-[10px] text-slate-400">{activity.code}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {tools.map((tool) => (
          <span
            key={tool.id}
            className="font-inter rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"
          >
            {tool.label}
            {tool.tracked && (
              <span className="ml-1 text-teal-700">
                {tool.loading
                  ? "…"
                  : Number.isFinite(tool.progress)
                    ? `${Math.round(tool.progress)}%`
                    : "—"}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgressSummary({ title, icon, loading, summary }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="font-thai flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <span className="flex size-7 items-center justify-center rounded-lg bg-teal-600 text-xs text-white">
          {icon}
        </span>
        {title}
      </div>
      {loading ? (
        <div className="font-thai mt-5 text-xs text-slate-400">กำลังโหลด...</div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <SummaryValue label="จบแล้ว" value={summary?.done} color="#16a34a" />
          <SummaryValue label="กำลังเรียน" value={summary?.doing} color="#f97316" />
          <SummaryValue label="ยังไม่เริ่ม" value={summary?.todo} color="#94a3b8" />
        </div>
      )}
    </article>
  );
}

function SummaryValue({ label, value, color }) {
  return (
    <div>
      <div className="font-inter text-xl font-extrabold" style={{ color }}>
        {value ?? "—"}
      </div>
      <div className="font-thai mt-1 text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="font-inter text-xl font-extrabold text-slate-900">{value}</div>
      <div className="font-thai mt-1 text-[10px] font-semibold text-slate-400">{label}</div>
    </div>
  );
}

function EditProfileModal({ state, actions, dispatchInput }) {
  return (
    <ModalFrame onBackdrop={actions.closeEdit}>
      <form
        className="font-thai p-6"
        onSubmit={(event) => {
          event.preventDefault();
          actions.saveEdit();
        }}
      >
        <ModalHeader title="แก้ไขข้อมูลผู้สอน" onClose={actions.closeEdit} />
        <label className="mt-5 block text-xs font-bold text-slate-600">ชื่อผู้สอน</label>
        <input
          value={state.teacherName}
          onChange={(event) => dispatchInput("setTeacherName", event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
        />
        <label className="mt-4 block text-xs font-bold text-slate-600">อีเมล</label>
        <input
          readOnly
          value={state.teacherEmail}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400"
        />
        <div className="mt-6 flex justify-end gap-2">
          <SecondaryButton onClick={actions.closeEdit}>ยกเลิก</SecondaryButton>
          <PrimaryButton type="submit">บันทึก</PrimaryButton>
        </div>
      </form>
    </ModalFrame>
  );
}

function RemoveCourseModal({ state, actions }) {
  const course = state.classrooms.find(
    (item) => String(item.id) === String(state.delTarget),
  );
  return (
    <ModalFrame onBackdrop={actions.closeRemove}>
      <div className="font-thai p-6">
        <ModalHeader title="นำห้องเรียนออก" onClose={actions.closeRemove} />
        <p className="mt-5 text-sm leading-6 text-slate-500">
          ต้องการนำ <strong className="text-slate-800">{course?.title || "ห้องเรียนนี้"}</strong>{" "}
          ออกจากรายการหรือไม่
        </p>
        {state.delError && <ErrorBox>{state.delError}</ErrorBox>}
        <div className="mt-6 flex justify-end gap-2">
          <SecondaryButton onClick={actions.closeRemove}>ยกเลิก</SecondaryButton>
          <button
            type="button"
            disabled={state.delSaving}
            onClick={actions.confirmRemove}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {state.delSaving ? "กำลังนำออก..." : "นำออก"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function AddCourseModal({
  state,
  actions,
  dispatchInput,
  dispatchChange,
}) {
  const filters = state.addFilters;
  const option = (value) => (
    <option key={value} value={value}>
      {value}
    </option>
  );
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 p-3">
      <section className="font-thai flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="p-5 pb-0">
          <ModalHeader title="เพิ่มห้องเรียน" onClose={actions.closeAdd} />
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-3">
            <input
              value={state.addInstQuery}
              onChange={(event) => dispatchInput("setAddInst", event.target.value)}
              placeholder="ค้นหาโรงเรียน"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
            />
            {!!state.addInstOptions?.length && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {state.addInstOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => actions.selectAddInst(item.value)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => dispatchChange("setAddFrom", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(event) => dispatchChange("setAddTo", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <select
            value={filters.grade}
            onChange={(event) => dispatchChange("setAddGrade", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="">ทุกระดับ</option>
            {state.addOptions.grades.map(option)}
          </select>
          <select
            value={filters.level}
            onChange={(event) => dispatchChange("setAddLevel", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="">ทุกชั้นปี</option>
            {state.addOptions.levels.map(option)}
          </select>
          <select
            value={filters.classRoom}
            onChange={(event) => dispatchChange("setAddRoom", event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="">ทุกห้อง</option>
            {state.addOptions.classRooms.map(option)}
          </select>
          <button
            type="button"
            onClick={actions.reloadAddCourses}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-teal-700"
          >
            ค้นหา
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-y border-slate-100 bg-slate-50 p-5">
          {state.addLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">กำลังค้นหารายวิชา...</div>
          ) : state.addCourses.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.addCourses.map((course) => (
                <button
                  key={course.courseId}
                  type="button"
                  onClick={() => actions.selectAddCourse(course.courseId)}
                  className={`rounded-2xl border bg-white p-4 text-left ${
                    state.addSel === course.courseId
                      ? "border-teal-500 ring-2 ring-teal-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="text-sm font-bold text-slate-800">{course.courseName}</div>
                  <div className="mt-1 truncate font-inter text-[10px] text-slate-400">
                    {course.courseId}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">
              เลือกโรงเรียนหรือเงื่อนไขเพื่อค้นหารายวิชา
            </div>
          )}
          {state.addError && <ErrorBox>{state.addError}</ErrorBox>}
        </div>

        <div className="flex justify-end gap-2 p-5">
          <SecondaryButton onClick={actions.closeAdd}>ยกเลิก</SecondaryButton>
          <PrimaryButton
            disabled={!state.addSel || state.addSaving}
            onClick={actions.confirmAdd}
          >
            {state.addSaving ? "กำลังบันทึก..." : "เพิ่มห้องเรียน"}
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-100/75 backdrop-blur-sm">
      <div className="font-thai rounded-2xl border border-slate-200 bg-white px-8 py-6 text-sm font-semibold text-slate-600 shadow-2xl">
        กำลังโหลดข้อมูลห้องเรียน...
      </div>
    </div>
  );
}

function ModalFrame({ children, onBackdrop }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/50 p-4">
      {onBackdrop && (
        <button
          type="button"
          aria-label="ปิดหน้าต่าง"
          onClick={onBackdrop}
          className="absolute inset-0 cursor-default"
        />
      )}
      <section className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">
        {children}
      </section>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="flex-1 text-lg font-extrabold text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="size-9 rounded-xl text-slate-400 hover:bg-slate-100"
      >
        ✕
      </button>
    </div>
  );
}

function PrimaryButton({ children, type = "button", ...props }) {
  return (
    <button
      type={type}
      {...props}
      className="rounded-full bg-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600"
    >
      {children}
    </button>
  );
}

function ErrorBox({ children }) {
  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
      {children}
    </div>
  );
}

function findProgress(title, entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const normalized = normalizeTitle(title);
  return (
    entries.find((entry) => normalizeTitle(entry.key || entry.title) === normalized) ||
    entries.find((entry) => {
      const candidate = normalizeTitle(entry.key || entry.title);
      return (
        candidate.length >= 4 &&
        (candidate.includes(normalized) || normalized.includes(candidate))
      );
    }) ||
    null
  );
}

function normalizeTitle(value) {
  return String(value || "")
    .replace(/^\d+(?:[-.]\d+)*(?:\s+|$)/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return "—";
  const minutes = Math.floor(value / 60);
  const rest = Math.round(value % 60);
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")} นาที` : `${rest} วินาที`;
}
