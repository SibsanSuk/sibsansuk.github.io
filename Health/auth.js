// auth.js
const h = window.React.createElement;

const AuthContext = React.createContext(null);

function loadSavedUser(){
  try {
    return JSON.parse(localStorage.getItem('authUser') || sessionStorage.getItem('authUser'));
  } catch(e){ return null; }
}

// ==== กำหนดบัญชีเริ่มต้น (เปลี่ยนได้ภายหลัง) ====
const VALID = { username: "nectec", password: "nectec", displayName: "NECTEC User" };

export function AuthProvider({ children }){
  const [user, setUser] = React.useState(loadSavedUser());

  /**
   * login() จะคืนค่า { ok: true } เมื่อสำเร็จ
   * ถ้าไม่ผ่านจะได้ { ok:false, message:"..." }
   */
  const login = ({ username, password, remember }) => {
    const ok = username === VALID.username && password === VALID.password;
    if (!ok) return { ok:false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };

    const u = { username, name: VALID.displayName, ts: Date.now() };
    setUser(u);
    const store = remember ? localStorage : sessionStorage;
    store.setItem('authUser', JSON.stringify(u));
    // ลบอีกที่หนึ่งกันสับสน
    (remember ? sessionStorage : localStorage).removeItem('authUser');
    return { ok:true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authUser');
    sessionStorage.removeItem('authUser');
  };

  const value = React.useMemo(() => ({ user, login, logout }), [user]);
  return h(AuthContext.Provider, { value }, children);
}

export function useAuth(){ return React.useContext(AuthContext); }

// ---- Protect routes (React Router v5) ----
export function PrivateRoute({ component: Component, ...rest }){
  const { Route, Redirect } = window.ReactRouterDOM;
  const { user } = React.useContext(AuthContext);

  return h(Route, {
    ...rest,
    render: (props) => user
      ? h(Component, props)
      : h(Redirect, { to: { pathname: '/login', state: { from: props.location.pathname } } })
  });
}
