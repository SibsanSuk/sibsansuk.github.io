/* MECA Teacher Dashboard — canonical no-build React JavaScript. */
const {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} = React;
const API = window.TeacherAPI;
const cx = (...values) => values.filter(Boolean).join(" ");
const fmtNumber = (value, digits = 0) => new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: digits,
  minimumFractionDigits: digits
}).format(Number(value) || 0);
const todayThai = () => new Date().toLocaleDateString("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric"
});
const greeting = () => {
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 5) return "สวัสดีตอนค่ำ";
  if (hour >= 16) return "สวัสดีตอนเย็น";
  if (hour >= 12) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเช้า";
};
const relativeTime = value => {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ชั่วโมงที่แล้ว`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} วันที่แล้ว`;
  return new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short"
  });
};
const classroomStatus = course => course.progress == null || course.progress === 0 ? "pending" : course.progress >= 100 ? "done" : "active";
const gradeText = course => {
  const grade = API.gradeLabels[course?.grade] || course?.grade || "";
  return [grade, course?.level].filter(value => value !== "" && value != null).join(" ").trim() || "ทั้งหมด";
};
const roomText = course => course?.classRoom === "" || course?.classRoom == null ? "ทั้งหมด" : course.classRoom;
const formatDuration = seconds => {
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
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className = ""
}) {
  return React.createElement("svg", {
    "aria-hidden": "true",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      width: size,
      height: size
    }
  }, (ICONS[name] || ICONS.home).map((path, index) => React.createElement("path", {
    d: path,
    key: index
  })));
}
function Spinner({
  label = "กำลังโหลด..."
}) {
  return React.createElement("div", {
    className: "flex items-center justify-center gap-3 py-10 text-sm font-semibold text-slate-500"
  }, React.createElement("span", {
    className: "spinner h-6 w-6 rounded-full border-[3px] border-teal-100 border-t-brand-600"
  }), label);
}
function EChart({
  option,
  className = "h-52 w-full",
  ariaLabel = "กราฟข้อมูล"
}) {
  const elementRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!elementRef.current || !window.echarts) return undefined;
    const chart = window.echarts.init(elementRef.current, null, {
      renderer: "svg"
    });
    chartRef.current = chart;
    const resize = () => chart.resize();
    const resizeObserver = window.ResizeObserver ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(elementRef.current);
    window.addEventListener("resize", resize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);
  useEffect(() => {
    chartRef.current?.setOption(option, {
      notMerge: true,
      lazyUpdate: false
    });
  }, [option]);
  if (!window.echarts) {
    return React.createElement("div", {
      className: cx(className, "flex items-center justify-center text-xs font-semibold text-slate-400")
    }, "ไม่สามารถโหลดกราฟได้");
  }
  return React.createElement("div", {
    ref: elementRef,
    className,
    role: "img",
    "aria-label": ariaLabel
  });
}
class DrawerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  componentDidCatch(error, info) {
    console.error("Student drawer error:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return React.createElement("div", {
      className: "fixed inset-0 z-[1200]"
    }, React.createElement("button", {
      onClick: this.props.onClose,
      "aria-label": "ปิด",
      className: "absolute inset-0 bg-slate-900/40"
    }), React.createElement("aside", {
      className: "absolute bottom-0 right-0 top-0 flex w-full max-w-[620px] items-center justify-center bg-[#f7f8fa] p-6 shadow-2xl"
    }, React.createElement("div", {
      className: "w-full rounded-[16px] border border-amber-200 bg-white p-6 text-center"
    }, React.createElement("div", {
      className: "mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600"
    }, React.createElement(Icon, {
      name: "alert",
      size: 21
    })), React.createElement("h2", {
      className: "text-base font-extrabold text-slate-800"
    }, "แสดงรายละเอียดผู้เรียนไม่สำเร็จ"), React.createElement("p", {
      className: "mt-2 text-xs leading-6 text-slate-500"
    }, "ข้อมูลบางรายการมีรูปแบบไม่สมบูรณ์ กรุณาปิดหน้าต่างแล้วลองอีกครั้ง"), React.createElement("button", {
      onClick: this.props.onClose,
      className: "mt-5 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white"
    }, "ปิดหน้าต่าง"))));
  }
}
function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [teacher, setTeacher] = useState({
    name: "",
    email: "",
    role: "",
    school: "",
    instituteId: ""
  });
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [page, setPage] = useState("overview");
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [overview, setOverview] = useState({
    loading: true,
    slides: [],
    points: [],
    trend: [],
    error: ""
  });
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
  const studentRequestRef = useRef(0);
  const selected = classrooms.find(course => String(course.id) === String(selectedId)) || null;
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
    API.overview().then(payload => live && setOverview({
      loading: false,
      slides: Array.isArray(payload.slides) ? payload.slides : [],
      points: Array.isArray(payload.points) ? payload.points : [],
      trend: Array.isArray(payload.trend) ? payload.trend : [],
      totals: payload.totals || {},
      error: ""
    })).catch(cause => live && setOverview({
      loading: false,
      slides: [],
      points: [],
      trend: [],
      error: cause.message
    }));
    return () => {
      live = false;
    };
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
          if (live) {
            setAuthed(false);
            setReady(true);
          }
          return;
        }
        if (live) setAuthed(true);
        const claims = API.decodeJwt(auth.token?.id_token || auth.token?.access_token || "") || {};
        let user = null;
        let teacherPayload = null;
        const [userResult, teacherResult] = await Promise.allSettled([API.endpoints.user(sub), API.endpoints.teacher(sub)]);
        if (userResult.status === "fulfilled") user = userResult.value;
        if (teacherResult.status === "fulfilled") teacherPayload = teacherResult.value;
        const institute = teacherPayload?.institute || {};
        const instituteId = institute.instituteId || teacherPayload?.instituteId || API.config.instituteId || "";
        const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.name || teacherPayload?.name || claims.name || `${claims.given_name || ""} ${claims.family_name || ""}`.trim();
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
          const match = mapped.find(course => String(course.assignId) === String(API.config.assignId));
          if (match) setTimeout(() => openCourse(match), 0);
        }
      } catch (cause) {
        if (cause.sessionExpired) setSessionExpired(true);else setError(`โหลดข้อมูลห้องเรียนไม่สำเร็จ: ${cause.message}`);
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const openCourse = async course => {
    if (!course?.courseId) {
      setError("ไม่พบ courseId ของห้องเรียน");
      return;
    }
    setLoadingCourse(true);
    setError("");
    closeHeaderMenus();
    try {
      const [tree, progress, grades] = await Promise.all([API.endpoints.courseTree(course.courseId), API.endpoints.progress(course.assignId), API.endpoints.grades(course.assignId)]);
      setDataset(API.buildDataset(tree, progress, grades, course.title, course.courseId));
      setSelectedId(course.id);
      setPage("overview");
    } catch (cause) {
      if (cause.sessionExpired) setSessionExpired(true);else setError(`โหลดข้อมูลห้องเรียนไม่สำเร็จ: ${cause.message}`);
    } finally {
      setLoadingCourse(false);
    }
  };
  const goHome = () => {
    studentRequestRef.current += 1;
    setSelectedId(null);
    setDataset(null);
    setStudent(null);
    setStudentDetail(null);
    setPage("overview");
    closeHeaderMenus();
  };
  const closeStudent = () => {
    studentRequestRef.current += 1;
    setStudent(null);
    setStudentDetail(null);
  };
  const openStudent = async item => {
    const requestId = studentRequestRef.current + 1;
    studentRequestRef.current = requestId;
    setStudent(item);
    setStudentDetail({
      studentId: item?.id,
      loading: true,
      readingLoading: true,
      videoLoading: true,
      chatbotLoading: true,
      reading: null,
      video: null,
      readingEntries: [],
      videoEntries: [],
      chatbotSeconds: null,
      errors: []
    });
    try {
      const detail = await API.studentDetails(item, selected, dataset?.activities || [], patch => {
        if (studentRequestRef.current !== requestId) return;
        setStudentDetail(current => ({
          ...current,
          ...patch
        }));
      });
      if (studentRequestRef.current !== requestId) return;
      setStudentDetail({
        ...detail,
        loading: false
      });
    } catch (cause) {
      if (studentRequestRef.current !== requestId) return;
      setStudentDetail({
        loading: false,
        readingLoading: false,
        videoLoading: false,
        chatbotLoading: false,
        errors: [cause.message]
      });
    }
  };
  const afterClassroomChange = async () => {
    await refreshClassrooms(teacher.sub, teacher.instituteId);
  };
  if (!ready) {
    return React.createElement("div", {
      className: "flex h-dvh items-center justify-center bg-slate-100"
    }, React.createElement(Spinner, {
      label: "กำลังเตรียม Teacher Dashboard..."
    }));
  }
  return React.createElement("div", {
    className: cx("font-size-shell h-dvh w-full overflow-hidden bg-[#eef1f4]", `font-size-${fontSize}`)
  }, React.createElement(Header, {
    authed: authed,
    teacher: teacher,
    selected: selected,
    profileOpen: profileOpen,
    noticeOpen: noticeOpen,
    leadoOpen: leadoOpen,
    setProfileOpen: value => {
      closeHeaderMenus();
      setProfileOpen(value);
    },
    setNoticeOpen: value => {
      closeHeaderMenus();
      setNoticeOpen(value);
    },
    setLeadoOpen: value => {
      closeHeaderMenus();
      setLeadoOpen(value);
    },
    fontSize: fontSize,
    setFontSize: setFontSize,
    onEditProfile: () => {
      setProfileOpen(false);
      setEditProfileOpen(true);
    },
    onHome: goHome
  }), React.createElement("div", {
    className: "h-full pt-[60px]"
  }, !selected ? React.createElement(Landing, {
    authed: authed,
    teacher: teacher,
    overview: overview,
    classrooms: classrooms,
    courseTab: courseTab,
    setCourseTab: setCourseTab,
    onOpenCourse: openCourse,
    onAdd: () => setAddOpen(true),
    onRemove: setRemoveTarget
  }) : React.createElement(Dashboard, {
    page: page,
    setPage: setPage,
    selected: selected,
    dataset: dataset,
    onOpenStudent: openStudent
  })), addOpen && React.createElement(AddClassroomModal, {
    teacher: teacher,
    onClose: () => setAddOpen(false),
    onAdded: afterClassroomChange
  }), editProfileOpen && React.createElement(EditProfileModal, {
    teacher: teacher,
    onClose: () => setEditProfileOpen(false),
    onSave: name => {
      setTeacher(current => ({
        ...current,
        name
      }));
      setEditProfileOpen(false);
    }
  }), removeTarget && React.createElement(RemoveModal, {
    course: removeTarget,
    onClose: () => setRemoveTarget(null),
    onRemoved: afterClassroomChange
  }), student && React.createElement(DrawerErrorBoundary, {
    key: student.id || student.email || "student-drawer",
    onClose: closeStudent
  }, React.createElement(StudentDrawer, {
    student: student,
    detail: studentDetail,
    activities: dataset?.activities || [],
    onClose: closeStudent
  })), loadingCourse && React.createElement(LoadingOverlay, null), error && React.createElement(ErrorToast, {
    message: error,
    onClose: () => setError("")
  }), sessionExpired && React.createElement(SessionExpired, null));
}
function Header({
  authed,
  teacher,
  selected,
  profileOpen,
  noticeOpen,
  leadoOpen,
  setProfileOpen,
  setNoticeOpen,
  setLeadoOpen,
  fontSize,
  setFontSize,
  onHome,
  onEditProfile
}) {
  const initials = API.initials(teacher.name);
  return React.createElement("header", {
    className: "glass fixed inset-x-0 top-0 z-[1000] flex h-[60px] items-center justify-between border-b border-black/5 px-3 shadow-sm sm:px-[22px]"
  }, React.createElement("div", {
    className: "flex min-w-0 items-center gap-3.5"
  }, !selected ? React.createElement(React.Fragment, null, React.createElement("button", {
    onClick: onHome,
    className: "rounded-lg p-1 transition hover:bg-slate-100",
    title: "หน้าแรก"
  }, React.createElement("img", {
    src: "https://lms.mooc.meca.in.th/static/sbs-themes/images/logo-adap-green-untext.1c98bf032947.png",
    alt: "MECA",
    className: "h-[34px] object-contain"
  })), React.createElement("span", {
    className: "hidden h-6 w-px bg-slate-200 sm:block"
  }), React.createElement("img", {
    src: "https://www.nectec.or.th/wp-content/uploads/2021/08/cropped-logo.png",
    alt: "NECTEC",
    className: "hidden h-[34px] object-contain sm:block"
  })) : React.createElement(React.Fragment, null, React.createElement("button", {
    onClick: onHome,
    className: "flex items-center gap-2 rounded-[10px] bg-slate-100 px-3.5 py-2 text-sm font-bold text-brand-700 transition hover:bg-slate-200"
  }, React.createElement(Icon, {
    name: "home",
    size: 22
  }), " ", React.createElement("span", {
    className: "hidden sm:inline"
  }, "หน้าแรก")), React.createElement("span", {
    className: "h-7 w-px bg-slate-200"
  }), React.createElement("span", {
    className: "max-w-[44vw] truncate text-sm font-bold text-slate-800"
  }, selected.title))), authed && React.createElement("div", {
    className: "flex shrink-0 items-center gap-2"
  }, React.createElement("div", {
    className: "relative"
  }, React.createElement("button", {
    onClick: () => setLeadoOpen(!leadoOpen),
    className: "flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 transition hover:bg-slate-200",
    title: "Leado"
  }, React.createElement("img", {
    src: "https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png",
    alt: "",
    className: "h-7 w-7 object-contain"
  })), leadoOpen && React.createElement(LeadoPanel, {
    onClose: () => setLeadoOpen(false)
  })), React.createElement("div", {
    className: "relative"
  }, React.createElement("button", {
    onClick: () => setNoticeOpen(!noticeOpen),
    className: "flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200",
    title: "การแจ้งเตือน"
  }, React.createElement(Icon, {
    name: "bell",
    size: 23
  })), noticeOpen && React.createElement(NoticePanel, null)), React.createElement("div", {
    className: "relative"
  }, React.createElement("button", {
    onClick: () => setProfileOpen(!profileOpen),
    className: "flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 p-1 pr-2 transition hover:bg-slate-200"
  }, React.createElement("span", {
    className: "relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-brand-600 text-sm font-bold text-white"
  }, initials, React.createElement("span", {
    className: "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-[10px]"
  }, "🇹🇭")), React.createElement(Icon, {
    name: "chevron",
    size: 16,
    className: "text-slate-400"
  })), profileOpen && React.createElement(ProfileMenu, {
    teacher: teacher,
    fontSize: fontSize,
    setFontSize: setFontSize,
    onEdit: onEditProfile
  }))));
}
function LeadoPanel({
  onClose
}) {
  const [message, setMessage] = useState("");
  return React.createElement("div", {
    className: "animate-fade-up absolute right-0 top-[54px] z-50 w-[min(308px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-float"
  }, React.createElement("div", {
    className: "flex items-center gap-2.5 bg-gradient-to-r from-brand-700 to-teal-500 px-4 py-3.5 text-white"
  }, React.createElement("img", {
    src: "https://lms.mooc.meca.in.th/static/sbs-themes/images/Leado_icon.png",
    className: "h-7 w-7 rounded-full bg-white",
    alt: ""
  }), React.createElement("div", {
    className: "flex-1"
  }, React.createElement("div", {
    className: "text-sm font-extrabold"
  }, "Leado"), React.createElement("div", {
    className: "text-[10px] text-teal-100"
  }, "ผู้ช่วย AI")), React.createElement("button", {
    onClick: onClose,
    className: "rounded-lg bg-white/15 p-1.5"
  }, React.createElement(Icon, {
    name: "close",
    size: 14
  }))), React.createElement("div", {
    className: "bg-teal-50/70 p-4"
  }, React.createElement("div", {
    className: "rounded-2xl rounded-tl bg-white p-3 text-[13px] leading-6 text-slate-700 shadow-sm"
  }, "Leado พร้อมให้บริการ ถามข้อมูลได้ที่นี่นะครับ")), React.createElement("div", {
    className: "flex gap-2 border-t border-slate-100 p-3"
  }, React.createElement("input", {
    value: message,
    onChange: event => setMessage(event.target.value),
    placeholder: "พิมพ์คำถามของคุณ...",
    className: "field min-w-0 flex-1 rounded-[10px] border border-slate-200 px-3 py-2 text-[13px]"
  }), React.createElement("button", {
    className: "flex w-10 items-center justify-center rounded-[10px] bg-brand-600 text-white hover:bg-brand-700"
  }, React.createElement(Icon, {
    name: "send",
    size: 17
  }))));
}
function NoticePanel() {
  return React.createElement("div", {
    className: "animate-fade-up absolute right-0 top-[54px] z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-float"
  }, React.createElement("div", {
    className: "border-b border-slate-100 px-4 py-3.5 text-sm font-bold"
  }, "การแจ้งเตือน"), React.createElement("div", {
    className: "px-5 py-8 text-center"
  }, React.createElement("span", {
    className: "mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-300"
  }, React.createElement(Icon, {
    name: "bell",
    size: 22
  })), React.createElement("div", {
    className: "mt-3 text-[13px] font-bold text-slate-600"
  }, "ยังไม่มีการแจ้งเตือน"), React.createElement("div", {
    className: "mt-1 text-[11px] text-slate-400"
  }, "เราจะแจ้งเตือนคุณเมื่อมีความเคลื่อนไหว")));
}
function ProfileMenu({
  teacher,
  fontSize,
  setFontSize,
  onEdit
}) {
  return React.createElement("div", {
    className: "animate-fade-up absolute right-0 top-[54px] z-50 w-[236px] overflow-hidden rounded-[13px] border border-slate-200 bg-white shadow-float"
  }, React.createElement("div", {
    className: "flex items-center gap-2.5 border-b border-slate-100 p-4"
  }, React.createElement("span", {
    className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-brand-50 text-sm font-bold text-brand-700"
  }, API.initials(teacher.name)), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "truncate text-[13px] font-bold"
  }, teacher.name), React.createElement("div", {
    className: "truncate font-inter text-[11px] text-slate-400"
  }, teacher.email || "—"))), React.createElement("div", {
    className: "px-4 pb-3 pt-2.5"
  }, React.createElement("div", {
    className: "mb-1.5 text-[11px] font-bold text-slate-400"
  }, "ภาษา"), React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, React.createElement("button", {
    className: "rounded-lg border border-brand-600 bg-brand-50 py-2 text-xs font-semibold text-brand-700"
  }, "🇹🇭 ไทย"), React.createElement("button", {
    className: "rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500"
  }, "🇬🇧 English")), React.createElement("div", {
    className: "mb-1.5 mt-3 text-[11px] font-bold text-slate-400"
  }, "ขนาดตัวอักษร"), React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, [["sm", "text-xs"], ["md", "text-sm"], ["lg", "text-base"]].map(([key, size]) => React.createElement("button", {
    key: key,
    onClick: () => setFontSize(key),
    className: cx("rounded-lg border py-1.5 font-bold", size, fontSize === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500")
  }, "A")))), React.createElement("button", {
    onClick: onEdit,
    className: "flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
  }, React.createElement(Icon, {
    name: "edit",
    size: 17
  }), "แก้ไขข้อมูลผู้ใช้"), React.createElement("button", {
    onClick: API.logout,
    className: "flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-[13px] font-semibold text-red-600 hover:bg-red-50"
  }, React.createElement(Icon, {
    name: "logout",
    size: 17
  }), "ออกจากระบบ"));
}
function Landing({
  authed,
  teacher,
  overview,
  classrooms,
  courseTab,
  setCourseTab,
  onOpenCourse,
  onAdd,
  onRemove
}) {
  return React.createElement("div", {
    className: "scrolly flex h-full flex-col bg-[#eef1f4]"
  }, authed && React.createElement("div", {
    className: "shrink-0 px-4 pb-0 pt-4 sm:px-[22px] sm:pt-[22px]"
  }, React.createElement("h1", {
    className: "text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
  }, greeting(), teacher.name ? `, ${teacher.name}` : ""), React.createElement("div", {
    className: "mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-400"
  }, React.createElement(Icon, {
    name: "calendar",
    size: 14
  }), " วันนี้ ", todayThai())), React.createElement("div", {
    className: "grid min-w-0 flex-none grid-cols-1 gap-3.5 p-3.5 sm:gap-[18px] sm:p-[22px] lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]"
  }, React.createElement(UsageMap, {
    overview: overview
  }), authed ? React.createElement(CourseList, {
    classrooms: classrooms,
    courseTab: courseTab,
    setCourseTab: setCourseTab,
    onOpenCourse: onOpenCourse,
    onAdd: onAdd,
    onRemove: onRemove
  }) : React.createElement(SignInCard, null)), React.createElement("footer", {
    className: "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-400 sm:px-8"
  }, React.createElement("strong", {
    className: "text-xs text-slate-700"
  }, "ศูนย์เทคโนโลยีอิเล็กทรอนิกส์และคอมพิวเตอร์แห่งชาติ"), React.createElement("span", {
    className: "font-inter"
  }, "National Electronics and Computer Technology Center: NECTEC"), React.createElement("span", null, "\xB7 112 ถนนพหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120, Thailand"), React.createElement("span", {
    className: "font-inter text-brand-700"
  }, "\xB7 info@nectec.or.th")));
}
function SignInCard() {
  return React.createElement("section", {
    className: "flex min-h-[520px] min-w-0 items-center overflow-hidden rounded-[18px] border border-slate-200 bg-white p-6 shadow-panel sm:p-11"
  }, React.createElement("div", {
    className: "mx-auto w-full max-w-[340px]"
  }, React.createElement("h1", {
    className: "mb-7 text-[26px] font-extrabold text-slate-900"
  }, "เข้าสู่ระบบผู้สอน"), React.createElement("button", {
    onClick: API.startLogin,
    className: "flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-teal-500 to-brand-600 px-5 py-4 text-[15px] font-bold text-white shadow-lg shadow-teal-600/25 transition hover:brightness-105"
  }, React.createElement(Icon, {
    name: "id",
    size: 22
  }), " เข้าสู่ระบบด้วย MECA ID ", React.createElement("span", {
    className: "font-inter text-lg"
  }, "→")), React.createElement("div", {
    className: "mt-4 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-5 text-slate-500"
  }, React.createElement(Icon, {
    name: "lock",
    size: 16,
    className: "shrink-0 text-slate-400"
  }), "การเข้าสู่ระบบดำเนินการผ่าน MECA ID อย่างปลอดภัย ระบบไม่เก็บรหัสผ่านของท่าน"), React.createElement("div", {
    className: "my-6 flex items-center gap-3 text-xs text-slate-300"
  }, React.createElement("span", {
    className: "h-px flex-1 bg-slate-100"
  }), "หรือ", React.createElement("span", {
    className: "h-px flex-1 bg-slate-100"
  })), React.createElement("div", {
    className: "text-center text-[13px] text-slate-500"
  }, "ยังไม่มีบัญชี MECA ID? ", React.createElement("span", {
    className: "font-bold text-brand-700"
  }, "ลงทะเบียนที่นี่")), React.createElement("p", {
    className: "mt-7 text-center text-[11px] leading-5 text-slate-300"
  }, "การเข้าใช้งานถือว่าท่านยอมรับ ", React.createElement("span", {
    className: "text-slate-500"
  }, "เงื่อนไขการใช้บริการ"), " และ ", React.createElement("span", {
    className: "text-slate-500"
  }, "นโยบายความเป็นส่วนตัว"))));
}
function UsageMap({
  overview
}) {
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom: 4,
      maxZoom: 12
    }).addTo(map);
    L.control.zoom({
      position: "bottomright"
    }).addTo(map);
    mapInstance.current = map;
    const resizeObserver = window.ResizeObserver ? new ResizeObserver(() => map.invalidateSize({
      pan: false
    })) : null;
    resizeObserver?.observe(mapElement.current);
    setTimeout(() => map.invalidateSize(), 150);
    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapInstance.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    (overview.points || []).forEach(point => {
      const value = point.n >= 1000 ? `${(point.n / 1000).toFixed(point.n < 10000 ? 1 : 0).replace(".0", "")}k` : point.n;
      const color = point.pin ? "#ef4444" : point.n >= 2000 ? "#ef4444" : point.n >= 1000 ? "#f97316" : point.n >= 500 ? "#f59e0b" : "#14b8a6";
      const size = point.size || 36;
      const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${point.big ? 14 : 11}px Inter;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 ${point.big ? 10 : 6}px ${color}22,0 3px 8px rgba(0,0,0,.2)">${value}</div>`;
      L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          html,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        }),
        interactive: false
      }).addTo(layer);
    });
    return () => layer.remove();
  }, [overview.points]);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setSlide(current => (current + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);
  const current = slides[slide];
  const trend = overview.trend || [];
  const trendValues = trend.map(item => Number(item.users)).filter(Number.isFinite);
  const change = trendValues.length > 1 && trendValues.at(-2) ? Math.round((trendValues.at(-1) - trendValues.at(-2)) / trendValues.at(-2) * 100) : null;
  return React.createElement("section", {
    className: "relative min-h-[480px] min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-[#dfe7ea] shadow-panel"
  }, React.createElement("div", {
    ref: mapElement,
    className: "absolute inset-0",
    style: {
      position: "absolute",
      inset: 0
    }
  }), React.createElement("div", {
    className: "absolute left-3.5 right-3.5 top-3.5 z-[500] overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-4 shadow-float backdrop-blur sm:left-5 sm:right-auto sm:top-5 sm:w-[290px] sm:p-5"
  }, overview.loading ? React.createElement("div", {
    className: "flex min-h-[126px] items-center justify-center text-xs font-semibold text-slate-500"
  }, "กำลังโหลดข้อมูลภาพรวม…") : current ? React.createElement("div", {
    className: "min-h-[126px]"
  }, React.createElement("div", {
    className: "flex items-center gap-2.5"
  }, React.createElement("span", {
    className: "h-5 w-1.5 rounded-full",
    style: {
      background: current.bg
    }
  }), React.createElement("span", {
    className: "text-xs font-bold text-slate-600"
  }, current.label)), React.createElement("div", {
    className: "mt-2.5 font-inter text-[29px] font-extrabold leading-tight text-slate-900"
  }, current.big, " ", React.createElement("span", {
    className: "font-sans text-sm font-bold text-slate-400"
  }, current.unit)), React.createElement("p", {
    className: "mt-1.5 text-xs leading-5 text-slate-400"
  }, current.desc)) : React.createElement("div", {
    className: "min-h-[126px] py-5"
  }, React.createElement("div", {
    className: "text-[13px] font-bold text-slate-700"
  }, "ไม่มีข้อมูลภาพรวมให้แสดง"), React.createElement("p", {
    className: "mt-1 text-xs leading-5 text-slate-400"
  }, overview.error || "ไม่พบข้อมูล")), slides.length > 1 && React.createElement("div", {
    className: "mt-2 flex gap-1.5"
  }, slides.map((_, index) => React.createElement("button", {
    key: index,
    onClick: () => setSlide(index),
    className: cx("h-1.5 flex-1 rounded-full", index === slide ? "bg-brand-600" : "bg-slate-200")
  }))), trendValues.length > 1 && React.createElement("div", {
    className: "mt-3 flex items-end justify-between border-t border-slate-100 pt-2"
  }, React.createElement("div", null, React.createElement("div", {
    className: "text-[10px] font-semibold text-slate-400"
  }, "แนวโน้ม 6 เดือน"), React.createElement(Sparkline, {
    values: trendValues
  })), change != null && React.createElement("span", {
    className: cx("font-inter text-xs font-bold", change >= 0 ? "text-green-600" : "text-red-600")
  }, change >= 0 ? "▲" : "▼", " ", Math.abs(change), "%"))), React.createElement("button", {
    className: "absolute bottom-5 right-5 z-[500] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-brand-700 shadow-lg"
  }, "ดูรายละเอียดแผนที่เต็ม ", React.createElement("span", {
    className: "font-inter"
  }, "↗")));
}
function Sparkline({
  values
}) {
  const option = useMemo(() => ({
    animationDuration: 450,
    grid: {
      left: 2,
      right: 2,
      top: 3,
      bottom: 3
    },
    xAxis: {
      type: "category",
      show: false,
      boundaryGap: false,
      data: values.map((_, index) => index)
    },
    yAxis: {
      type: "value",
      show: false,
      scale: true
    },
    series: [{
      type: "line",
      data: values,
      smooth: 0.35,
      symbol: "none",
      lineStyle: {
        color: "#0d9488",
        width: 2
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0,
            color: "rgba(13,148,136,.18)"
          }, {
            offset: 1,
            color: "rgba(13,148,136,0)"
          }]
        }
      }
    }]
  }), [values]);
  return React.createElement(EChart, {
    option,
    className: "h-7 w-[140px]",
    ariaLabel: "กราฟแนวโน้มผู้ใช้งานหกเดือน"
  });
}
function CourseList({
  classrooms,
  courseTab,
  setCourseTab,
  onOpenCourse,
  onAdd,
  onRemove
}) {
  const tabs = [["all", "ทั้งหมด"], ["active", "กำลังสอน"], ["pending", "รอเริ่ม"], ["done", "สิ้นสุดแล้ว"]];
  const counts = {
    all: classrooms.length,
    active: 0,
    pending: 0,
    done: 0
  };
  classrooms.forEach(course => {
    counts[classroomStatus(course)] += 1;
  });
  const courses = courseTab === "all" ? classrooms : classrooms.filter(course => classroomStatus(course) === courseTab);
  return React.createElement("section", {
    className: "flex min-h-[480px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-panel"
  }, React.createElement("div", {
    className: "shrink-0 px-4 pt-4 sm:px-[22px] sm:pt-[18px]"
  }, React.createElement("div", {
    className: "mb-3.5 flex items-center justify-between gap-2"
  }, React.createElement("h2", {
    className: "text-lg font-extrabold sm:text-[19px]"
  }, "ห้องเรียนของฉัน"), React.createElement("button", {
    onClick: onAdd,
    className: "flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-brand-700"
  }, React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " เพิ่มห้องเรียน")), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 border-b border-slate-100 pb-3"
  }, tabs.map(([key, label]) => React.createElement("button", {
    key: key,
    onClick: () => setCourseTab(key),
    className: cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold", courseTab === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-500")
  }, label, React.createElement("span", {
    className: cx("rounded-full px-1.5 font-inter text-[10px]", courseTab === key ? "bg-teal-100" : "bg-slate-100 text-slate-400")
  }, counts[key]))))), React.createElement("div", {
    className: "scrolly flex min-h-0 flex-1 flex-col gap-3 p-4 sm:px-[22px]"
  }, courses.length ? courses.map(course => React.createElement(CourseCard, {
    key: course.id,
    course: course,
    onOpen: () => onOpenCourse(course),
    onRemove: () => onRemove(course)
  })) : React.createElement("div", {
    className: "rounded-[14px] border border-dashed border-slate-200 p-9 text-center text-[13px] font-semibold text-slate-400"
  }, "ยังไม่มีห้องเรียนในสถานะนี้")));
}
function CourseCard({
  course,
  onOpen,
  onRemove
}) {
  const [menu, setMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const menuButtonRef = useRef(null);
  const status = classroomStatus(course);
  const started = relativeTime(course.startDate);
  const toggleMenu = () => {
    if (menu) {
      setMenu(false);
      setMenuPosition(null);
      return;
    }
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right)
    });
    setMenu(true);
  };
  useEffect(() => {
    if (!menu) return;
    const closeMenu = () => {
      setMenu(false);
      setMenuPosition(null);
    };
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menu]);
  return React.createElement("article", {
    className: "card-lift flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm"
  }, React.createElement("button", {
    onClick: onOpen,
    className: "w-2 shrink-0",
    style: {
      background: `linear-gradient(${course.color},${course.color}cc)`
    },
    "aria-label": "เปิดห้องเรียน"
  }), React.createElement("div", {
    className: "flex min-w-0 flex-1 items-center gap-3.5 p-3.5 pl-4"
  }, React.createElement("button", {
    onClick: onOpen,
    className: "min-w-0 flex-1 text-left"
  }, React.createElement("h3", {
    className: "text-sm font-bold leading-5 text-slate-900"
  }, course.title), React.createElement("div", {
    className: "mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-medium text-slate-400"
  }, React.createElement("span", {
    className: "flex items-center gap-1"
  }, React.createElement(Icon, {
    name: "users",
    size: 14
  }), course.students == null ? "—" : course.students, " คน"), started && React.createElement("span", {
    className: "flex items-center gap-1"
  }, React.createElement(Icon, {
    name: "calendar",
    size: 12
  }), "เริ่มสอนเมื่อ ", started)), React.createElement("div", {
    className: "mt-2 flex items-center gap-2.5"
  }, React.createElement("span", {
    className: "h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
  }, React.createElement("span", {
    className: "block h-full rounded-full",
    style: {
      width: `${course.progress || 0}%`,
      background: course.color
    }
  })), React.createElement("span", {
    className: "w-9 text-right font-inter text-xs font-bold text-slate-600"
  }, course.progress == null ? "—" : `${course.progress}%`))), React.createElement("div", {
    className: "relative flex shrink-0 flex-col items-end gap-1.5"
  }, React.createElement("button", {
    onClick: onOpen,
    className: "rounded-lg px-3 py-2 text-[11px] font-bold",
    style: status === "pending" ? {
      background: "#eef2ff",
      color: "#4f46e5"
    } : {
      background: course.color,
      color: "white"
    }
  }, status === "pending" ? "เริ่มใช้งาน" : "เปิดห้องเรียน"), React.createElement("button", {
    ref: menuButtonRef,
    onClick: toggleMenu,
    className: "rounded-md px-2 font-inter text-lg font-bold leading-none text-slate-300 hover:bg-slate-100 hover:text-slate-500"
  }, "⋮"), menu && menuPosition && ReactDOM.createPortal(React.createElement(React.Fragment, null, React.createElement("button", {
    type: "button",
    "aria-label": "ปิดเมนู",
    onClick: toggleMenu,
    className: "fixed inset-0 z-[1090] cursor-default"
  }), React.createElement("div", {
    className: "fixed z-[1100] w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-float",
    style: {
      top: menuPosition.top,
      right: menuPosition.right
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => {
      setMenu(false);
      setMenuPosition(null);
      onRemove();
    },
    className: "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-semibold text-red-600 hover:bg-red-50"
  }, React.createElement(Icon, {
    name: "trash",
    size: 17
  }), "นำออกจากรายการ"))), document.body))));
}
function Dashboard({
  page,
  setPage,
  selected,
  dataset,
  onOpenStudent
}) {
  const nav = [["overview", "chart", "ภาพรวมทั้งห้อง"], ["students", "users", "รายชื่อนักเรียน"], ["tools", "tools", "การใช้งานเครื่องมือ"]];
  return React.createElement("div", {
    className: "flex h-full min-h-0"
  }, React.createElement("aside", {
    className: "hidden w-[220px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3.5 shadow-sm md:flex xl:w-[236px] xl:p-[18px]"
  }, React.createElement("div", {
    className: "px-3 pb-2 pt-0.5 text-[11px] font-bold text-slate-400"
  }, "เมนูห้องเรียน"), nav.map(([key, icon, label]) => React.createElement("button", {
    key: key,
    onClick: () => setPage(key),
    className: cx("flex items-center gap-2.5 rounded-[10px] px-3 py-3 text-left text-sm font-semibold transition", page === key ? "bg-brand-50 font-bold text-brand-700" : "text-slate-600 hover:bg-slate-50")
  }, React.createElement("span", {
    className: cx("h-[18px] w-1 rounded-full", page === key ? "bg-brand-600" : "bg-transparent")
  }), React.createElement(Icon, {
    name: icon,
    size: 18
  }), " ", label))), React.createElement("div", {
    className: "flex min-w-0 flex-1 flex-col"
  }, React.createElement("nav", {
    className: "flex shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 md:hidden"
  }, nav.map(([key,, label]) => React.createElement("button", {
    key: key,
    onClick: () => setPage(key),
    className: cx("whitespace-nowrap border-b-[3px] px-3 py-3.5 text-sm font-bold", page === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-400")
  }, label))), React.createElement("main", {
    className: "scrolly min-h-0 flex-1 p-3.5 pb-14 sm:p-6 lg:p-[26px_34px_60px]"
  }, React.createElement("div", {
    className: "mx-auto max-w-[1180px]"
  }, page === "overview" && React.createElement(OverviewPage, {
    selected: selected,
    dataset: dataset,
    onOpenStudent: onOpenStudent
  }), page === "students" && React.createElement(StudentsPage, {
    selected: selected,
    dataset: dataset,
    onOpenStudent: onOpenStudent
  }), page === "tools" && React.createElement(ToolsPage, {
    selected: selected,
    dataset: dataset
  })))));
}
function CourseHero({
  selected,
  title
}) {
  const school = selected.school ? `${selected.school}${selected.province ? ` (${selected.province})` : ""}` : "—";
  const chips = [`โรงเรียน: ${school}`, `ระดับชั้น: ${gradeText(selected)}`, `ห้อง: ${roomText(selected)}`];
  return React.createElement("section", {
    className: "mb-4 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-teal-500 p-[18px] text-white shadow-lg shadow-teal-800/10 sm:p-6"
  }, React.createElement("h1", {
    className: "max-w-4xl text-xl font-extrabold leading-tight tracking-tight sm:text-[26px]"
  }, title), React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, chips.map(chip => React.createElement("span", {
    key: chip,
    className: "rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold"
  }, chip))));
}
function OverviewPage({
  selected,
  dataset,
  onOpenStudent
}) {
  const {
    students,
    metrics
  } = dataset;
  const total = students.length;
  const attention = [...students].filter(item => item.status.key === "followup").sort((a, b) => a.progress - b.progress).slice(0, 4);
  const progressBuckets = [{
    label: "100%",
    color: "#22c55e",
    count: students.filter(item => item.progress >= 100).length
  }, {
    label: "75–99%",
    color: "#14b8a6",
    count: students.filter(item => item.progress >= 75 && item.progress < 100).length
  }, {
    label: "50–74%",
    color: "#f59e0b",
    count: students.filter(item => item.progress >= 50 && item.progress < 75).length
  }, {
    label: "1–49%",
    color: "#fb923c",
    count: students.filter(item => item.progress > 0 && item.progress < 50).length
  }, {
    label: "0%",
    color: "#cbd5e1",
    count: students.filter(item => item.progress === 0).length
  }];
  const quizBuckets = [{
    label: "80–100%",
    color: "#22c55e",
    count: students.filter(item => item.rate >= 80).length
  }, {
    label: "60–79%",
    color: "#14b8a6",
    count: students.filter(item => item.rate >= 60 && item.rate < 80).length
  }, {
    label: "40–59%",
    color: "#f59e0b",
    count: students.filter(item => item.rate >= 40 && item.rate < 60).length
  }, {
    label: "0–39%",
    color: "#ef4444",
    count: students.filter(item => item.rate != null && item.rate < 40).length
  }, {
    label: "ไม่มีคะแนน",
    color: "#94a3b8",
    count: students.filter(item => item.rate == null).length
  }];
  return React.createElement(React.Fragment, null, React.createElement(CourseHero, {
    selected: selected,
    title: dataset.title
  }), React.createElement("h2", {
    className: "mb-4 text-lg font-extrabold text-slate-900"
  }, "ภาพรวมของทั้งห้องเรียน"), React.createElement("div", {
    className: "mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4"
  }, React.createElement(MetricCard, {
    color: "#12a594",
    label: "ผู้เรียนทั้งหมด",
    value: fmtNumber(total),
    suffix: "คน",
    badge: React.createElement(Icon, {
      name: "users",
      size: 18
    })
  }), React.createElement(MetricCard, {
    color: "#22c55e",
    label: "ความคืบหน้าเฉลี่ย",
    value: fmtNumber(metrics.avgProgress, 1),
    suffix: "%",
    badge: "เฉลี่ยทั้งห้อง"
  }), React.createElement(MetricCard, {
    color: "#6366f1",
    label: "เรียนครบแล้ว",
    value: fmtNumber(metrics.completed),
    suffix: `/ ${total}`,
    badge: `${total ? Math.round(metrics.completed / total * 100) : 0}%`
  }), React.createElement(MetricCard, {
    color: "#f97316",
    label: "คะแนน Quiz เฉลี่ย",
    value: metrics.avgRate == null ? "—" : fmtNumber(metrics.avgRate, 1),
    suffix: metrics.avgRate == null ? "" : "%",
    badge: `${metrics.records} records`
  })), React.createElement("div", {
    className: "mb-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]"
  }, React.createElement(DistributionBars, {
    data: progressBuckets
  }), React.createElement(DonutChart, {
    data: quizBuckets,
    total: total
  })), React.createElement("section", {
    className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel"
  }, React.createElement("div", {
    className: "flex items-center justify-between border-b border-slate-100 px-5 py-4"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "text-[15px] font-bold"
  }, "ผู้เรียนที่ควรติดตาม"), React.createElement("p", {
    className: "mt-0.5 text-[11px] text-slate-400"
  }, "เรียงจากความคืบหน้าน้อยที่สุด")), React.createElement("span", {
    className: "rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700"
  }, students.filter(item => item.status.key === "followup").length, " คน")), attention.length ? React.createElement("div", {
    className: "divide-y divide-slate-100"
  }, attention.map(item => React.createElement("button", {
    key: item.id,
    onClick: () => onOpenStudent(item),
    className: "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50"
  }, React.createElement(Avatar, {
    student: item
  }), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "truncate text-[13px] font-bold text-slate-800"
  }, item.name), React.createElement("div", {
    className: "truncate font-inter text-[11px] text-slate-400"
  }, item.email)), React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("span", {
    className: "hidden h-2 w-28 overflow-hidden rounded-full bg-slate-100 sm:block"
  }, React.createElement("span", {
    className: "block h-full rounded-full bg-orange-400",
    style: {
      width: `${item.progress}%`
    }
  })), React.createElement("span", {
    className: "w-10 text-right font-inter text-xs font-bold text-orange-600"
  }, item.progress, "%"))))) : React.createElement("div", {
    className: "p-8 text-center text-sm font-semibold text-slate-400"
  }, "ไม่มีผู้เรียนที่ต้องติดตาม")));
}
function MetricCard({
  color,
  label,
  value,
  suffix,
  badge
}) {
  return React.createElement("div", {
    className: "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:p-5"
  }, React.createElement("span", {
    className: "absolute inset-y-0 left-0 w-1",
    style: {
      background: color
    }
  }), React.createElement("div", {
    className: "flex items-center justify-between gap-2 text-xs font-semibold text-slate-500"
  }, React.createElement("span", null, label), React.createElement("span", {
    className: "rounded-md bg-slate-50 px-2 py-1 text-[10px]",
    style: {
      color
    }
  }, badge)), React.createElement("div", {
    className: "mt-2 font-inter text-[26px] font-extrabold text-slate-900 sm:text-[32px]"
  }, value, " ", React.createElement("span", {
    className: "font-sans text-xs font-semibold text-slate-400 sm:text-sm"
  }, suffix)));
}
function DistributionBars({
  data
}) {
  const option = useMemo(() => ({
    animationDuration: 550,
    aria: {
      enabled: true,
      decal: {
        show: false
      }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: "rgba(15,118,110,.06)"
        }
      },
      backgroundColor: "rgba(16,24,40,.94)",
      borderWidth: 0,
      textStyle: {
        color: "#fff",
        fontFamily: "Noto Sans Thai, Inter, sans-serif",
        fontSize: 12
      },
      formatter: params => {
        const item = params?.[0];
        return `${item?.axisValue || ""}<br/><b>${item?.value ?? 0} คน</b>`;
      }
    },
    grid: {
      left: 8,
      right: 8,
      top: 30,
      bottom: 8,
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: data.map(item => item.label),
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: "#e2e8f0"
        }
      },
      axisLabel: {
        color: "#98a2b3",
        fontFamily: "Inter, Noto Sans Thai, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        interval: 0
      }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: "#f1f5f9"
        }
      }
    },
    series: [{
      name: "ผู้เรียน",
      type: "bar",
      barMaxWidth: 46,
      data: data.map(item => ({
        value: item.count,
        itemStyle: {
          color: item.color,
          borderRadius: [6, 6, 0, 0]
        }
      })),
      label: {
        show: true,
        position: "top",
        color: "#475467",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        fontWeight: 700
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: "rgba(16,24,40,.14)"
        }
      }
    }]
  }), [data]);
  return React.createElement("section", {
    className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-panel"
  }, React.createElement("div", {
    className: "mb-1"
  }, React.createElement("h3", {
    className: "text-[15px] font-bold"
  }, "การกระจายความคืบหน้า"), React.createElement("p", {
    className: "mt-0.5 text-[11px] text-slate-400"
  }, "จำนวนผู้เรียนในแต่ละช่วง")), React.createElement(EChart, {
    option,
    className: "h-[214px] w-full",
    ariaLabel: "กราฟแท่งแสดงการกระจายความคืบหน้าของผู้เรียน"
  }));
}
function DonutChart({
  data,
  total
}) {
  const option = useMemo(() => ({
    animationDuration: 600,
    aria: {
      enabled: true,
      decal: {
        show: false
      }
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(16,24,40,.94)",
      borderWidth: 0,
      textStyle: {
        color: "#fff",
        fontFamily: "Noto Sans Thai, Inter, sans-serif",
        fontSize: 12
      },
      formatter: params => `${params.marker}${params.name}<br/><b>${params.value} คน (${params.percent}%)</b>`
    },
    legend: {
      orient: "vertical",
      left: "58%",
      top: "center",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 11,
      icon: "circle",
      data: data.map(item => item.label),
      formatter: name => {
        const item = data.find(row => row.label === name);
        return `{label|${name}}  {value|${item?.count ?? 0}}`;
      },
      textStyle: {
        rich: {
          label: {
            width: 76,
            color: "#667085",
            fontFamily: "Noto Sans Thai, Inter, sans-serif",
            fontSize: 11,
            fontWeight: 600
          },
          value: {
            color: "#344054",
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            align: "right"
          }
        }
      }
    },
    graphic: [{
      type: "group",
      left: "30%",
      top: "center",
      silent: true,
      children: [{
        type: "text",
        style: {
          x: 0,
          y: -10,
          text: String(total),
          textAlign: "center",
          textVerticalAlign: "middle",
          fill: "#101828",
          font: "800 24px Inter"
        }
      }, {
        type: "text",
        style: {
          x: 0,
          y: 13,
          text: "ผู้เรียน",
          textAlign: "center",
          textVerticalAlign: "middle",
          fill: "#98a2b3",
          font: "600 11px Noto Sans Thai"
        }
      }]
    }],
    series: [{
      name: "ผลคะแนน Quiz",
      type: "pie",
      center: ["30%", "50%"],
      radius: ["48%", "72%"],
      avoidLabelOverlap: true,
      label: {
        show: false
      },
      labelLine: {
        show: false
      },
      itemStyle: {
        borderColor: "#fff",
        borderWidth: 2,
        borderRadius: 3
      },
      emphasis: {
        scaleSize: 5
      },
      data: data.map(item => ({
        name: item.label,
        value: item.count,
        itemStyle: {
          color: item.color
        }
      }))
    }]
  }), [data, total]);
  return React.createElement("section", {
    className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-panel"
  }, React.createElement("div", null, React.createElement("h3", {
    className: "text-[15px] font-bold"
  }, "ผลคะแนน Quiz"), React.createElement("p", {
    className: "mt-0.5 text-[11px] text-slate-400"
  }, "สัดส่วนคะแนนรวมของผู้เรียน")), React.createElement(EChart, {
    option,
    className: "h-[214px] w-full",
    ariaLabel: "กราฟวงกลมแสดงสัดส่วนคะแนน Quiz ของผู้เรียน"
  }));
}
function Avatar({
  student,
  size = "h-10 w-10"
}) {
  return React.createElement("span", {
    className: cx("flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700", size)
  }, student?.initials || API.initials(student?.name || ""));
}
function StudentsPage({
  selected,
  dataset,
  onOpenStudent
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const rows = useMemo(() => {
    const rank = {
      followup: 0,
      learning: 1,
      done: 2
    };
    let output = dataset.students.filter(item => {
      const query = search.trim().toLowerCase();
      return !query || item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query) || item.province.toLowerCase().includes(query);
    });
    if (filter !== "all") output = output.filter(item => item.status.key === filter);
    return [...output].sort((a, b) => {
      if (sort === "progress") return b.progress - a.progress;
      if (sort === "quiz") return (b.rate ?? -1) - (a.rate ?? -1);
      if (sort === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""), "th", {
          sensitivity: "base",
          numeric: true
        });
      }
      return rank[a.status.key] - rank[b.status.key] || a.progress - b.progress;
    });
  }, [dataset.students, search, filter, sort]);
  const exportCsv = () => {
    const header = ["ชื่อ", "อีเมล", "กลุ่ม", "ความคืบหน้า(%)", "คะแนน", "อัปเดตล่าสุด", "สถานะ"];
    const body = rows.map(item => [item.name, item.email, item.room, item.progress, item.quizText, item.updated, item.status.label]);
    const csv = [header, ...body].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8"
    }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "students.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return React.createElement(React.Fragment, null, React.createElement(CourseHero, {
    selected: selected,
    title: dataset.title
  }), React.createElement("section", {
    className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel"
  }, React.createElement("div", {
    className: "border-b border-slate-100 p-4 sm:p-5"
  }, React.createElement("div", {
    className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
  }, React.createElement("div", null, React.createElement("h2", {
    className: "text-lg font-extrabold"
  }, "รายชื่อนักเรียน"), React.createElement("p", {
    className: "mt-0.5 text-xs text-slate-400"
  }, "ทั้งหมด ", dataset.students.length, " คน \xB7 แสดง ", rows.length, " คน")), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("label", {
    className: "field flex min-w-[210px] flex-1 items-center gap-2 rounded-[10px] border border-slate-200 px-3 py-2 text-slate-400 lg:flex-none"
  }, React.createElement(Icon, {
    name: "search",
    size: 17
  }), React.createElement("input", {
    value: search,
    onChange: event => setSearch(event.target.value),
    placeholder: "ค้นหาชื่อหรืออีเมล...",
    className: "min-w-0 flex-1 border-0 bg-transparent text-[13px] text-slate-700 outline-none"
  })), React.createElement("select", {
    value: sort,
    onChange: event => setSort(event.target.value),
    className: "field rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
  }, React.createElement("option", {
    value: "followup"
  }, "เรียง: ควรติดตามก่อน"), React.createElement("option", {
    value: "progress"
  }, "ความคืบหน้าสูงสุด"), React.createElement("option", {
    value: "quiz"
  }, "คะแนนสูงสุด"), React.createElement("option", {
    value: "name"
  }, "ชื่อ ก–ฮ")), React.createElement("button", {
    onClick: exportCsv,
    className: "flex items-center gap-2 rounded-[10px] border border-slate-200 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
  }, React.createElement(Icon, {
    name: "download",
    size: 16
  }), "CSV"))), React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-1.5"
  }, [["all", "ทั้งหมด"], ["followup", "ต้องติดตาม"], ["learning", "กำลังเรียน"], ["done", "เรียนจบ"]].map(([key, label]) => React.createElement("button", {
    key: key,
    onClick: () => setFilter(key),
    className: cx("rounded-full border px-3 py-1.5 text-[11px] font-bold", filter === key ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500")
  }, label)))), React.createElement("div", {
    className: "scrolly"
  }, React.createElement("table", {
    className: "w-full min-w-[780px] border-collapse text-left"
  }, React.createElement("thead", {
    className: "sticky top-0 z-10 bg-slate-50 text-[11px] font-bold text-slate-400"
  }, React.createElement("tr", null, React.createElement("th", {
    className: "px-5 py-3"
  }, "ผู้เรียน"), React.createElement("th", {
    className: "px-4 py-3"
  }, "กลุ่ม"), React.createElement("th", {
    className: "px-4 py-3"
  }, "ความคืบหน้า"), React.createElement("th", {
    className: "px-4 py-3"
  }, "คะแนน Quiz"), React.createElement("th", {
    className: "px-4 py-3"
  }, "อัปเดตล่าสุด"), React.createElement("th", {
    className: "px-4 py-3"
  }, "สถานะ"))), React.createElement("tbody", {
    className: "divide-y divide-slate-100"
  }, rows.map(item => React.createElement("tr", {
    key: item.id,
    onClick: () => onOpenStudent(item),
    className: "cursor-pointer text-[13px] transition hover:bg-slate-50"
  }, React.createElement("td", {
    className: "px-5 py-3"
  }, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement(Avatar, {
    student: item
  }), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "font-bold text-slate-800"
  }, item.name), React.createElement("div", {
    className: "font-inter text-[11px] text-slate-400"
  }, item.email)))), React.createElement("td", {
    className: "px-4 py-3 text-slate-500"
  }, item.room), React.createElement("td", {
    className: "px-4 py-3"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "h-2 w-24 overflow-hidden rounded-full bg-slate-100"
  }, React.createElement("span", {
    className: "block h-full rounded-full",
    style: {
      width: `${item.progress}%`,
      background: item.progress >= 100 ? "#22c55e" : item.progress >= 60 ? "#14b8a6" : "#fb923c"
    }
  })), React.createElement("b", {
    className: "w-9 font-inter text-xs"
  }, item.progress, "%"))), React.createElement("td", {
    className: "px-4 py-3"
  }, React.createElement("b", {
    className: "font-inter"
  }, item.quizText), item.rate != null && React.createElement("span", {
    className: "ml-1 text-[10px] text-slate-400"
  }, "(", Math.round(item.rate), "%)")), React.createElement("td", {
    className: "px-4 py-3 text-xs text-slate-400"
  }, item.updated), React.createElement("td", {
    className: "px-4 py-3"
  }, React.createElement(StatusBadge, {
    status: item.status
  })))))), !rows.length && React.createElement("div", {
    className: "p-12 text-center text-sm font-semibold text-slate-400"
  }, "ไม่พบผู้เรียนตามเงื่อนไข"))));
}
function StatusBadge({
  status
}) {
  const safeStatus = status && typeof status === "object" ? status : {
    label: "ไม่ทราบสถานะ",
    text: "#667085",
    bg: "#f2f4f7"
  };
  return React.createElement("span", {
    className: "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
    style: {
      color: safeStatus.text || "#667085",
      background: safeStatus.bg || "#f2f4f7"
    }
  }, safeStatus.label || "ไม่ทราบสถานะ");
}
const TOOL_COLORS = {
  Video: {
    bg: "#7b83eb",
    light: "#eef2ff"
  },
  BookRoll: {
    bg: "#5ab877",
    light: "#ecfdf3"
  },
  Quiz: {
    bg: "#f59e0b",
    light: "#fffbeb"
  },
  Profile: {
    bg: "#12a89b",
    light: "#f0fdfa"
  }
};
function ToolsPage({
  selected,
  dataset
}) {
  return React.createElement(React.Fragment, null, React.createElement(CourseHero, {
    selected: selected,
    title: dataset.title
  }), React.createElement("div", {
    className: "mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
  }, Object.entries(dataset.toolCounts).map(([label, count]) => {
    const colors = TOOL_COLORS[label] || {
      bg: "#94a3b8",
      light: "#f8fafc"
    };
    return React.createElement("div", {
      key: label,
      className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-panel"
    }, React.createElement("span", {
      className: "inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold text-white",
      style: {
        background: colors.bg
      }
    }, label), React.createElement("div", {
      className: "mt-2 font-inter text-3xl font-extrabold"
    }, count), React.createElement("div", {
      className: "text-[11px] text-slate-400"
    }, "กิจกรรม"));
  })), React.createElement("section", {
    className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel"
  }, React.createElement("div", {
    className: "border-b border-slate-100 p-5"
  }, React.createElement("h2", {
    className: "text-lg font-extrabold"
  }, "การใช้งานเครื่องมือ"), React.createElement("p", {
    className: "mt-0.5 text-xs text-slate-400"
  }, "เครื่องมือที่ใช้ในแต่ละบทเรียนและจำนวนผู้เรียนที่เข้าถึง")), React.createElement("div", {
    className: "scrolly"
  }, React.createElement("table", {
    className: "w-full min-w-[680px]"
  }, React.createElement("thead", {
    className: "bg-slate-50 text-left text-[11px] font-bold text-slate-400"
  }, React.createElement("tr", null, React.createElement("th", {
    className: "px-5 py-3"
  }, "บทเรียน"), React.createElement("th", {
    className: "px-4 py-3"
  }, "รหัส"), React.createElement("th", {
    className: "px-4 py-3"
  }, "เครื่องมือ"), React.createElement("th", {
    className: "px-5 py-3 text-right"
  }, "ผู้เรียนที่เข้าถึง"))), React.createElement("tbody", {
    className: "divide-y divide-slate-100"
  }, dataset.activities.map(activity => React.createElement("tr", {
    key: activity.id,
    className: "text-[13px] hover:bg-slate-50"
  }, React.createElement("td", {
    className: "px-5 py-4 font-bold text-slate-800"
  }, activity.name), React.createElement("td", {
    className: "px-4 py-4 font-inter text-xs text-slate-400"
  }, activity.code), React.createElement("td", {
    className: "px-4 py-4"
  }, React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, activity.tools.map(tool => React.createElement(ToolBadge, {
    key: `${activity.id}-${tool.id}`,
    label: tool.label
  })))), React.createElement("td", {
    className: "px-5 py-4 text-right font-inter font-bold text-slate-700"
  }, activity.reach == null ? "—" : activity.reach))))), !dataset.activities.length && React.createElement("div", {
    className: "p-12 text-center text-sm font-semibold text-slate-400"
  }, "ไม่พบเครื่องมือในรายวิชานี้"))));
}
function ToolBadge({
  label
}) {
  const colors = TOOL_COLORS[label] || {
    bg: "#94a3b8"
  };
  return React.createElement("span", {
    className: "rounded-md px-2 py-1 text-[10px] font-bold text-white",
    style: {
      background: colors.bg
    }
  }, label);
}
function ProgressToolBadge({
  tool
}) {
  if (!tool || typeof tool !== "object") return null;
  if (!tool.showProgress) return React.createElement(ToolBadge, {
    label: tool.label
  });
  const colors = TOOL_COLORS[tool.label] || {
    bg: "#94a3b8"
  };
  let progressStyle = {
    color: "#667085",
    background: "#f2f4f7"
  };
  if (tool.progress >= 100) {
    progressStyle = {
      color: "#0f766e",
      background: "#d1fae5"
    };
  } else if (tool.progress > 0) {
    progressStyle = {
      color: "#c2410c",
      background: "#ffedd5"
    };
  }
  const label = tool.progress == null ? "—" : `${Math.round(tool.progress)}%`;
  return React.createElement("span", {
    className: "inline-flex overflow-hidden rounded-md whitespace-nowrap"
  }, React.createElement("span", {
    className: "px-2 py-1 text-[10px] font-bold text-white",
    style: {
      background: colors.bg
    }
  }, tool.label), React.createElement("span", {
    className: "flex min-w-10 items-center justify-center px-2 py-1 font-inter text-[10px] font-bold",
    style: progressStyle
  }, tool.loading ? React.createElement("span", {
    className: "spinner h-3 w-3 rounded-full border-2 border-slate-300 border-t-brand-600",
    title: "กำลังโหลด"
  }) : label));
}
function summarizeChapterTools(chapters, toolLabel, fallback = {}) {
  const tools = chapters
    .flatMap(activity => Array.isArray(activity.tools) ? activity.tools : [])
    .filter(tool => String(tool?.label || "").toLowerCase() === toolLabel);
  if (!tools.length) return fallback;
  const known = tools.filter(tool => Number.isFinite(tool.progress));
  return {
    done: known.filter(tool => tool.progress >= 100).length,
    doing: known.filter(tool => tool.progress > 0 && tool.progress < 100).length,
    todo: known.filter(tool => tool.progress <= 0).length + (tools.length - known.length)
  };
}
function StudentDrawer({
  student,
  detail,
  activities,
  onClose
}) {
  const safeStudent = student && typeof student === "object" ? student : {};
  const safeActivities = Array.isArray(activities)
    ? activities.filter(activity => activity && typeof activity === "object")
    : [];
  const reading = detail?.reading || {};
  const video = detail?.video || {};
  const readingLoading = detail?.readingLoading ?? !!detail?.loading;
  const videoLoading = detail?.videoLoading ?? !!detail?.loading;
  const chatbotLoading = detail?.chatbotLoading ?? !!detail?.loading;
  const chapters = safeActivities.map((activity, activityIndex) => {
    const sourceTools = Array.isArray(activity.tools)
      ? activity.tools.filter(tool => tool && typeof tool === "object")
      : [];
    const tools = sourceTools.map(tool => {
      const label = String(tool.label || "").toLowerCase();
      const isReading = label === "bookroll";
      const isVideo = label === "video";
      if (!isReading && !isVideo) return {
        ...tool,
        showProgress: false
      };
      const entry = isReading
        ? API.findActivityProgress(activity, detail?.readingEntries, "bookroll")
        : API.findActivityProgress(activity, detail?.videoEntries, "video");
      return {
        ...tool,
        showProgress: true,
        loading: isReading ? readingLoading : videoLoading,
        progress: Number.isFinite(entry?.progress) ? API.clamp(Math.round(entry.progress)) : null
      };
    });
    const tracked = tools.filter(tool => tool.showProgress);
    const known = tracked.filter(tool => Number.isFinite(tool.progress));
    const dot = known.length && known.length === tracked.length && known.every(tool => tool.progress >= 100)
      ? "#22c55e"
      : known.some(tool => tool.progress > 0) ? "#f97316" : "#d0d5dd";
    return {
      ...activity,
      id: activity.id || activity.code || `chapter-${activityIndex}`,
      name: activity.name || activity.title || `บทที่ ${activityIndex + 1}`,
      tools,
      dot
    };
  });
  const readingSummary = summarizeChapterTools(chapters, "bookroll", reading);
  const videoSummary = summarizeChapterTools(chapters, "video", video);
  return React.createElement("div", {
    className: "fixed inset-0 z-[1200]"
  }, React.createElement("button", {
    onClick: onClose,
    "aria-label": "ปิด",
    className: "absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
  }), React.createElement("aside", {
    className: "animate-fade-up scrolly absolute bottom-0 right-0 top-0 w-full max-w-[620px] bg-[#f7f8fa] shadow-2xl"
  }, React.createElement("div", {
    className: "bg-gradient-to-r from-brand-700 to-teal-500 p-5 text-white sm:p-6"
  }, React.createElement("div", {
    className: "mb-4 flex items-center justify-between"
  }, React.createElement("span", {
    className: "text-sm font-bold"
  }, "รายละเอียดผู้เรียน"), React.createElement("button", {
    onClick: onClose,
    className: "rounded-lg bg-white/15 p-2"
  }, React.createElement(Icon, {
    name: "close",
    size: 15
  }))), React.createElement("div", {
    className: "flex items-center gap-4"
  }, React.createElement(Avatar, {
    student: safeStudent,
    size: "h-[60px] w-[60px] !bg-white/15 !text-xl !text-white"
  }), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("h2", {
    className: "truncate text-xl font-extrabold"
  }, safeStudent.name || "ไม่ระบุชื่อ"), React.createElement("div", {
    className: "truncate font-inter text-xs text-teal-100"
  }, safeStudent.email || "—"), React.createElement("div", {
    className: "mt-2 flex gap-2"
  }, React.createElement("span", {
    className: "rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold"
  }, safeStudent.room || "—"), React.createElement(StatusBadge, {
    status: safeStudent.status
  }))))), React.createElement("div", {
    className: "space-y-3.5 p-4 sm:p-5"
  }, React.createElement("div", {
    className: "grid grid-cols-3 items-center gap-2 rounded-[14px] border border-slate-200 bg-white p-4"
  }, React.createElement(ProgressRing, {
    value: safeStudent.progress
  }), React.createElement("div", {
    className: "border-r border-slate-100 text-center"
  }, React.createElement("div", {
    className: "font-inter text-xl font-extrabold"
  }, safeStudent.quizText || "—"), React.createElement("div", {
    className: "mt-1 text-[10px] font-semibold text-slate-400"
  }, "คะแนน Quiz")), React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-sm font-extrabold"
  }, chatbotLoading ? React.createElement("span", {
    role: "status",
    "aria-label": "กำลังโหลดเวลาทำแบบฝึกหัด",
    className: "spinner inline-block h-4 w-4 rounded-full border-2 border-slate-200 border-t-brand-600 align-middle"
  }) : formatDuration(detail?.chatbotSeconds)), React.createElement("div", {
    className: "mt-1 text-[10px] font-semibold text-slate-400"
  }, "เวลาทำแบบฝึกหัด"))), React.createElement("div", {
    className: "grid grid-cols-1 gap-3 sm:grid-cols-2"
  }, React.createElement(ProgressSummary, {
    label: "ความคืบหน้าการอ่าน",
    color: "#5ab877",
    summary: readingSummary,
    loading: readingLoading,
    verbs: ["อ่านจบ", "กำลังอ่าน", "ยังไม่ได้อ่าน"]
  }), React.createElement(ProgressSummary, {
    label: "ความคืบหน้าวิดีโอ",
    color: "#7b83eb",
    summary: videoSummary,
    loading: videoLoading,
    verbs: ["ดูจบ", "กำลังดู", "ยังไม่ได้ดู"]
  })), React.createElement("div", {
    className: "rounded-[14px] border border-slate-200 bg-white p-4"
  }, React.createElement("h3", {
    className: "text-sm font-bold"
  }, "หัวข้อการเรียนรู้รายบท"), React.createElement("p", {
    className: "mt-0.5 text-[11px] text-slate-400"
  }, "สถานะการเรียนและเครื่องมือที่ใช้ในแต่ละบท"), React.createElement("div", {
    className: "mt-3 divide-y divide-slate-100"
  }, chapters.map(activity => React.createElement("div", {
    key: activity.id,
    className: "flex items-center gap-3 py-3"
  }, React.createElement("span", {
    className: "h-2.5 w-2.5 rounded-full",
    style: {
      background: activity.dot
    }
  }), React.createElement("div", {
    className: "min-w-0 flex-1"
  }, React.createElement("div", {
    className: "truncate text-xs font-semibold text-slate-800"
  }, activity.name), React.createElement("div", {
    className: "font-inter text-[10px] text-slate-300"
  }, activity.code)), React.createElement("div", {
    className: "flex flex-wrap justify-end gap-1"
  }, activity.tools.map(tool => React.createElement(ProgressToolBadge, {
    key: `${activity.id}-${tool.id || tool.label}`,
    tool: tool
  }))))))), API.debug && detail?.errors?.length > 0 && React.createElement("div", {
    className: "rounded-[14px] border border-red-200 bg-white p-4 text-[11px] text-red-700"
  }, React.createElement("b", null, "ปัญหาการดึงข้อมูล"), detail.errors.map(message => React.createElement("div", {
    key: message,
    className: "mt-1 break-all font-mono"
  }, message))))));
}
function ProgressRing({
  value
}) {
  return React.createElement("div", {
    className: "relative mx-auto h-[78px] w-[78px] rounded-full",
    style: {
      background: `conic-gradient(#14b8a6 ${value * 3.6}deg,#e5e7eb 0deg)`
    }
  }, React.createElement("span", {
    className: "absolute inset-[10px] flex items-center justify-center rounded-full bg-white font-inter text-lg font-extrabold text-brand-700"
  }, Math.round(value), "%"));
}
function ProgressSummary({
  label,
  color,
  summary,
  loading = false,
  verbs
}) {
  const rows = [[verbs[0], summary.done, "#22c55e"], [verbs[1], summary.doing, "#f97316"], [verbs[2], summary.todo, "#d0d5dd"]];
  return React.createElement("div", {
    className: "rounded-[14px] border border-slate-200 bg-white p-4"
  }, React.createElement("div", {
    className: "mb-3 flex items-center gap-2"
  }, React.createElement("span", {
    className: "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold text-white",
    style: {
      background: color
    }
  }, "▤"), React.createElement("span", {
    className: "text-[13px] font-bold"
  }, label)), React.createElement("div", {
    className: "space-y-2"
  }, rows.map(([name, value, dot]) => React.createElement("div", {
    key: name,
    className: "flex items-center gap-2 text-xs text-slate-500"
  }, React.createElement("span", {
    className: "h-2 w-2 rounded-full",
    style: {
      background: dot
    }
  }), React.createElement("span", {
    className: "flex-1"
  }, name), React.createElement("b", {
    className: "font-inter text-slate-700"
  }, loading ? React.createElement("span", {
    role: "status",
    "aria-label": "กำลังโหลด",
    className: "spinner inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-200 border-t-brand-600 align-middle"
  }) : value ?? "—")))));
}
function ModalShell({
  children,
  onClose,
  wide = false
}) {
  return React.createElement("div", {
    className: "fixed inset-0 z-[1300] flex items-center justify-center p-0 sm:p-6"
  }, React.createElement("button", {
    onClick: onClose,
    className: "absolute inset-0 bg-slate-900/50",
    "aria-label": "ปิด"
  }), React.createElement("div", {
    className: cx("animate-fade-up relative flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-[18px]", wide ? "sm:max-w-[820px]" : "sm:max-w-[420px]")
  }, children));
}
function EditProfileModal({
  teacher,
  onClose,
  onSave
}) {
  const [name, setName] = useState(teacher.name || "");
  return React.createElement(ModalShell, {
    onClose: onClose
  }, React.createElement("div", {
    className: "flex items-center justify-between border-b border-slate-100 px-6 py-5"
  }, React.createElement("div", null, React.createElement("h2", {
    className: "text-lg font-extrabold"
  }, "แก้ไขข้อมูลผู้ใช้"), React.createElement("p", {
    className: "mt-0.5 text-xs text-slate-400"
  }, "อัปเดตชื่อที่แสดงในระบบ")), React.createElement("button", {
    onClick: onClose,
    className: "rounded-lg bg-slate-100 p-2 text-slate-500"
  }, React.createElement(Icon, {
    name: "close",
    size: 15
  }))), React.createElement("div", {
    className: "p-6"
  }, React.createElement("div", {
    className: "mb-5 flex items-center gap-3.5"
  }, React.createElement("span", {
    className: "flex h-14 w-14 items-center justify-center rounded-full border border-teal-100 bg-brand-50 text-xl font-extrabold text-brand-700"
  }, API.initials(name)), React.createElement("button", {
    type: "button",
    className: "rounded-[10px] border border-slate-200 px-3.5 py-2 text-xs font-semibold text-brand-700"
  }, "เปลี่ยนรูปโปรไฟล์")), React.createElement("label", {
    className: "mb-1.5 block text-[13px] font-semibold text-slate-700"
  }, "ชื่อที่แสดง"), React.createElement("input", {
    value: name,
    onChange: event => setName(event.target.value),
    className: "field mb-4 w-full rounded-[11px] border border-slate-200 px-3.5 py-3 text-sm"
  }), React.createElement("label", {
    className: "mb-1.5 block text-[13px] font-semibold text-slate-700"
  }, "อีเมล"), React.createElement("input", {
    value: teacher.email || "",
    readOnly: true,
    className: "w-full rounded-[11px] border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-400"
  })), React.createElement("div", {
    className: "flex justify-end gap-2.5 border-t border-slate-100 px-6 py-4"
  }, React.createElement("button", {
    onClick: onClose,
    className: "rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600"
  }, "ยกเลิก"), React.createElement("button", {
    onClick: () => onSave(name.trim() || teacher.name),
    className: "rounded-full bg-brand-600 px-6 py-2.5 text-[13px] font-bold text-white"
  }, "บันทึก")));
}
function AddClassroomModal({
  teacher,
  onClose,
  onAdded
}) {
  const isStaff = ["staff", "admin"].includes(teacher.role);
  const [filters, setFilters] = useState({
    instituteId: teacher.instituteId || "",
    grade: "",
    level: "",
    classRoom: "",
    from: "",
    to: ""
  });
  const [schoolQuery, setSchoolQuery] = useState(teacher.school || "");
  const [institutes, setInstitutes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef(null);
  const loadCourses = useCallback(async nextFilters => {
    if (!nextFilters.instituteId) {
      setCourses([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = {
        instituteId: nextFilters.instituteId,
        ...(nextFilters.grade ? {
          grade: nextFilters.grade
        } : {}),
        ...(nextFilters.level ? {
          level: nextFilters.level
        } : {}),
        ...(nextFilters.classRoom ? {
          classRoom: nextFilters.classRoom
        } : {}),
        ...(nextFilters.from && nextFilters.to ? {
          createDate: `${nextFilters.from},${nextFilters.to}`
        } : {})
      };
      const payload = await API.endpoints.courses(query);
      setCourses(API.list(payload).map(course => ({
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
  useEffect(() => {
    loadCourses(filters);
  }, []);
  const updateFilter = (key, value) => {
    const next = {
      ...filters,
      [key]: value
    };
    setFilters(next);
    setSelectedCourse("");
    loadCourses(next);
  };
  const searchInstitute = value => {
    setSchoolQuery(value);
    setFilters(current => ({
      ...current,
      instituteId: ""
    }));
    clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setInstitutes([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const payload = await API.endpoints.institutes(value.trim());
        setInstitutes(API.list(payload).map(item => ({
          id: item.instituteId || item.institute_id || "",
          label: `${item.instituteName || item.name || ""}${item.district ? ` (${item.district}${item.province ? `, ${item.province}` : ""})` : ""}`
        })));
      } catch (_) {
        setInstitutes([]);
      }
    }, 450);
  };
  const chooseInstitute = item => {
    setSchoolQuery(item.label);
    setInstitutes([]);
    const next = {
      ...filters,
      instituteId: item.id
    };
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
  const enrollmentRows = courses.flatMap(course => course.enrolls || []);
  const unique = key => [...new Set(enrollmentRows.map(item => item[key]).filter(value => value !== "" && value != null))];
  return React.createElement(ModalShell, {
    onClose: onClose,
    wide: true
  }, React.createElement("div", {
    className: "flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5"
  }, React.createElement("h2", {
    className: "text-xl font-extrabold"
  }, "เพิ่มห้องเรียน"), React.createElement("button", {
    onClick: onClose,
    className: "rounded-lg bg-slate-100 p-2 text-slate-500"
  }, React.createElement(Icon, {
    name: "close",
    size: 15
  }))), React.createElement("div", {
    className: "shrink-0 space-y-3 px-6 pb-2 pt-4"
  }, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("label", {
    className: "shrink-0 text-[13px] font-bold text-slate-700"
  }, React.createElement("span", {
    className: "text-red-500"
  }, "*"), " โรงเรียน:"), React.createElement("div", {
    className: "relative min-w-0 flex-1"
  }, React.createElement("input", {
    value: schoolQuery,
    onChange: event => isStaff && searchInstitute(event.target.value),
    readOnly: !isStaff,
    placeholder: "ค้นหาชื่อโรงเรียน...",
    className: cx("field w-full rounded-[10px] border border-slate-200 px-3 py-2.5 text-[13px]", !isStaff && "bg-slate-50 text-slate-500")
  }), institutes.length > 0 && React.createElement("div", {
    className: "absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-[10px] border border-slate-200 bg-white shadow-float"
  }, institutes.map(item => React.createElement("button", {
    key: item.id,
    onClick: () => chooseInstitute(item),
    className: "block w-full border-b border-slate-50 px-3 py-2.5 text-left text-[13px] hover:bg-slate-50"
  }, item.label))))), React.createElement("div", {
    className: "grid grid-cols-2 gap-2 sm:grid-cols-5"
  }, React.createElement("input", {
    type: "date",
    value: filters.from,
    onChange: event => updateFilter("from", event.target.value),
    className: "field rounded-[10px] border border-slate-200 px-2.5 py-2 text-xs"
  }), React.createElement("input", {
    type: "date",
    value: filters.to,
    onChange: event => updateFilter("to", event.target.value),
    className: "field rounded-[10px] border border-slate-200 px-2.5 py-2 text-xs"
  }), React.createElement(FilterSelect, {
    value: filters.grade,
    onChange: value => updateFilter("grade", value),
    placeholder: "ระดับชั้น",
    options: unique("grade"),
    labels: API.gradeLabels
  }), React.createElement(FilterSelect, {
    value: filters.level,
    onChange: value => updateFilter("level", value),
    placeholder: "ชั้นปี",
    options: unique("level")
  }), React.createElement(FilterSelect, {
    value: filters.classRoom,
    onChange: value => updateFilter("classRoom", value),
    placeholder: "ห้องเรียน",
    options: unique("classRoom")
  }))), React.createElement("div", {
    className: "scrolly flex min-h-[280px] flex-1 flex-col gap-2.5 px-6 py-3"
  }, loading ? React.createElement(Spinner, {
    label: "กำลังโหลดรายวิชา..."
  }) : error ? React.createElement("div", {
    className: "p-10 text-center text-sm font-semibold text-red-600"
  }, error) : courses.length ? courses.map(course => React.createElement("button", {
    key: course.courseId,
    onClick: () => setSelectedCourse(selectedCourse === course.courseId ? "" : course.courseId),
    className: cx("card-lift flex items-center gap-3 rounded-[13px] border p-4 text-left", selectedCourse === course.courseId ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white")
  }, React.createElement("span", {
    className: "min-w-0 flex-1 text-sm font-semibold text-slate-800"
  }, course.name), React.createElement("span", {
    className: cx("flex h-6 w-6 items-center justify-center rounded-full border", selectedCourse === course.courseId ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-slate-50 text-slate-300")
  }, React.createElement(Icon, {
    name: "check",
    size: 13,
    strokeWidth: 3
  })))) : React.createElement("div", {
    className: "p-10 text-center text-sm font-semibold text-slate-400"
  }, isStaff && !filters.instituteId ? "เลือกโรงเรียนเพื่อดูรายวิชา" : "ไม่พบรายวิชาตามเงื่อนไข")), React.createElement("div", {
    className: "flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-6 py-4"
  }, selectedCourse && React.createElement("span", {
    className: "mr-auto text-xs font-semibold text-brand-700"
  }, "เลือกแล้ว 1 รายวิชา"), React.createElement("button", {
    onClick: onClose,
    className: "rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600"
  }, "ยกเลิก"), React.createElement("button", {
    onClick: save,
    disabled: !selectedCourse || saving,
    className: "rounded-full bg-brand-600 px-6 py-2.5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-teal-200"
  }, saving ? "กำลังบันทึก..." : "เพิ่มห้องเรียน")));
}
function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  labels = {}
}) {
  return React.createElement("select", {
    value: value,
    onChange: event => onChange(event.target.value),
    className: "field min-w-0 rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600"
  }, React.createElement("option", {
    value: ""
  }, placeholder), options.map(option => React.createElement("option", {
    key: option,
    value: option
  }, labels[option] || option)));
}
function RemoveModal({
  course,
  onClose,
  onRemoved
}) {
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
    } finally {
      setSaving(false);
    }
  };
  return React.createElement(ModalShell, {
    onClose: saving ? undefined : onClose
  }, React.createElement("div", {
    className: "flex gap-3.5 p-6 pb-5"
  }, React.createElement("span", {
    className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
  }, React.createElement(Icon, {
    name: "alert",
    size: 22
  })), React.createElement("div", null, React.createElement("h2", {
    className: "text-base font-extrabold"
  }, "นำห้องเรียนออกจากรายการ"), React.createElement("p", {
    className: "mt-1.5 text-xs leading-5 text-slate-500"
  }, "ห้องเรียน ", React.createElement("b", {
    className: "text-slate-700"
  }, course.title), " จะถูกนำออกจากรายการของคุณ"))), error && React.createElement("div", {
    className: "mx-6 mb-3 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600"
  }, error), React.createElement("div", {
    className: "flex justify-end gap-2.5 border-t border-slate-100 px-6 py-4"
  }, React.createElement("button", {
    onClick: onClose,
    disabled: saving,
    className: "rounded-full border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600"
  }, "ยกเลิก"), React.createElement("button", {
    onClick: remove,
    disabled: saving,
    className: "rounded-full bg-red-600 px-6 py-2.5 text-[13px] font-bold text-white disabled:bg-red-300"
  }, saving ? "กำลังนำออก..." : "นำออก")));
}
function LoadingOverlay() {
  return React.createElement("div", {
    className: "fixed inset-0 z-[1400] flex items-center justify-center bg-slate-100/70 backdrop-blur-sm"
  }, React.createElement("div", {
    className: "rounded-2xl border border-slate-200 bg-white px-9 py-6 shadow-float"
  }, React.createElement(Spinner, {
    label: "กำลังโหลดข้อมูลห้องเรียน..."
  })));
}
function ErrorToast({
  message,
  onClose
}) {
  return React.createElement("div", {
    className: "fixed left-1/2 top-[70px] z-[1500] flex w-[min(520px,calc(100vw-24px))] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-white px-4 py-3 shadow-float"
  }, React.createElement("span", null, "⚠️"), React.createElement("span", {
    className: "flex-1 text-xs font-semibold leading-5 text-red-700"
  }, message), React.createElement("button", {
    onClick: onClose,
    className: "rounded-lg bg-red-50 p-1.5 text-red-700"
  }, React.createElement(Icon, {
    name: "close",
    size: 13
  })));
}
function SessionExpired() {
  return React.createElement("div", {
    className: "fixed inset-0 z-[1600] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
  }, React.createElement("div", {
    className: "w-full max-w-[420px] rounded-[18px] bg-white p-7 text-center shadow-2xl"
  }, React.createElement("span", {
    className: "mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-orange-50 text-2xl font-extrabold text-orange-700"
  }, "!"), React.createElement("h2", {
    className: "mt-4 text-xl font-extrabold"
  }, "เซสชันหมดอายุ"), React.createElement("p", {
    className: "mt-2 text-[13px] leading-6 text-slate-500"
  }, "เพื่อความปลอดภัย ระบบได้ออกจากระบบแล้ว กรุณาเข้าสู่ระบบอีกครั้งเพื่อโหลดข้อมูลต่อ"), React.createElement("button", {
    onClick: API.startLogin,
    className: "mt-5 w-full rounded-full bg-gradient-to-r from-teal-500 to-brand-600 px-5 py-3 text-sm font-bold text-white"
  }, "เข้าสู่ระบบอีกครั้ง")));
}
ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App, null));
