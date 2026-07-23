const { useCallback, useEffect, useMemo, useRef, useState } = React;
const API = window.TeacherAPI;

const cx = (...values) => values.filter(Boolean).join(" ");
const fmtNumber = (value, digits = 0) => new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: digits,
  minimumFractionDigits: digits
}).format(Number(value) || 0);
const todayThai = () => new Date().toLocaleDateString("th-TH", {
  day: "numeric", month: "long", year: "numeric"
});
const greeting = () => {
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 5) return "สวัสดีตอนค่ำ";
  if (hour >= 16) return "สวัสดีตอนเย็น";
  if (hour >= 12) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเช้า";
};
const relativeTime = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ชั่วโมงที่แล้ว`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} วันที่แล้ว`;
  return new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};
const classroomStatus = (course) => course.progress == null || course.progress === 0
  ? "pending"
  : course.progress >= 100 ? "done" : "active";
const gradeText = (course) => {
  const grade = API.gradeLabels[course?.grade] || course?.grade || "";
  return [grade, course?.level].filter((value) => value !== "" && value != null).join(" ").trim() || "ทั้งหมด";
};
const roomText = (course) => course?.classRoom === "" || course?.classRoom == null ? "ทั้งหมด" : course.classRoom;
const formatDuration = (seconds) => {
  if (!Number.isFinite(Number(seconds))) return "—";
  const minutes = Math.floor(Number(seconds) / 60);
  const remain = Math.round(Number(seconds) % 60);
  return minutes ? `${minutes}:${String(remain).padStart(2, "0")} นาที` : `${remain} วินาที`;
};

