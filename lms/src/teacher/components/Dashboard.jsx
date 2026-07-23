const PAGE_TABS = [
  ["overview", "ภาพรวม"],
  ["students", "ผู้เรียน"],
  ["tools", "เครื่องมือ"],
  ["map", "เปรียบเทียบ"],
];

export default function Dashboard({ state, actions, dispatchInput, dispatchChange }) {
  const selected = state.classrooms.find(
    (course) => String(course.id) === String(state.course),
  );

  return (
    <main className="flex h-full min-h-0 flex-col bg-slate-100">
      <section className="bg-gradient-to-r from-teal-800 to-teal-600 px-5 py-6 text-white sm:px-8">
        <button
          type="button"
          onClick={actions.switchCourse}
          className="font-thai text-xs font-semibold text-teal-100 hover:text-white"
        >
          ← ห้องเรียนทั้งหมด
        </button>
        <h1 className="font-thai mt-3 max-w-4xl text-xl font-extrabold sm:text-2xl">
          {selected?.title || state.courseTitle}
        </h1>
        <div className="font-thai mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-teal-100">
          <span>{selected?.classCode || "ทุกระดับชั้น"}</span>
          <span>{selected?.school || state.teacherSchool || "—"}</span>
          <span className="font-inter">{state.courseKey}</span>
        </div>
      </section>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-7">
        {PAGE_TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              actions[
                key === "overview"
                  ? "goOverview"
                  : key === "students"
                    ? "goStudents"
                    : key === "tools"
                      ? "goTools"
                      : "goMap"
              ]()
            }
            className={`font-thai shrink-0 border-b-2 px-4 py-3.5 text-sm font-bold ${
              state.page === key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {!state.metrics ? (
          <EmptyState>กำลังเตรียมข้อมูลห้องเรียน...</EmptyState>
        ) : state.page === "overview" ? (
          <Overview state={state} actions={actions} />
        ) : state.page === "students" ? (
          <Students
            state={state}
            actions={actions}
            dispatchInput={dispatchInput}
            dispatchChange={dispatchChange}
          />
        ) : state.page === "tools" ? (
          <Tools state={state} />
        ) : (
          <SchoolComparison />
        )}
      </div>
    </main>
  );
}

function Overview({ state, actions }) {
  const metrics = state.metrics;
  const followups = state.students
    .filter((student) => student.status.key === "followup")
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);
  const cards = [
    ["ผู้เรียนทั้งหมด", state.students.length, "คน", "#0d9488"],
    ["เรียนจบแล้ว", metrics.completed, "คน", "#22c55e"],
    ["ความคืบหน้าเฉลี่ย", Math.round(metrics.avgProgress), "%", "#6366f1"],
    [
      "คะแนนเฉลี่ย",
      metrics.avgRate == null ? "—" : Math.round(metrics.avgRate),
      metrics.avgRate == null ? "" : "%",
      "#f59e0b",
    ],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, unit, color]) => (
          <article
            key={label}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: color }}
            />
            <div className="font-thai text-xs font-semibold text-slate-500">
              {label}
            </div>
            <div className="mt-3 font-inter text-3xl font-extrabold text-slate-900">
              {value}
              <span className="font-thai ml-1 text-xs text-slate-400">{unit}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-thai text-base font-extrabold text-slate-900">
            การกระจายความคืบหน้า
          </h2>
          <div className="mt-5 space-y-4">
            {state.prog.map((bucket) => {
              const width = state.students.length
                ? (bucket.count / state.students.length) * 100
                : 0;
              return (
                <div key={bucket.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-thai font-semibold text-slate-600">
                      {bucket.label}
                    </span>
                    <span className="font-inter font-bold text-slate-800">
                      {bucket.count}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, backgroundColor: bucket.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-thai text-base font-extrabold text-slate-900">
              ผู้เรียนที่ต้องติดตาม
            </h2>
            <button
              type="button"
              onClick={actions.goStudents}
              className="font-thai text-xs font-bold text-teal-700"
            >
              ดูทั้งหมด
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {followups.length ? (
              followups.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => actions.openStudent(student.id)}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"
                >
                  <Avatar student={student} />
                  <span className="min-w-0 flex-1">
                    <span className="font-thai block truncate text-sm font-bold text-slate-800">
                      {student.name}
                    </span>
                    <span className="font-inter block truncate text-[11px] text-slate-400">
                      {student.email}
                    </span>
                  </span>
                  <span className="font-inter text-sm font-extrabold text-orange-600">
                    {student.progress}%
                  </span>
                </button>
              ))
            ) : (
              <div className="font-thai py-10 text-center text-sm text-slate-400">
                ไม่มีผู้เรียนที่ต้องติดตาม
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function Students({ state, actions, dispatchInput, dispatchChange }) {
  const students = decoratedStudents(state);
  const filters = [
    ["all", "ทั้งหมด"],
    ["followup", "ต้องติดตาม"],
    ["learning", "กำลังเรียน"],
    ["done", "เรียนจบ"],
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <input
          type="search"
          value={state.search}
          onChange={(event) => dispatchInput("setSearch", event.target.value)}
          placeholder="ค้นหาชื่อหรืออีเมล"
          className="font-thai w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 lg:w-72"
        />
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => actions.setFilter(key)}
              className={`font-thai shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
                state.filter === key
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={state.sort}
          onChange={(event) => dispatchChange("setSort", event.target.value)}
          className="font-thai rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600"
        >
          <option value="followup">ต้องติดตามก่อน</option>
          <option value="progress">ความคืบหน้าสูงสุด</option>
          <option value="quiz">คะแนนสูงสุด</option>
          <option value="name">เรียงตามชื่อ</option>
        </select>
        <button
          type="button"
          onClick={actions.downloadCsv}
          className="font-thai rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          ดาวน์โหลด CSV
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(240px,1.5fr)_0.7fr_1fr_0.7fr_0.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 font-thai text-xs font-bold text-slate-500 md:grid">
          <span>ผู้เรียน</span>
          <span>ห้อง</span>
          <span>ความคืบหน้า</span>
          <span>คะแนน</span>
          <span>สถานะ</span>
        </div>
        <div className="divide-y divide-slate-100">
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => actions.openStudent(student.id)}
              className="grid w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 md:grid-cols-[minmax(240px,1.5fr)_0.7fr_1fr_0.7fr_0.7fr] md:items-center md:gap-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar student={student} />
                <span className="min-w-0">
                  <span className="font-thai block truncate text-sm font-bold text-slate-800">
                    {student.name}
                  </span>
                  <span className="font-inter block truncate text-[11px] text-slate-400">
                    {student.email}
                  </span>
                </span>
              </span>
              <span className="font-thai text-xs text-slate-500">{student.room}</span>
              <span>
                <span className="flex items-center justify-between font-inter text-xs font-bold text-slate-700">
                  <span className="md:hidden">ความคืบหน้า</span>
                  <span>{student.progress}%</span>
                </span>
                <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${student.progress}%`,
                      backgroundColor: student.progColor,
                    }}
                  />
                </span>
              </span>
              <span className="font-inter text-xs font-bold text-slate-700">
                {student.quizText}
              </span>
              <span
                className="font-thai w-fit rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ color: student.status.color, background: student.status.bg }}
              >
                {student.status.label}
              </span>
            </button>
          ))}
          {!students.length && <EmptyState>ไม่พบผู้เรียน</EmptyState>}
        </div>
      </div>
    </section>
  );
}

function Tools({ state }) {
  const tools = state.tools || {};
  const cards = [
    ["Video", tools.video || 0, "กิจกรรมวิดีโอ", "#7b83eb", "▶"],
    ["BookRoll", tools.bookroll || 0, "กิจกรรมการอ่าน", "#5ab877", "▤"],
    ["Quiz", tools.quiz || 0, "แบบฝึกหัด", "#f59e0b", "?"],
    ["Profile", tools.profile || 0, "กิจกรรมโปรไฟล์", "#12a89b", "◉"],
  ];
  return (
    <section className="mx-auto max-w-7xl">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, count, description, color, icon]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className="flex size-10 items-center justify-center rounded-xl text-lg font-black text-white"
              style={{ backgroundColor: color }}
            >
              {icon}
            </div>
            <div className="mt-4 font-inter text-xl font-extrabold text-slate-900">
              {label}
            </div>
            <div className="font-thai mt-1 text-xs text-slate-400">{description}</div>
            <div className="mt-5 font-inter text-3xl font-extrabold" style={{ color }}>
              {count}
            </div>
          </article>
        ))}
      </div>
      <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 font-thai text-sm font-extrabold text-slate-900">
          เครื่องมือในแต่ละหัวข้อ
        </div>
        <div className="divide-y divide-slate-100">
          {state.activities.map((activity) => (
            <div key={activity.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-48 flex-1">
                <div className="font-thai text-sm font-bold text-slate-800">
                  {activity.name}
                </div>
                <div className="font-inter text-[11px] text-slate-400">
                  {activity.code}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {activity.tools.map((tool) => (
                  <span
                    key={tool.id}
                    className="font-inter rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600"
                  >
                    {tool.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function SchoolComparison() {
  return (
    <section className="mx-auto max-w-7xl">
      <div className="grid gap-4 sm:grid-cols-3">
        {["อันดับของโรงเรียนคุณ", "ความคืบหน้าเทียบโรงเรียนอื่น", "โรงเรียนในเครือข่าย"].map(
          (label) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="font-thai text-xs font-semibold text-slate-500">{label}</div>
              <div className="mt-3 font-inter text-3xl font-extrabold text-slate-900">—</div>
            </article>
          ),
        )}
      </div>
      <EmptyState>ยังไม่มีข้อมูลเปรียบเทียบโรงเรียนจาก API</EmptyState>
    </section>
  );
}

function decoratedStudents(state) {
  let list = [...state.students];
  const query = state.search.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.province.toLowerCase().includes(query),
    );
  }
  if (state.filter !== "all") {
    list = list.filter((student) => student.status.key === state.filter);
  }
  const order = { followup: 0, learning: 1, done: 2 };
  return list.sort((a, b) => {
    if (state.sort === "progress") return b.progress - a.progress;
    if (state.sort === "quiz")
      return (b.rate ?? -1) - (a.rate ?? -1);
    if (state.sort === "name") return a.name.localeCompare(b.name, "th");
    return order[a.status.key] - order[b.status.key] || a.progress - b.progress;
  });
}

export function Avatar({ student }) {
  return (
    <span className="font-thai flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-extrabold text-teal-700">
      {student.initials}
    </span>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="font-thai my-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
