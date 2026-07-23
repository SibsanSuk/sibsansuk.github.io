import { useEffect, useRef } from "react";

const STATUS_TABS = [
  ["all", "ทั้งหมด"],
  ["active", "กำลังสอน"],
  ["pending", "รอเริ่ม"],
  ["done", "สิ้นสุดแล้ว"],
];

const classroomStatus = (course) =>
  course.progress == null || course.progress === 0
    ? "pending"
    : course.progress >= 100
      ? "done"
      : "active";

export default function LandingPage({ state, actions }) {
  if (!state.authed) {
    return (
      <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[1.65fr_1fr] lg:p-6">
        <UsageMap state={state} />
        <SignInCard actions={actions} />
      </div>
    );
  }

  const courses =
    state.courseTab === "all"
      ? state.classrooms
      : state.classrooms.filter(
          (course) => classroomStatus(course) === state.courseTab,
        );

  return (
    <main className="h-full overflow-y-auto bg-slate-100 px-4 py-6 sm:px-7 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-thai text-sm font-semibold text-teal-700">
              ยินดีต้อนรับกลับ
            </div>
            <h1 className="font-thai mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {state.teacherName || "ผู้สอน"}
            </h1>
            <p className="font-thai mt-2 text-sm text-slate-500">
              เลือกห้องเรียนเพื่อดูความคืบหน้าและผลการเรียนรู้
            </p>
          </div>
          <button
            type="button"
            onClick={actions.openAdd}
            className="font-thai rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/15 hover:bg-teal-700"
          >
            + เพิ่มห้องเรียน
          </button>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {STATUS_TABS.map(([key, label]) => {
            const count =
              key === "all"
                ? state.classrooms.length
                : state.classrooms.filter(
                    (course) => classroomStatus(course) === key,
                  ).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => actions.setCourseTab(key)}
                className={`font-thai shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${
                  state.courseTab === key
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                }`}
              >
                {label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {courses.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={() => actions.pickCourse(course.id)}
                onRemove={() => actions.askRemoveClass(course.id)}
              />
            ))}
          </div>
        ) : (
          <div className="font-thai mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            ไม่พบห้องเรียนในสถานะนี้
          </div>
        )}
      </section>
    </main>
  );
}

function CourseCard({ course, onOpen, onRemove }) {
  const status = classroomStatus(course);
  const statusLabel =
    status === "done"
      ? "สิ้นสุดแล้ว"
      : status === "active"
        ? "กำลังสอน"
        : "รอเริ่ม";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: course.color || "#0d9488" }}
      />
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="font-thai line-clamp-2 min-h-12 text-base font-extrabold leading-6 text-slate-900">
            {course.title}
          </div>
          <div className="font-thai mt-2 text-xs text-slate-500">
            {course.classCode || "ทุกระดับชั้น"}
          </div>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="นำห้องเรียนออก"
          className="rounded-lg p-2 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          ⋮
        </button>
      </div>
      <button type="button" onClick={onOpen} className="mt-6 block w-full text-left">
        <div className="flex items-center justify-between">
          <span className="font-thai rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
            {statusLabel}
          </span>
          <span className="font-inter text-sm font-bold text-slate-800">
            {course.progress == null ? "—" : `${course.progress}%`}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, course.progress || 0))}%` }}
          />
        </div>
      </button>
    </article>
  );
}

function SignInCard({ actions }) {
  return (
    <section className="font-thai flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-teal-50 text-3xl">
        👩‍🏫
      </div>
      <h1 className="mt-7 text-2xl font-extrabold text-slate-900">
        เข้าสู่ระบบผู้สอน
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
        เข้าสู่ระบบด้วย MECA ID เพื่อดูห้องเรียนและติดตามความก้าวหน้าของผู้เรียน
      </p>
      <button
        type="button"
        onClick={actions.signIn}
        className="mt-8 w-full max-w-sm rounded-full bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-teal-600/20 hover:bg-teal-700"
      >
        เข้าสู่ระบบด้วย MECA ID →
      </button>
    </section>
  );
}

function UsageMap({ state }) {
  const mapElement = useRef(null);

  useEffect(() => {
    if (!mapElement.current || !window.L) return undefined;
    const map = window.L.map(mapElement.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    }).setView([14.4, 101.2], 5.5);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      minZoom: 4,
    }).addTo(map);
    window.L.control.zoom({ position: "bottomright" }).addTo(map);
    (state.landingPoints || []).forEach((point) => {
      const value =
        point.n >= 1000
          ? `${(point.n / 1000).toFixed(point.n < 10000 ? 1 : 0)}k`
          : String(point.n);
      const color = point.pin
        ? "#ef4444"
        : point.n >= 2000
          ? "#ef4444"
          : point.n >= 1000
            ? "#f97316"
            : point.n >= 500
              ? "#f59e0b"
              : "#14b8a6";
      const html = `<div style="width:${point.size || 34}px;height:${point.size || 34}px;border-radius:999px;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font:700 12px Inter;box-shadow:0 3px 10px rgba(0,0,0,.25)">${value}</div>`;
      window.L.marker([point.lat, point.lng], {
        icon: window.L.divIcon({
          html,
          className: "",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(map);
    });
    window.setTimeout(() => map.invalidateSize(), 100);
    return () => map.remove();
  }, [state.landingPoints]);

  const slide = state.landingStats?.[state.mapSlide] || state.landingStats?.[0];

  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-sm">
      <div ref={mapElement} className="absolute inset-0" />
      <div className="absolute left-5 top-5 z-[400] w-[min(290px,calc(100%-2.5rem))] rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur">
        {state.landingLoading ? (
          <div className="font-thai text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            <div className="font-thai text-xs font-bold text-slate-600">
              {slide?.label || "ผู้ใช้งานทั่วประเทศ"}
            </div>
            <div className="mt-2 font-inter text-3xl font-extrabold text-slate-900">
              {(slide?.value ?? state.landingTotals?.users ?? 0).toLocaleString()}
              <span className="font-thai ml-2 text-xs text-slate-400">
                {slide?.unit || "คน"}
              </span>
            </div>
            <p className="font-thai mt-2 text-xs leading-5 text-slate-400">
              {slide?.description || "ข้อมูลการใช้งานระบบ MECA"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