const ICONS = {
  home: ["M3 11.5 12 4l9 7.5", "M5.5 10v10h13V10", "M9.5 20v-6h5v6"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  plus: ["M12 5v14", "M5 12h14"],
  chevron: ["m6 9 6 6 6-6"],
  calendar: ["M4 5h16v16H4z", "M8 3v4", "M16 3v4", "M4 10h16"],
  lock: ["M6 10h12v11H6z", "M8 10V7a4 4 0 0 1 8 0v3"],
  id: ["M3 5h18v14H3z", "M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4", "M5 16c.5-2 1.6-3 3-3s2.5 1 3 3", "M14 9h4", "M14 13h4"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 14h10l1-14", "M9 7V4h6v3"],
  search: ["m21 21-4.35-4.35", "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  chart: ["M4 19V9", "M10 19V5", "M16 19v-7", "M22 19H2"],
  tools: ["M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.8 2.8-2.1-2.1a4 4 0 0 0 5 5L17 20a2.1 2.1 0 0 0 3-3z"],
  send: ["m22 2-7 20-4-9-9-4z", "M22 2 11 13"],
  school: ["M3 10 12 5l9 5-9 5z", "M6 12v7", "M18 12v7", "M3 21h18"],
  alert: ["M12 9v4", "M12 17h.01", "M10.3 3.7 2 18h20l-8.3-14.3a2 2 0 0 0-3.4 0z"],
  check: ["m5 12 4 4L19 6"]
};

function Icon({ name, size = 20, strokeWidth = 2, className = "" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ width: size, height: size }}>
      {(ICONS[name] || ICONS.home).map((path, index) => <path d={path} key={index} />)}
    </svg>
  );
}

function Spinner({ label = "กำลังโหลด..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm font-semibold text-slate-500">
      <span className="spinner h-6 w-6 rounded-full border-[3px] border-teal-100 border-t-brand-600" />
      {label}
    </div>
  );
}

function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [teacher, setTeacher] = useState({ name: "", email: "", role: "", school: "", instituteId: "" });
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [page, setPage] = useState("overview");
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [overview, setOverview] = useState({ loading: true, slides: [], points: [], trend: [], error: "" });
  const [error, setError] = useState("");
  const [courseTab, setCourseTab] = useState("all");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [leadoOpen, setLeadoOpen] = useState(false);
  const [fontSize, setFontSize] = useState("md");
  const [addOpen, setAddOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const selected = classrooms.find((course) => String(course.id) === String(selectedId)) || null;

  const closeHeaderMenus = () => {
    setProfileOpen(false);
    setNoticeOpen(false);
    setLeadoOpen(false);
  };

  const refreshClassrooms = useCallback(async (sub, instituteId) => {
    const payload = await API.endpoints.classrooms(sub, instituteId);
    const mapped = API.flattenClassrooms(payload);
    setClassrooms(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let live = true;
    API.overview()
      .then((payload) => live && setOverview({
        loading: false,
        slides: Array.isArray(payload.slides) ? payload.slides : [],
        points: Array.isArray(payload.points) ? payload.points : [],
        trend: Array.isArray(payload.trend) ? payload.trend : [],
        totals: payload.totals || {},
        error: ""
      }))
      .catch((cause) => live && setOverview({ loading: false, slides: [], points: [], trend: [], error: cause.message }));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        if (params.get("code")) await API.finishLogin(params.get("code"));
        const auth = API.readAuth();
        const sub = API.authSub(auth);
        if (auth && API.isExpired(auth)) {
          API.clearAuth();
          if (live) setSessionExpired(true);
        }
        if (!auth || !sub || API.isExpired(auth)) {
          if (live) { setAuthed(false); setReady(true); }
          return;
        }
        if (live) setAuthed(true);
        const claims = API.decodeJwt(auth.token?.id_token || auth.token?.access_token || "") || {};
        let user = null;
        let teacherPayload = null;
        const [userResult, teacherResult] = await Promise.allSettled([
          API.endpoints.user(sub),
          API.endpoints.teacher(sub)
        ]);
        if (userResult.status === "fulfilled") user = userResult.value;
        if (teacherResult.status === "fulfilled") teacherPayload = teacherResult.value;
        const institute = teacherPayload?.institute || {};
        const instituteId = institute.instituteId || teacherPayload?.instituteId || API.config.instituteId || "";
        const name = user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : user?.name || teacherPayload?.name || claims.name
            || `${claims.given_name || ""} ${claims.family_name || ""}`.trim();
        const schoolName = institute.instituteName || teacherPayload?.instituteName || "";
        const school = `${schoolName}${institute.province ? ` (${institute.province})` : ""}`;
        const nextTeacher = {
          name: name || "",
          email: user?.email || claims.email || claims.preferred_username || "",
          role: user?.role || teacherPayload?.user?.role || "",
          school,
          instituteId,
          sub
        };
        if (!live) return;
        setTeacher(nextTeacher);
        const mapped = await refreshClassrooms(sub, instituteId);
        if (!live) return;
        if (API.config.assignId) {
          const match = mapped.find((course) => String(course.assignId) === String(API.config.assignId));
          if (match) setTimeout(() => openCourse(match), 0);
        }
      } catch (cause) {
        if (cause.sessionExpired) setSessionExpired(true);
        else setError(`โหลดข้อมูลห้องเรียนไม่สำเร็จ: ${cause.message}`);
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => { live = false; };
  }, []);

  const openCourse = async (course) => {
    if (!course?.courseId) {
      setError("ไม่พบ courseId ของห้องเรียน");
      return;
    }
    setLoadingCourse(true);
    setError("");
    closeHeaderMenus();
    try {
      const [tree, progress, grades] = await Promise.all([
        API.endpoints.courseTree(course.courseId),
        API.endpoints.progress(course.assignId),
        API.endpoints.grades(course.assignId)
      ]);
      setDataset(API.buildDataset(tree, progress, grades, course.title, course.courseId));
      setSelectedId(course.id);
      setPage("overview");
    } catch (cause) {
      if (cause.sessionExpired) setSessionExpired(true);
      else setError(`โหลดข้อมูลห้องเรียนไม่สำเร็จ: ${cause.message}`);
    } finally {
      setLoadingCourse(false);
    }
  };

  const goHome = () => {
    setSelectedId(null);
    setDataset(null);
    setStudent(null);
    setPage("overview");
    closeHeaderMenus();
  };

  const openStudent = async (item) => {
    setStudent(item);
    setStudentDetail({ loading: true });
    try {
      const detail = await API.studentDetails(item, selected, dataset.activities);
      setStudentDetail({ ...detail, loading: false });
    } catch (cause) {
      setStudentDetail({ loading: false, errors: [cause.message] });
    }
  };

  const afterClassroomChange = async () => {
    await refreshClassrooms(teacher.sub, teacher.instituteId);
  };

  const zoom = fontSize === "sm" ? .92 : fontSize === "lg" ? 1.08 : 1;

  if (!ready) {
    return <div className="flex h-dvh items-center justify-center bg-slate-100"><Spinner label="กำลังเตรียม Teacher Dashboard..." /></div>;
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-[#eef1f4]" style={{ zoom }}>
      <Header
        authed={authed}
        teacher={teacher}
        selected={selected}
        profileOpen={profileOpen}
        noticeOpen={noticeOpen}
        leadoOpen={leadoOpen}
        setProfileOpen={(value) => { closeHeaderMenus(); setProfileOpen(value); }}
        setNoticeOpen={(value) => { closeHeaderMenus(); setNoticeOpen(value); }}
        setLeadoOpen={(value) => { closeHeaderMenus(); setLeadoOpen(value); }}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onEditProfile={() => { setProfileOpen(false); setEditProfileOpen(true); }}
        onHome={goHome}
      />

      <div className="h-full pt-[60px]">
        {!selected ? (
          <Landing
            authed={authed}
            teacher={teacher}
            overview={overview}
            classrooms={classrooms}
            courseTab={courseTab}
            setCourseTab={setCourseTab}
            onOpenCourse={openCourse}
            onAdd={() => setAddOpen(true)}
            onRemove={setRemoveTarget}
          />
        ) : (
          <Dashboard
            page={page}
            setPage={setPage}
            selected={selected}
            dataset={dataset}
            onOpenStudent={openStudent}
          />
        )}
      </div>

      {addOpen && <AddClassroomModal teacher={teacher} onClose={() => setAddOpen(false)} onAdded={afterClassroomChange} />}
      {editProfileOpen && <EditProfileModal teacher={teacher} onClose={() => setEditProfileOpen(false)} onSave={(name) => { setTeacher((current) => ({ ...current, name })); setEditProfileOpen(false); }} />}
      {removeTarget && <RemoveModal course={removeTarget} onClose={() => setRemoveTarget(null)} onRemoved={afterClassroomChange} />}
      {student && <StudentDrawer student={student} detail={studentDetail} activities={dataset?.activities || []} onClose={() => setStudent(null)} />}
      {loadingCourse && <LoadingOverlay />}
      {error && <ErrorToast message={error} onClose={() => setError("")} />}
      {sessionExpired && <SessionExpired />}
    </div>
  );
}

function Header({
  authed, teacher, selected, profileOpen, noticeOpen, leadoOpen,
  setProfileOpen, setNoticeOpen, setLeadoOpen, fontSize, setFontSize, onHome, onEditProfile
}) {
  const initials = API.initials(teacher.name);
  return (
    <header className="glass fixed inset-x-0 top-0 z-[1000] flex h-[60px] items-center justify-between border-b border-black/5 px-3 shadow-sm sm:px-[22px]">
      <div className="flex min-w-0 items-center gap-3.5">
        {!selected ? (
          <>
            <button onClick={onHome} className="rounded-lg p-1 transition hover:bg-slate-100" title="หน้าแรก">
              <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png" alt="MECA" className="h-[34px] object-contain" />
            </button>
            <span className="hidden h-6 w-px bg-slate-200 sm:block" />
            <img src="https://www.nectec.or.th/wp-content/uploads/2021/08/cropped-logo.png" alt="NECTEC" className="hidden h-[34px] object-contain sm:block" />
          </>
        ) : (
          <>
            <button onClick={onHome} className="flex items-center gap-2 rounded-[10px] bg-slate-100 px-3.5 py-2 text-sm font-bold text-brand-700 transition hover:bg-slate-200">
              <Icon name="home" size={22} /> <span className="hidden sm:inline">หน้าแรก</span>
            </button>
            <span className="h-7 w-px bg-slate-200" />
            <span className="max-w-[44vw] truncate text-sm font-bold text-slate-800">{selected.title}</span>
          </>
        )}
      </div>

      {authed && (
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button onClick={() => setLeadoOpen(!leadoOpen)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200" title="Leado">
              <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" alt="" className="h-7 w-7 object-contain" />
            </button>
            {leadoOpen && <LeadoPanel onClose={() => setLeadoOpen(false)} />}
          </div>
          <div className="relative">
            <button onClick={() => setNoticeOpen(!noticeOpen)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200" title="การแจ้งเตือน">
              <Icon name="bell" size={23} />
            </button>
            {noticeOpen && <NoticePanel />}
          </div>
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 p-1 pr-2 transition hover:bg-slate-200">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-brand-600 text-sm font-bold text-white">
                {initials}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-[10px]">🇹🇭</span>
              </span>
              <Icon name="chevron" size={16} className="text-slate-400" />
            </button>
            {profileOpen && (
              <ProfileMenu teacher={teacher} fontSize={fontSize} setFontSize={setFontSize} onEdit={onEditProfile} />
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function LeadoPanel({ onClose }) {
  const [message, setMessage] = useState("");
  return (
    <div className="animate-fade-up absolute right-0 top-[54px] z-50 w-[min(308px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-brand-700 to-teal-500 px-4 py-3.5 text-white">
        <img src="https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png" className="h-7 w-7 rounded-full bg-white" alt="" />
        <div className="flex-1"><div className="text-sm font-extrabold">Leado</div><div className="text-[10px] text-teal-100">ผู้ช่วย AI</div></div>
        <button onClick={onClose} className="rounded-lg bg-white/15 p-1.5"><Icon name="close" size={14} /></button>
      </div>
      <div className="bg-teal-50/70 p-4">
        <div className="rounded-2xl rounded-tl bg-white p-3 text-[13px] leading-6 text-slate-700 shadow-sm">
          Leado พร้อมให้บริการ ถามข้อมูลได้ที่นี่นะครับ
        </div>
      </div>
      <div className="flex gap-2 border-t border-slate-100 p-3">
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="พิมพ์คำถามของคุณ..." className="field min-w-0 flex-1 rounded-[10px] border border-slate-200 px-3 py-2 text-[13px]" />
        <button className="flex w-10 items-center justify-center rounded-[10px] bg-brand-600 text-white hover:bg-brand-700"><Icon name="send" size={17} /></button>
      </div>
    </div>
  );
}

function NoticePanel() {
  return (
    <div className="animate-fade-up absolute right-0 top-[54px] z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-float">
      <div className="border-b border-slate-100 px-4 py-3.5 text-sm font-bold">การแจ้งเตือน</div>
      <div className="px-5 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-300"><Icon name="bell" size={22} /></span>
        <div className="mt-3 text-[13px] font-bold text-slate-600">ยังไม่มีการแจ้งเตือน</div>
        <div className="mt-1 text-[11px] text-slate-400">เราจะแจ้งเตือนคุณเมื่อมีความเคลื่อนไหว</div>
      </div>
    </div>
  );
}

function ProfileMenu({ teacher, fontSize, setFontSize, onEdit }) {
  return (
    <div className="animate-fade-up absolute right-0 top-[54px] z-50 w-[236px] overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-float">
      <div className="flex items-center gap-2.5 border-b border-slate-100 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-brand-50 text-sm font-bold text-brand-700">{API.initials(teacher.name)}</span>
        <div className="min-w-0"><div className="truncate text-[13px] font-bold">{teacher.name}</div><div className="truncate font-inter text-[11px] text-slate-400">{teacher.email || "—"}</div></div>
      </div>
      <div className="px-4 pb-3 pt-2.5">
        <div className="mb-1.5 text-[11px] font-bold text-slate-400">ภาษา</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button className="rounded-lg border border-brand-600 bg-brand-50 py-2 text-xs font-semibold text-brand-700">🇹🇭 ไทย</button>
          <button className="rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500">🇬🇧 English</button>
        </div>
        <div className="mb-1.5 mt-3 text-[11px] font-bold text-slate-400">ขนาดตัวอักษร</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[["sm", "text-xs"], ["md", "text-sm"], ["lg", "text-base"]].map(([key, size]) => (
            <button key={key} onClick={() => setFontSize(key)} className={cx("rounded-lg border py-1.5 font-bold", size, fontSize === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500")}>A</button>
          ))}
        </div>
      </div>
      <button onClick={onEdit} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Icon name="edit" size={17} />แก้ไขข้อมูลผู้ใช้</button>
      <button onClick={API.logout} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50"><Icon name="logout" size={17} />ออกจากระบบ</button>
    </div>
  );
}

function Landing({ authed, teacher, overview, classrooms, courseTab, setCourseTab, onOpenCourse, onAdd, onRemove }) {
  return (
    <div className="scrolly flex h-full flex-col bg-[#eef1f4]">
      {authed && (
        <div className="shrink-0 px-4 pb-0 pt-4 sm:px-[22px] sm:pt-[22px]">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {greeting()}{teacher.name ? `, ${teacher.name}` : ""}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Icon name="calendar" size={14} /> วันนี้ {todayThai()}
          </div>
        </div>
      )}
      <div className="grid min-w-0 flex-none grid-cols-1 gap-3.5 p-3.5 sm:gap-[18px] sm:p-[22px] lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]">
        <UsageMap overview={overview} />
        {authed ? (
          <CourseList
            classrooms={classrooms}
            courseTab={courseTab}
            setCourseTab={setCourseTab}
            onOpenCourse={onOpenCourse}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ) : <SignInCard />}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 sm:px-8">
        <strong className="text-xs text-slate-700">ศูนย์เทคโนโลยีอิเล็กทรอนิกส์และคอมพิวเตอร์แห่งชาติ</strong>
        <span className="font-inter">National Electronics and Computer Technology Center: NECTEC</span>
        <span>· 112 ถนนพหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120, Thailand</span>
        <span className="font-inter text-brand-700">· info@nectec.or.th</span>
      </footer>
    </div>
  );
}

function SignInCard() {
  return (
    <section className="flex min-h-[520px] min-w-0 items-center overflow-hidden rounded-[18px] border border-slate-200 bg-white p-6 shadow-panel sm:p-11">
      <div className="mx-auto w-full max-w-[340px]">
        <h1 className="mb-7 text-[26px] font-extrabold text-slate-900">เข้าสู่ระบบผู้สอน</h1>
        <button onClick={API.startLogin} className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-teal-500 to-brand-600 px-5 py-4 text-[15px] font-bold text-white shadow-lg shadow-teal-600/25 transition hover:brightness-105">
          <Icon name="id" size={22} /> เข้าสู่ระบบด้วย MECA ID <span className="font-inter text-lg">→</span>
        </button>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-5 text-slate-500">
          <Icon name="lock" size={16} className="shrink-0 text-slate-400" />
          การเข้าสู่ระบบดำเนินการผ่าน MECA ID อย่างปลอดภัย ระบบไม่เก็บรหัสผ่านของท่าน
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-300"><span className="h-px flex-1 bg-slate-100" />หรือ<span className="h-px flex-1 bg-slate-100" /></div>
        <div className="text-center text-[13px] text-slate-500">
          ยังไม่มีบัญชี MECA ID? <span className="font-bold text-brand-700">ลงทะเบียนที่นี่</span>
        </div>
        <p className="mt-7 text-center text-[11px] leading-5 text-slate-300">
          การเข้าใช้งานถือว่าท่านยอมรับ <span className="text-slate-500">เงื่อนไขการใช้บริการ</span> และ <span className="text-slate-500">นโยบายความเป็นส่วนตัว</span>
        </p>
      </div>
    </section>
  );
}

function UsageMap({ overview }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const [slide, setSlide] = useState(0);
  const slides = overview.slides || [];

  useEffect(() => {
    if (!mapElement.current || mapInstance.current || !window.L) return;
    const map = L.map(mapElement.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false
    }).setView([14.4, 101.2], 5.5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { minZoom: 4, maxZoom: 12 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstance.current = map;
    const resizeObserver = window.ResizeObserver
      ? new ResizeObserver(() => map.invalidateSize({ pan: false }))
      : null;
    resizeObserver?.observe(mapElement.current);
    setTimeout(() => map.invalidateSize(), 150);
    return () => { resizeObserver?.disconnect(); map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    (overview.points || []).forEach((point) => {
      const value = point.n >= 1000 ? `${(point.n / 1000).toFixed(point.n < 10000 ? 1 : 0).replace(".0", "")}k` : point.n;
      const color = point.pin ? "#ef4444" : point.n >= 2000 ? "#ef4444" : point.n >= 1000 ? "#f97316" : point.n >= 500 ? "#f59e0b" : "#14b8a6";
      const size = point.size || 36;
      const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${point.big ? 14 : 11}px Inter;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 ${point.big ? 10 : 6}px ${color}22,0 3px 8px rgba(0,0,0,.2)">${value}</div>`;
      L.marker([point.lat, point.lng], {
        icon: L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        interactive: false
      }).addTo(layer);
    });
    return () => layer.remove();
  }, [overview.points]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setSlide((current) => (current + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[slide];
  const trend = overview.trend || [];
  const trendValues = trend.map((item) => Number(item.users)).filter(Number.isFinite);
  const change = trendValues.length > 1 && trendValues.at(-2)
    ? Math.round((trendValues.at(-1) - trendValues.at(-2)) / trendValues.at(-2) * 100)
    : null;

  return (
    <section className="relative min-h-[480px] min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-[#dfe7ea] shadow-panel">
      {/* Inline positioning is deliberate: Leaflet initializes before Tailwind CDN
          finishes scanning JSX and otherwise replaces the map with position:relative. */}
      <div ref={mapElement} className="absolute inset-0" style={{ position: "absolute", inset: 0 }} />
      <div className="absolute left-3.5 right-3.5 top-3.5 z-[500] overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-4 shadow-float backdrop-blur sm:left-5 sm:right-auto sm:top-5 sm:w-[290px] sm:p-5">
        {overview.loading ? (
          <div className="flex min-h-[126px] items-center justify-center text-xs font-semibold text-slate-500">กำลังโหลดข้อมูลภาพรวม…</div>
        ) : current ? (
          <div className="min-h-[126px]">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-1.5 rounded-full" style={{ background: current.bg }} />
              <span className="text-xs font-bold text-slate-600">{current.label}</span>
            </div>
            <div className="mt-2.5 font-inter text-[29px] font-extrabold leading-tight text-slate-900">
              {current.big} <span className="font-sans text-sm font-bold text-slate-400">{current.unit}</span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">{current.desc}</p>
          </div>
        ) : (
          <div className="min-h-[126px] py-5">
            <div className="text-[13px] font-bold text-slate-700">ไม่มีข้อมูลภาพรวมให้แสดง</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">{overview.error || "ไม่พบข้อมูล"}</p>
          </div>
        )}
        {slides.length > 1 && (
          <div className="mt-2 flex gap-1.5">
            {slides.map((_, index) => <button key={index} onClick={() => setSlide(index)} className={cx("h-1.5 flex-1 rounded-full", index === slide ? "bg-brand-600" : "bg-slate-200")} />)}
          </div>
        )}
        {trendValues.length > 1 && (
          <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2">
            <div><div className="text-[10px] font-semibold text-slate-400">แนวโน้ม 6 เดือน</div><Sparkline values={trendValues} /></div>
            {change != null && <span className={cx("font-inter text-xs font-bold", change >= 0 ? "text-green-600" : "text-red-600")}>{change >= 0 ? "▲" : "▼"} {Math.abs(change)}%</span>}
          </div>
        )}
      </div>
      <button className="absolute bottom-5 right-5 z-[500] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-brand-700 shadow-lg">
        ดูรายละเอียดแผนที่เต็ม <span className="font-inter">↗</span>
      </button>
    </section>
  );
}

function Sparkline({ values }) {
  const width = 140, height = 28;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const points = values.map((value, index) => `${2 + index / (values.length - 1) * (width - 4)},${height - 3 - (value - min) / span * (height - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[140px]">
      <polyline points={points} fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CourseList({ classrooms, courseTab, setCourseTab, onOpenCourse, onAdd, onRemove }) {
  const tabs = [["all", "ทั้งหมด"], ["active", "กำลังสอน"], ["pending", "รอเริ่ม"], ["done", "สิ้นสุดแล้ว"]];
  const counts = { all: classrooms.length, active: 0, pending: 0, done: 0 };
  classrooms.forEach((course) => { counts[classroomStatus(course)] += 1; });
  const courses = courseTab === "all" ? classrooms : classrooms.filter((course) => classroomStatus(course) === courseTab);
  return (
    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-panel">
      <div className="shrink-0 px-4 pt-4 sm:px-[22px] sm:pt-[18px]">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold sm:text-[19px]">ห้องเรียนของฉัน</h2>
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-brand-700">
            <Icon name="plus" size={14} /> เพิ่มห้องเรียน
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setCourseTab(key)} className={cx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold",
              courseTab === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-500"
            )}>
              {label}<span className={cx("rounded-full px-1.5 font-inter text-[10px]", courseTab === key ? "bg-teal-100" : "bg-slate-100 text-slate-400")}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="scrolly flex min-h-0 flex-1 flex-col gap-3 p-4 sm:px-[22px]">
        {courses.length ? courses.map((course) => (
          <CourseCard key={course.id} course={course} onOpen={() => onOpenCourse(course)} onRemove={() => onRemove(course)} />
        )) : (
          <div className="rounded-[14px] border border-dashed border-slate-200 p-9 text-center text-[13px] font-semibold text-slate-400">ยังไม่มีห้องเรียนในสถานะนี้</div>
        )}
      </div>
    </section>
  );
}

function CourseCard({ course, onOpen, onRemove }) {
  const [menu, setMenu] = useState(false);
  const status = classroomStatus(course);
  const started = relativeTime(course.startDate);
  return (
    <article className="card-lift flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
      <button onClick={onOpen} className="w-2 shrink-0" style={{ background: `linear-gradient(${course.color},${course.color}cc)` }} aria-label="เปิดห้องเรียน" />
      <div className="flex min-w-0 flex-1 items-center gap-3.5 p-3.5 pl-4">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="text-sm font-bold leading-5 text-slate-900">{course.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1"><Icon name="users" size={14} />{course.students == null ? "—" : course.students} คน</span>
            {started && <span className="flex items-center gap-1"><Icon name="calendar" size={12} />เริ่มสอนเมื่อ {started}</span>}
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${course.progress || 0}%`, background: course.color }} /></span>
            <span className="w-9 text-right font-inter text-xs font-bold text-slate-600">{course.progress == null ? "—" : `${course.progress}%`}</span>
          </div>
        </button>
        <div className="relative flex shrink-0 flex-col items-end gap-1.5">
          <button onClick={onOpen} className="rounded-lg px-3 py-2 text-[11px] font-bold" style={status === "pending" ? { background: "#eef2ff", color: "#4f46e5" } : { background: course.color, color: "white" }}>
            {status === "pending" ? "เริ่มใช้งาน" : "เปิดห้องเรียน"}
          </button>
          <button onClick={() => setMenu(!menu)} className="rounded-md px-2 font-inter text-lg font-bold leading-none text-slate-300 hover:bg-slate-100 hover:text-slate-500">⋮</button>
          {menu && (
            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-float">
              <button onClick={onRemove} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50"><Icon name="trash" size={16} />นำออกจากรายการ</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Dashboard({ page, setPage, selected, dataset, onOpenStudent }) {
  const nav = [
    ["overview", "chart", "ภาพรวมทั้งห้อง"],
    ["students", "users", "รายชื่อนักเรียน"],
    ["tools", "tools", "การใช้งานเครื่องมือ"]
  ];
  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[220px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3.5 shadow-sm md:flex xl:w-[236px] xl:p-[18px]">
        <div className="px-3 pb-2 pt-0.5 text-[11px] font-bold text-slate-400">เมนูห้องเรียน</div>
        {nav.map(([key, icon, label]) => (
          <button key={key} onClick={() => setPage(key)} className={cx(
            "flex items-center gap-2.5 rounded-[10px] px-3 py-3 text-left text-sm font-semibold transition",
            page === key ? "bg-brand-50 font-bold text-brand-700" : "text-slate-600 hover:bg-slate-50"
          )}>
            <span className={cx("h-[18px] w-1 rounded-full", page === key ? "bg-brand-600" : "bg-transparent")} />
            <Icon name={icon} size={18} /> {label}
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 md:hidden">
          {nav.map(([key, , label]) => (
            <button key={key} onClick={() => setPage(key)} className={cx(
              "whitespace-nowrap border-b-[3px] px-3 py-3.5 text-sm font-bold",
              page === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-400"
            )}>{label}</button>
          ))}
        </nav>
        <main className="scrolly min-h-0 flex-1 p-3.5 pb-14 sm:p-6 lg:p-[26px_34px_60px]">
          <div className="mx-auto max-w-[1180px]">
            {page === "overview" && <OverviewPage selected={selected} dataset={dataset} onOpenStudent={onOpenStudent} />}
            {page === "students" && <StudentsPage selected={selected} dataset={dataset} onOpenStudent={onOpenStudent} />}
            {page === "tools" && <ToolsPage selected={selected} dataset={dataset} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function CourseHero({ selected, title }) {
  const school = selected.school ? `${selected.school}${selected.province ? ` (${selected.province})` : ""}` : "—";
  const chips = [`โรงเรียน: ${school}`, `ระดับชั้น: ${gradeText(selected)}`, `ห้อง: ${roomText(selected)}`];
  return (
    <section className="mb-4 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-teal-500 p-[18px] text-white shadow-lg shadow-teal-800/10 sm:p-6">
      <h1 className="max-w-4xl text-xl font-extrabold leading-tight tracking-tight sm:text-[26px]">{title}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => <span key={chip} className="rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold">{chip}</span>)}
      </div>
    </section>
  );
}

function OverviewPage({ selected, dataset, onOpenStudent }) {
  const { students, metrics } = dataset;
  const total = students.length;
  const attention = [...students].filter((item) => item.status.key === "followup").sort((a, b) => a.progress - b.progress).slice(0, 4);
  const progressBuckets = [
    { label: "100%", color: "#22c55e", count: students.filter((item) => item.progress >= 100).length },
    { label: "75–99%", color: "#14b8a6", count: students.filter((item) => item.progress >= 75 && item.progress < 100).length },
    { label: "50–74%", color: "#f59e0b", count: students.filter((item) => item.progress >= 50 && item.progress < 75).length },
    { label: "1–49%", color: "#fb923c", count: students.filter((item) => item.progress > 0 && item.progress < 50).length },
    { label: "0%", color: "#cbd5e1", count: students.filter((item) => item.progress === 0).length }
  ];
  const quizBuckets = [
    { label: "80–100%", color: "#22c55e", count: students.filter((item) => item.rate >= 80).length },
    { label: "60–79%", color: "#14b8a6", count: students.filter((item) => item.rate >= 60 && item.rate < 80).length },
    { label: "40–59%", color: "#f59e0b", count: students.filter((item) => item.rate >= 40 && item.rate < 60).length },
    { label: "0–39%", color: "#ef4444", count: students.filter((item) => item.rate != null && item.rate < 40).length },
    { label: "ไม่มีคะแนน", color: "#94a3b8", count: students.filter((item) => item.rate == null).length }
  ];
  return (
    <>
      <CourseHero selected={selected} title={dataset.title} />
      <h2 className="mb-4 text-lg font-extrabold text-slate-900">ภาพรวมของทั้งห้องเรียน</h2>
      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <MetricCard color="#12a594" label="ผู้เรียนทั้งหมด" value={fmtNumber(total)} suffix="คน" badge={<Icon name="users" size={18} />} />
        <MetricCard color="#22c55e" label="ความคืบหน้าเฉลี่ย" value={fmtNumber(metrics.avgProgress, 1)} suffix="%" badge="เฉลี่ยทั้งห้อง" />
        <MetricCard color="#6366f1" label="เรียนครบแล้ว" value={fmtNumber(metrics.completed)} suffix={`/ ${total}`} badge={`${total ? Math.round(metrics.completed / total * 100) : 0}%`} />
        <MetricCard color="#f97316" label="คะแนน Quiz เฉลี่ย" value={metrics.avgRate == null ? "—" : fmtNumber(metrics.avgRate, 1)} suffix={metrics.avgRate == null ? "" : "%"} badge={`${metrics.records} records`} />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <DistributionBars data={progressBuckets} />
        <DonutChart data={quizBuckets} total={total} />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h3 className="text-[15px] font-bold">ผู้เรียนที่ควรติดตาม</h3><p className="mt-0.5 text-[11px] text-slate-400">เรียงจากความคืบหน้าน้อยที่สุด</p></div>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">{students.filter((item) => item.status.key === "followup").length} คน</span>
        </div>
        {attention.length ? (
          <div className="divide-y divide-slate-100">
            {attention.map((item) => (
              <button key={item.id} onClick={() => onOpenStudent(item)} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                <Avatar student={item} />
                <div className="min-w-0"><div className="truncate text-[13px] font-bold text-slate-800">{item.name}</div><div className="truncate font-inter text-[11px] text-slate-400">{item.email}</div></div>
                <div className="flex items-center gap-3">
                  <span className="hidden h-2 w-28 overflow-hidden rounded-full bg-slate-100 sm:block"><span className="block h-full rounded-full bg-orange-400" style={{ width: `${item.progress}%` }} /></span>
                  <span className="w-10 text-right font-inter text-xs font-bold text-orange-600">{item.progress}%</span>
                </div>
              </button>
            ))}
          </div>
        ) : <div className="p-8 text-center text-sm font-semibold text-slate-400">ไม่มีผู้เรียนที่ต้องติดตาม</div>}
      </section>
    </>
  );
}

function MetricCard({ color, label, value, suffix, badge }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:p-5">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px]" style={{ color }}>{badge}</span>
      </div>
      <div className="mt-2 font-inter text-[26px] font-extrabold text-slate-900 sm:text-[32px]">
        {value} <span className="font-sans text-xs font-semibold text-slate-400 sm:text-sm">{suffix}</span>
      </div>
    </div>
  );
}

function DistributionBars({ data }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-5"><h3 className="text-[15px] font-bold">การกระจายความคืบหน้า</h3><p className="mt-0.5 text-[11px] text-slate-400">จำนวนผู้เรียนในแต่ละช่วง</p></div>
      <div className="flex h-44 items-end justify-around gap-3 border-b border-slate-200 px-2">
        {data.map((item) => (
          <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1.5 font-inter text-xs font-bold text-slate-600">{item.count}</span>
            <span className="w-full max-w-12 rounded-t-md" style={{ height: `${Math.max(item.count ? 10 : 2, item.count / max * 125)}px`, background: item.color }} />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-around gap-2">{data.map((item) => <span key={item.label} className="flex-1 text-center font-inter text-[10px] text-slate-400">{item.label}</span>)}</div>
    </section>
  );
}

function DonutChart({ data, total }) {
  let accumulated = 0;
  const denominator = data.reduce((sum, item) => sum + item.count, 0) || 1;
  const gradient = data.map((item) => {
    const start = accumulated / denominator * 360;
    accumulated += item.count;
    return `${item.color} ${start}deg ${accumulated / denominator * 360}deg`;
  }).join(",");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
      <div><h3 className="text-[15px] font-bold">ผลคะแนน Quiz</h3><p className="mt-0.5 text-[11px] text-slate-400">สัดส่วนคะแนนรวมของผู้เรียน</p></div>
      <div className="mt-5 flex items-center justify-center gap-7">
        <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <span className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full bg-white"><b className="font-inter text-2xl">{total}</b><small className="text-[10px] text-slate-400">ผู้เรียน</small></span>
        </div>
        <div className="space-y-2">
          {data.map((item) => <div key={item.label} className="flex items-center gap-2 text-[11px] text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="min-w-[62px]">{item.label}</span><b className="font-inter text-slate-700">{item.count}</b></div>)}
        </div>
      </div>
    </section>
  );
}

function Avatar({ student, size = "h-10 w-10" }) {
  return <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700", size)}>{student.initials}</span>;
}

function StudentsPage({ selected, dataset, onOpenStudent }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("followup");
  const rows = useMemo(() => {
    const rank = { followup: 0, learning: 1, done: 2 };
    let output = dataset.students.filter((item) => {
      const query = search.trim().toLowerCase();
      return !query || item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query) || item.province.toLowerCase().includes(query);
    });
    if (filter !== "all") output = output.filter((item) => item.status.key === filter);
    return [...output].sort((a, b) => {
      if (sort === "progress") return b.progress - a.progress;
      if (sort === "quiz") return (b.rate ?? -1) - (a.rate ?? -1);
      if (sort === "name") return a.name.localeCompare(b.name, "th");
      return rank[a.status.key] - rank[b.status.key] || a.progress - b.progress;
    });
  }, [dataset.students, search, filter, sort]);

  const exportCsv = () => {
    const header = ["ชื่อ", "อีเมล", "กลุ่ม", "ความคืบหน้า(%)", "คะแนน", "อัปเดตล่าสุด", "สถานะ"];
    const body = rows.map((item) => [item.name, item.email, item.room, item.progress, item.quizText, item.updated, item.status.label]);
    const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "students.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <CourseHero selected={selected} title={dataset.title} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-extrabold">รายชื่อนักเรียน</h2><p className="mt-0.5 text-xs text-slate-400">ทั้งหมด {dataset.students.length} คน · แสดง {rows.length} คน</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="field flex min-w-[210px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 px-3 py-2 text-slate-400 lg:flex-none">
                <Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล..." className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-slate-700 outline-none" />
              </label>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="field rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                <option value="followup">เรียง: ควรติดตามก่อน</option><option value="progress">ความคืบหน้าสูงสุด</option><option value="quiz">คะแนนสูงสุด</option><option value="name">ชื่อ ก–ฮ</option>
              </select>
              <button onClick={exportCsv} className="flex items-center gap-2 rounded-[10px] border border-slate-200 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"><Icon name="download" size={16} />CSV</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[["all", "ทั้งหมด"], ["followup", "ต้องติดตาม"], ["learning", "กำลังเรียน"], ["done", "เรียนจบ"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} className={cx("rounded-full border px-3 py-1.5 text-[11px] font-bold", filter === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500")}>{label}</button>
            ))}
          </div>
        </div>
        <div className="scrolly">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold text-slate-400">
              <tr><th className="px-5 py-3">ผู้เรียน</th><th className="px-4 py-3">กลุ่ม</th><th className="px-4 py-3">ความคืบหน้า</th><th className="px-4 py-3">คะแนน Quiz</th><th className="px-4 py-3">อัปเดตล่าสุด</th><th className="px-4 py-3">สถานะ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => (
                <tr key={item.id} onClick={() => onOpenStudent(item)} className="cursor-pointer text-[13px] transition hover:bg-slate-50">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar student={item} /><div className="min-w-0"><div className="font-bold text-slate-800">{item.name}</div><div className="font-inter text-[11px] text-slate-400">{item.email}</div></div></div></td>
                  <td className="px-4 py-3 text-slate-500">{item.room}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${item.progress}%`, background: item.progress >= 100 ? "#22c55e" : item.progress >= 60 ? "#14b8a6" : "#fb923c" }} /></span><b className="w-9 font-inter text-xs">{item.progress}%</b></div></td>
                  <td className="px-4 py-3"><b className="font-inter">{item.quizText}</b>{item.rate != null && <span className="ml-1 text-[10px] text-slate-400">({Math.round(item.rate)}%)</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{item.updated}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="p-12 text-center text-sm font-semibold text-slate-400">ไม่พบผู้เรียนตามเงื่อนไข</div>}
        </div>
      </section>
    </>
  );
}

function StatusBadge({ status }) {
  return <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: status.text, background: status.bg }}>{status.label}</span>;
}

const TOOL_COLORS = {
  Video: { bg: "#7b83eb", light: "#eef2ff" },
  BookRoll: { bg: "#5ab877", light: "#ecfdf3" },
  Quiz: { bg: "#f59e0b", light: "#fffbeb" },
  Profile: { bg: "#12a89b", light: "#f0fdfa" }
};

function ToolsPage({ selected, dataset }) {
  return (
    <>
      <CourseHero selected={selected} title={dataset.title} />
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Object.entries(dataset.toolCounts).map(([label, count]) => {
          const colors = TOOL_COLORS[label] || { bg: "#94a3b8", light: "#f8fafc" };
          return <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel"><span className="inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: colors.bg }}>{label}</span><div className="mt-2 font-inter text-3xl font-extrabold">{count}</div><div className="text-[11px] text-slate-400">กิจกรรม</div></div>;
        })}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-extrabold">การใช้งานเครื่องมือ</h2><p className="mt-0.5 text-xs text-slate-400">เครื่องมือที่ใช้ในแต่ละบทเรียนและจำนวนผู้เรียนที่เข้าถึง</p></div>
        <div className="scrolly">
          <table className="w-full min-w-[680px]">
            <thead className="bg-slate-50 text-left text-[11px] font-bold text-slate-400"><tr><th className="px-5 py-3">บทเรียน</th><th className="px-4 py-3">รหัส</th><th className="px-4 py-3">เครื่องมือ</th><th className="px-5 py-3 text-right">ผู้เรียนที่เข้าถึง</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.activities.map((activity) => (
                <tr key={activity.id} className="text-[13px] hover:bg-slate-50">
                  <td className="px-5 py-4 font-bold text-slate-800">{activity.name}</td>
                  <td className="px-4 py-4 font-inter text-xs text-slate-400">{activity.code}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{activity.tools.map((tool) => <ToolBadge key={`${activity.id}-${tool.id}`} label={tool.label} />)}</div></td>
                  <td className="px-5 py-4 text-right font-inter font-bold text-slate-700">{activity.reach == null ? "—" : activity.reach}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dataset.activities.length && <div className="p-12 text-center text-sm font-semibold text-slate-400">ไม่พบเครื่องมือในรายวิชานี้</div>}
        </div>
      </section>
    </>
  );
}

function ToolBadge({ label }) {
  const colors = TOOL_COLORS[label] || { bg: "#94a3b8" };
  return <span className="rounded-md px-2 py-1 text-[10px] font-bold text-white" style={{ background: colors.bg }}>{label}</span>;
}

function StudentDrawer({ student, detail, activities, onClose }) {
  const reading = detail?.reading || {};
  const video = detail?.video || {};
  return (
    <div className="fixed inset-0 z-[1200]">
      <button onClick={onClose} aria-label="ปิด" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" />
      <aside className="animate-fade-up scrolly absolute bottom-0 right-0 top-0 w-full max-w-[620px] bg-[#f7f8fa] shadow-2xl">
        <div className="bg-gradient-to-r from-brand-700 to-teal-500 p-5 text-white sm:p-6">
          <div className="mb-4 flex items-center justify-between"><span className="text-sm font-bold">รายละเอียดผู้เรียน</span><button onClick={onClose} className="rounded-lg bg-white/15 p-2"><Icon name="close" size={15} /></button></div>
          <div className="flex items-center gap-4">
            <Avatar student={student} size="h-[60px] w-[60px] !bg-white/15 !text-xl !text-white" />
            <div className="min-w-0"><h2 className="truncate text-xl font-extrabold">{student.name}</h2><div className="truncate font-inter text-xs text-teal-100">{student.email}</div><div className="mt-2 flex gap-2"><span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold">{student.room}</span><StatusBadge status={student.status} /></div></div>
          </div>
        </div>
        <div className="space-y-3.5 p-4 sm:p-5">
          <div className="grid grid-cols-3 items-center gap-2 rounded-[14px] border border-slate-200 bg-white p-4">
            <ProgressRing value={student.progress} />
            <div className="border-r border-slate-100 text-center"><div className="font-inter text-xl font-extrabold">{student.quizText}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">คะแนน Quiz</div></div>
            <div className="text-center"><div className="text-sm font-extrabold">{detail?.loading ? "…" : formatDuration(detail?.chatbotSeconds)}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">เวลาทำแบบฝึกหัด</div></div>
          </div>
          {detail?.loading ? <div className="rounded-[14px] border border-slate-200 bg-white"><Spinner label="กำลังโหลดข้อมูลเครื่องมือ..." /></div> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProgressSummary label="ความคืบหน้าการอ่าน" color="#5ab877" summary={reading} verbs={["อ่านจบ", "กำลังอ่าน", "ยังไม่ได้อ่าน"]} />
              <ProgressSummary label="ความคืบหน้าวิดีโอ" color="#7b83eb" summary={video} verbs={["ดูจบ", "กำลังดู", "ยังไม่ได้ดู"]} />
            </div>
          )}
          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold">หัวข้อการเรียนรู้รายบท</h3><p className="mt-0.5 text-[11px] text-slate-400">สถานะการเรียนและเครื่องมือที่ใช้ในแต่ละบท</p>
            <div className="mt-3 divide-y divide-slate-100">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: index / Math.max(activities.length, 1) * 100 <= student.progress ? "#22c55e" : "#d0d5dd" }} />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-slate-800">{activity.name}</div><div className="font-inter text-[10px] text-slate-300">{activity.code}</div></div>
                  <div className="flex flex-wrap justify-end gap-1">{activity.tools.map((tool) => <ToolBadge key={tool.id} label={tool.label} />)}</div>
                </div>
              ))}
            </div>
          </div>
          {API.debug && detail?.errors?.length > 0 && <div className="rounded-[14px] border border-red-200 bg-white p-4 text-[11px] text-red-700"><b>ปัญหาการดึงข้อมูล</b>{detail.errors.map((message) => <div key={message} className="mt-1 break-all font-mono">{message}</div>)}</div>}
        </div>
      </aside>
    </div>
  );
}

function ProgressRing({ value }) {
  return (
    <div className="relative mx-auto h-[78px] w-[78px] rounded-full" style={{ background: `conic-gradient(#14b8a6 ${value * 3.6}deg,#e5e7eb 0deg)` }}>
      <span className="absolute inset-[10px] flex items-center justify-center rounded-full bg-white font-inter text-lg font-extrabold text-brand-700">{Math.round(value)}%</span>
    </div>
  );
}

function ProgressSummary({ label, color, summary, verbs }) {
  const rows = [[verbs[0], summary.done, "#22c55e"], [verbs[1], summary.doing, "#f97316"], [verbs[2], summary.todo, "#d0d5dd"]];
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: color }}>▤</span><span className="text-[13px] font-bold">{label}</span></div>
      <div className="space-y-2">{rows.map(([name, value, dot]) => <div key={name} className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: dot }} /><span className="flex-1">{name}</span><b className="font-inter text-slate-700">{value ?? "—"}</b></div>)}</div>
    </div>
  );
}

function ModalShell({ children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-0 sm:p-6">
      <button onClick={onClose} className="absolute inset-0 bg-slate-900/50" aria-label="ปิด" />
      <div className={cx("animate-fade-up relative flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-[18px]", wide ? "sm:max-w-[820px]" : "sm:max-w-[420px]")}>{children}</div>
    </div>
  );
}

function EditProfileModal({ teacher, onClose, onSave }) {
  const [name, setName] = useState(teacher.name || "");
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div><h2 className="text-lg font-extrabold">แก้ไขข้อมูลผู้ใช้</h2><p className="mt-0.5 text-xs text-slate-400">อัปเดตชื่อที่แสดงในระบบ</p></div>
        <button onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon name="close" size={15} /></button>
      </div>
      <div className="p-6">
        <div className="mb-5 flex items-center gap-3.5"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-teal-100 bg-brand-50 text-xl font-extrabold text-brand-700">{API.initials(name)}</span><button type="button" className="rounded-[10px] border border-slate-200 px-3.5 py-2 text-xs font-semibold text-brand-700">เปลี่ยนรูปโปรไฟล์</button></div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">ชื่อที่แสดง</label>
        <input value={name} onChange={(event) => setName(event.target.value)} className="field mb-4 w-full rounded-[11px] border border-slate-200 px-3.5 py-3 text-sm" />
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">อีเมล</label>
        <input value={teacher.email || ""} readOnly className="w-full rounded-[11px] border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-400" />
      </div>
      <div className="flex justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600">ยกเลิก</button>
        <button onClick={() => onSave(name.trim() || teacher.name)} className="rounded-full bg-brand-600 px-6 py-2.5 text-[13px] font-bold text-white">บันทึก</button>
      </div>
    </ModalShell>
  );
}

function AddClassroomModal({ teacher, onClose, onAdded }) {
  const isStaff = ["staff", "admin"].includes(teacher.role);
  const [filters, setFilters] = useState({
    instituteId: teacher.instituteId || "",
    grade: "", level: "", classRoom: "", from: "", to: ""
  });
  const [schoolQuery, setSchoolQuery] = useState(teacher.school || "");
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef(null);

  const loadCourses = useCallback(async (nextFilters) => {
    if (!nextFilters.instituteId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = {
        instituteId: nextFilters.instituteId,
        ...(nextFilters.grade ? { grade: nextFilters.grade } : {}),
        ...(nextFilters.level ? { level: nextFilters.level } : {}),
        ...(nextFilters.classRoom ? { classRoom: nextFilters.classRoom } : {}),
        ...(nextFilters.from && nextFilters.to ? { createDate: `${nextFilters.from},${nextFilters.to}` } : {})
      };
      const payload = await API.endpoints.courses(query);
      setCourses(API.list(payload).map((course) => ({
        courseId: course.courseId || course.course_id || "",
        name: course.courseName || course.courseTitle || course.title || course.courseId || "",
        enrolls: Array.isArray(course.enrolls) ? course.enrolls : []
      })));
    } catch (cause) {
      setError(`โหลดรายวิชาไม่สำเร็จ: ${cause.message}`);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCourses(filters); }, []);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setSelectedCourse("");
    loadCourses(next);
  };
  const searchInstitute = (value) => {
    setSchoolQuery(value);
    setFilters((current) => ({ ...current, instituteId: "" }));
    clearTimeout(searchTimer.current);
    if (!value.trim()) { setInstitutes([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const payload = await API.endpoints.institutes(value.trim());
        setInstitutes(API.list(payload).map((item) => ({
          id: item.instituteId || item.institute_id || "",
          label: `${item.instituteName || item.name || ""}${item.district ? ` (${item.district}${item.province ? `, ${item.province}` : ""})` : ""}`
        })));
      } catch (_) { setInstitutes([]); }
    }, 450);
  };
  const chooseInstitute = (item) => {
    setSchoolQuery(item.label);
    setInstitutes([]);
    const next = { ...filters, instituteId: item.id };
    setFilters(next);
    loadCourses(next);
  };
  const save = async () => {
    if (!selectedCourse || saving) return;
    setSaving(true);
    setError("");
    try {
      await API.endpoints.createAssignment({
        userId: teacher.sub,
        teacherId: teacher.sub,
        courseId: selectedCourse,
        instituteId: filters.instituteId || teacher.instituteId,
        grade: filters.grade || undefined,
        level: filters.level ? Number(filters.level) : undefined,
        classRoom: filters.classRoom || undefined,
        startDate: filters.from || undefined,
        endDate: filters.to || undefined
      });
      await onAdded();
      onClose();
    } catch (cause) {
      setError(`เพิ่มห้องเรียนไม่สำเร็จ: ${cause.message}`);
    } finally {
      setSaving(false);
    }
  };

  const enrollmentRows = courses.flatMap((course) => course.enrolls || []);
  const unique = (key) => [...new Set(enrollmentRows.map((item) => item[key]).filter((value) => value !== "" && value != null))];
  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
        <h2 className="text-xl font-extrabold">เพิ่มห้องเรียน</h2>
        <button onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon name="close" size={15} /></button>
      </div>
      <div className="shrink-0 space-y-3 px-6 pb-2 pt-4">
        <div className="flex items-center gap-3">
          <label className="shrink-0 text-[13px] font-bold text-slate-700"><span className="text-red-500">*</span> โรงเรียน:</label>
          <div className="relative min-w-0 flex-1">
            <input value={schoolQuery} onChange={(event) => isStaff && searchInstitute(event.target.value)} readOnly={!isStaff} placeholder="ค้นหาชื่อโรงเรียน..." className={cx("field w-full rounded-[10px] border border-slate-200 px-3 py-2.5 text-[13px]", !isStaff && "bg-slate-50 text-slate-500")} />
            {institutes.length > 0 && <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-[10px] border border-slate-200 bg-white shadow-float">{institutes.map((item) => <button key={item.id} onClick={() => chooseInstitute(item)} className="block w-full border-b border-slate-50 px-3 py-2.5 text-left text-[13px] hover:bg-slate-50">{item.label}</button>)}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="field rounded-[10px] border border-slate-200 px-2.5 py-2 text-xs" />
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="field rounded-[10px] border border-slate-200 px-2.5 py-2 text-xs" />
          <FilterSelect value={filters.grade} onChange={(value) => updateFilter("grade", value)} placeholder="ระดับชั้น" options={unique("grade")} labels={API.gradeLabels} />
          <FilterSelect value={filters.level} onChange={(value) => updateFilter("level", value)} placeholder="ชั้นปี" options={unique("level")} />
          <FilterSelect value={filters.classRoom} onChange={(value) => updateFilter("classRoom", value)} placeholder="ห้องเรียน" options={unique("classRoom")} />
        </div>
      </div>
      <div className="scrolly flex min-h-[280px] flex-1 flex-col gap-2.5 px-6 py-3">
        {loading ? <Spinner label="กำลังโหลดรายวิชา..." /> : error ? <div className="p-10 text-center text-sm font-semibold text-red-600">{error}</div> : courses.length ? courses.map((course) => (
          <button key={course.courseId} onClick={() => setSelectedCourse(selectedCourse === course.courseId ? "" : course.courseId)} className={cx(
            "card-lift flex items-center gap-3 rounded-[13px] border p-4 text-left",
            selectedCourse === course.courseId ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"
          )}>
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{course.name}</span>
            <span className={cx("flex h-6 w-6 items-center justify-center rounded-full border", selectedCourse === course.courseId ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-slate-50 text-slate-300")}><Icon name="check" size={13} strokeWidth={3} /></span>
          </button>
        )) : <div className="p-10 text-center text-sm font-semibold text-slate-400">{isStaff && !filters.instituteId ? "เลือกโรงเรียนเพื่อดูรายวิชา" : "ไม่พบรายวิชาตามเงื่อนไข"}</div>}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
        {selectedCourse && <span className="mr-auto text-xs font-semibold text-brand-700">เลือกแล้ว 1 รายวิชา</span>}
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600">ยกเลิก</button>
        <button onClick={save} disabled={!selectedCourse || saving} className="rounded-full bg-brand-600 px-6 py-2.5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-teal-200">{saving ? "กำลังบันทึก..." : "เพิ่มห้องเรียน"}</button>
      </div>
    </ModalShell>
  );
}

function FilterSelect({ value, onChange, placeholder, options, labels = {} }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="field min-w-0 rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600"><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}</select>;
}

function RemoveModal({ course, onClose, onRemoved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    if (!course.assignId || saving) {
      if (!course.assignId) setError("ห้องเรียนนี้ไม่มี assignId จึงนำออกไม่ได้");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await API.endpoints.deleteAssignment(course.assignId);
      await onRemoved();
      onClose();
    } catch (cause) {
      setError(`นำห้องเรียนออกไม่สำเร็จ: ${cause.message}`);
    } finally { setSaving(false); }
  };
  return (
    <ModalShell onClose={saving ? undefined : onClose}>
      <div className="flex gap-3.5 p-6 pb-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon name="alert" size={22} /></span>
        <div><h2 className="text-base font-extrabold">นำห้องเรียนออกจากรายการ</h2><p className="mt-1.5 text-xs leading-5 text-slate-500">ห้องเรียน <b className="text-slate-700">{course.title}</b> จะถูกนำออกจากรายการของคุณ</p></div>
      </div>
      {error && <div className="mx-6 mb-3 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
      <div className="flex justify-end gap-2.5 border-t border-slate-100 px-6 py-4">
        <button onClick={onClose} disabled={saving} className="rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600">ยกเลิก</button>
        <button onClick={remove} disabled={saving} className="rounded-full bg-red-600 px-6 py-2.5 text-[13px] font-bold text-white disabled:bg-red-300">{saving ? "กำลังนำออก..." : "นำออก"}</button>
      </div>
    </ModalShell>
  );
}

function LoadingOverlay() {
  return <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-100/70 backdrop-blur-sm"><div className="rounded-2xl border border-slate-200 bg-white px-9 py-6 shadow-float"><Spinner label="กำลังโหลดข้อมูลห้องเรียน..." /></div></div>;
}

function ErrorToast({ message, onClose }) {
  return (
    <div className="fixed left-1/2 top-[70px] z-[1500] flex w-[min(520px,calc(100vw-24px))] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-white px-4 py-3 shadow-float">
      <span>⚠️</span><span className="flex-1 text-xs font-semibold leading-5 text-red-700">{message}</span><button onClick={onClose} className="rounded-lg bg-red-50 p-1.5 text-red-700"><Icon name="close" size={13} /></button>
    </div>
  );
}

function SessionExpired() {
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[18px] bg-white p-7 text-center shadow-2xl">
        <span className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-orange-50 text-2xl font-extrabold text-orange-700">!</span>
        <h2 className="mt-4 text-xl font-extrabold">เซสชันหมดอายุ</h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">เพื่อความปลอดภัย ระบบได้ออกจากระบบแล้ว กรุณาเข้าสู่ระบบอีกครั้งเพื่อโหลดข้อมูลต่อ</p>
        <button onClick={API.startLogin} className="mt-5 w-full rounded-full bg-gradient-to-r from-teal-500 to-brand-600 px-5 py-3 text-sm font-bold text-white">เข้าสู่ระบบอีกครั้ง</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
