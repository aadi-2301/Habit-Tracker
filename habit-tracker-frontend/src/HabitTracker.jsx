import { useState, useEffect } from "react";

const API = "http://localhost:3001/api";

const COLORS = ["#1D9E75", "#D85A30", "#378ADD", "#D4537E", "#BA7517", "#534AB7"];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const sorted = [...logs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
  let streak = 0;
  let cur = new Date();
  cur.setHours(0, 0, 0, 0);
  for (const log of sorted) {
    const d = new Date(log.log_date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((cur - d) / 86400000);
    if (diff <= 1 && log.status === "done") {
      streak++;
      cur = d;
    } else break;
  }
  return streak;
}

export default function HabitTracker() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [logs, setLogs] = useState({});
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [newHabit, setNewHabit] = useState({ habit_name: "", description: "", frequency: "daily", start_date: new Date().toISOString().split("T")[0] });
  const [newGoal, setNewGoal] = useState({ goal_name: "", status: "in progress" });
  const [tab, setTab] = useState("habits");
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ht_user");
    if (saved) { setUser(JSON.parse(saved)); setPage("dashboard"); }
  }, []);

  useEffect(() => {
    if (user) { fetchHabits(); fetchGoals(); }
  }, [user]);

  async function fetchHabits() {
    try {
      const r = await fetch(`${API}/habits/${user.user_id}`);
      const data = await r.json();
      setHabits(data);
      data.forEach(h => fetchLogs(h.habit_id));
    } catch { setMsg("Could not connect to backend. Is your server running?"); }
  }

  async function fetchGoals() {
    try {
      const r = await fetch(`${API}/goals/${user.user_id}`);
      const data = await r.json();
      setGoals(data);
    } catch {}
  }

  async function fetchLogs(habit_id) {
    try {
      const r = await fetch(`${API}/logs/${habit_id}`);
      const data = await r.json();
      setLogs(prev => ({ ...prev, [habit_id]: data }));
    } catch {}
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email_id: form.email, password: form.password }) });
      const data = await r.json();
      if (data.user) { setUser(data.user); localStorage.setItem("ht_user", JSON.stringify(data.user)); setPage("dashboard"); setMsg(""); }
      else setMsg(data.error || "Invalid credentials");
    } catch { setMsg("Cannot reach server. Is your backend running on port 3001?"); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email_id: form.email, password: form.password }) });
      const data = await r.json();
      if (data.user_id) { setMsg("Registered! Please login."); setPage("login"); }
      else setMsg(data.error || "Registration failed");
    } catch { setMsg("Cannot reach server."); }
  }

  async function addHabit(e) {
    e.preventDefault();
    try {
      await fetch(`${API}/habits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newHabit, user_id: user.user_id }) });
      setAdding(false);
      setNewHabit({ habit_name: "", description: "", frequency: "daily", start_date: new Date().toISOString().split("T")[0] });
      fetchHabits();
    } catch { setMsg("Failed to add habit"); }
  }

  async function addGoal(e) {
    e.preventDefault();
    try {
      await fetch(`${API}/goals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newGoal, user_id: user.user_id }) });
      setNewGoal({ goal_name: "", status: "in progress" });
      fetchGoals();
    } catch {}
  }

  async function logHabit(habit_id, status) {
    try {
      await fetch(`${API}/logs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit_id, log_date: new Date().toISOString().split("T")[0], status, note: "" }) });
      fetchLogs(habit_id);
    } catch {}
  }

  async function deleteHabit(habit_id) {
    try {
      await fetch(`${API}/habits/${habit_id}`, { method: "DELETE" });
      fetchHabits();
    } catch {}
  }

  function logout() { localStorage.removeItem("ht_user"); setUser(null); setHabits([]); setGoals([]); setPage("login"); }

  const todayStr = new Date().toISOString().split("T")[0];
  const doneToday = habits.filter(h => logs[h.habit_id]?.some(l => l.log_date?.split("T")[0] === todayStr && l.status === "done")).length;

  const styles = {
    app: { minHeight: "100vh", background: "#f7f6f3", fontFamily: "system-ui, -apple-system, sans-serif" },
    nav: { background: "#fff", borderBottom: "0.5px solid #e5e3dd", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" },
    logo: { fontWeight: 700, fontSize: "18px", color: "#1D9E75", letterSpacing: "-0.5px" },
    navRight: { display: "flex", gap: "1rem", alignItems: "center" },
    userBadge: { fontSize: "13px", color: "#6b6b6b" },
    logoutBtn: { background: "none", border: "0.5px solid #d0cfc9", borderRadius: "8px", padding: "5px 14px", cursor: "pointer", fontSize: "13px", color: "#555" },
    main: { maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" },
    tabs: { display: "flex", gap: "4px", marginBottom: "1.5rem", background: "#ededea", padding: "4px", borderRadius: "10px", width: "fit-content" },
    tab: { padding: "6px 20px", borderRadius: "7px", border: "none", background: "none", cursor: "pointer", fontSize: "14px", color: "#666", fontWeight: 400 },
    tabActive: { background: "#fff", color: "#111", fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.5rem" },
    statCard: { background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "0.5px solid #e5e3dd" },
    statNum: { fontSize: "28px", fontWeight: 600, color: "#111", lineHeight: 1.1 },
    statLabel: { fontSize: "12px", color: "#999", marginTop: "4px" },
    habitGrid: { display: "grid", gap: "12px" },
    habitCard: { background: "#fff", borderRadius: "12px", border: "0.5px solid #e5e3dd", padding: "1rem 1.25rem" },
    habitTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
    habitName: { fontSize: "15px", fontWeight: 500, color: "#111" },
    habitMeta: { fontSize: "12px", color: "#999", marginTop: "3px" },
    habitActions: { display: "flex", gap: "6px", marginTop: "12px" },
    doneBtn: { flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: "#e1f5ee", color: "#0f6e56", cursor: "pointer", fontSize: "13px", fontWeight: 500 },
    skipBtn: { padding: "7px 14px", borderRadius: "8px", border: "0.5px solid #e5e3dd", background: "none", color: "#999", cursor: "pointer", fontSize: "13px" },
    delBtn: { padding: "7px 10px", borderRadius: "8px", border: "none", background: "#faece7", color: "#993c1d", cursor: "pointer", fontSize: "13px" },
    streakBadge: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#faeeda", color: "#854f0b", fontSize: "12px", padding: "2px 8px", borderRadius: "6px" },
    doneBadge: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#e1f5ee", color: "#0f6e56", fontSize: "12px", padding: "2px 8px", borderRadius: "6px" },
    addCard: { background: "#fff", borderRadius: "12px", border: "0.5px dashed #c9c8c3", padding: "1.25rem", marginTop: "12px" },
    input: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "0.5px solid #d5d3cd", background: "#faf9f7", fontSize: "14px", marginBottom: "8px", outline: "none", fontFamily: "inherit" },
    select: { width: "100%", padding: "8px 12px", borderRadius: "8px", border: "0.5px solid #d5d3cd", background: "#faf9f7", fontSize: "14px", marginBottom: "8px", fontFamily: "inherit" },
    submitBtn: { width: "100%", padding: "9px", borderRadius: "8px", background: "#1D9E75", color: "#fff", border: "none", fontWeight: 500, fontSize: "14px", cursor: "pointer" },
    addBtn: { background: "none", border: "0.5px solid #d5d3cd", borderRadius: "8px", padding: "7px 16px", cursor: "pointer", fontSize: "13px", color: "#555", marginBottom: "12px" },
    authWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f6f3" },
    authCard: { background: "#fff", borderRadius: "16px", padding: "2.5rem 2rem", width: "100%", maxWidth: "380px", border: "0.5px solid #e5e3dd" },
    authTitle: { fontSize: "22px", fontWeight: 600, marginBottom: "1.5rem", color: "#111" },
    authLink: { background: "none", border: "none", color: "#1D9E75", cursor: "pointer", fontSize: "14px", textDecoration: "underline" },
    goalCard: { background: "#fff", borderRadius: "12px", border: "0.5px solid #e5e3dd", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
    goalStatus: { fontSize: "12px", padding: "2px 8px", borderRadius: "6px" },
    err: { background: "#fcebeb", color: "#a32d2d", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", marginBottom: "12px" },
    miniDots: { display: "flex", gap: "3px", marginTop: "8px" },
    dot: { width: "8px", height: "8px", borderRadius: "2px" },
  };

  if (page === "login" || page === "register") {
    return (
      <div style={styles.authWrap}>
        <div style={styles.authCard}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "32px", marginBottom: "4px" }}>🌱</div>
            <div style={{ ...styles.logo, fontSize: "22px" }}>HabitTracker</div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: 600, marginBottom: "1.25rem", color: "#111" }}>
            {page === "login" ? "Welcome back" : "Create account"}
          </div>
          {msg && <div style={styles.err}>{msg}</div>}
          <form onSubmit={page === "login" ? handleLogin : handleRegister}>
            {page === "register" && (
              <input style={styles.input} placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            )}
            <input style={styles.input} type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            <input style={styles.input} type="password" placeholder="Password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            <button style={styles.submitBtn} type="submit">{page === "login" ? "Log in" : "Sign up"}</button>
          </form>
          <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "14px", color: "#888" }}>
            {page === "login" ? <>No account? <button style={styles.authLink} onClick={() => { setPage("register"); setMsg(""); }}>Sign up</button></> : <>Have an account? <button style={styles.authLink} onClick={() => { setPage("login"); setMsg(""); }}>Log in</button></>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <div style={styles.logo}>🌱 HabitTracker</div>
        <div style={styles.navRight}>
          <span style={styles.userBadge}>{user?.name?.split(" ")[0]}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </nav>
      <div style={styles.main}>
        {msg && <div style={styles.err}>{msg}</div>}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{habits.length}</div>
            <div style={styles.statLabel}>total habits</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNum, color: "#1D9E75" }}>{doneToday}</div>
            <div style={styles.statLabel}>done today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{goals.length}</div>
            <div style={styles.statLabel}>active goals</div>
          </div>
        </div>

        <div style={styles.tabs}>
          {["habits", "goals"].map(t => (
            <button key={t} style={tab === t ? { ...styles.tab, ...styles.tabActive } : styles.tab} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "habits" && (
          <>
            <div style={styles.habitGrid}>
              {habits.map((h, i) => {
                const habitLogs = logs[h.habit_id] || [];
                const streak = getStreak(habitLogs);
                const doneToday = habitLogs.some(l => l.log_date?.split("T")[0] === todayStr && l.status === "done");
                const last7 = Array.from({ length: 7 }, (_, idx) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - idx));
                  const ds = d.toISOString().split("T")[0];
                  const log = habitLogs.find(l => l.log_date?.split("T")[0] === ds);
                  return log?.status === "done" ? "#1D9E75" : log ? "#faece7" : "#f0efeb";
                });
                return (
                  <div key={h.habit_id} style={{ ...styles.habitCard, borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}>
                    <div style={styles.habitTop}>
                      <div>
                        <div style={styles.habitName}>{h.habit_name}</div>
                        <div style={styles.habitMeta}>{h.frequency} · since {formatDate(h.start_date)}</div>
                        {h.description && <div style={{ ...styles.habitMeta, marginTop: "4px", color: "#aaa" }}>{h.description}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
                        {streak > 0 && <span style={styles.streakBadge}>🔥 {streak}d</span>}
                        {doneToday && <span style={styles.doneBadge}>✓ done</span>}
                      </div>
                    </div>
                    <div style={styles.miniDots}>
                      {last7.map((c, idx) => <div key={idx} style={{ ...styles.dot, background: c }} title={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][idx]} />)}
                    </div>
                    <div style={styles.habitActions}>
                      {!doneToday && <button style={styles.doneBtn} onClick={() => logHabit(h.habit_id, "done")}>✓ Mark done</button>}
                      <button style={styles.skipBtn} onClick={() => logHabit(h.habit_id, "skipped")}>Skip</button>
                      <button style={styles.delBtn} onClick={() => deleteHabit(h.habit_id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {adding ? (
              <div style={styles.addCard}>
                <form onSubmit={addHabit}>
                  <input style={styles.input} placeholder="Habit name" value={newHabit.habit_name} onChange={e => setNewHabit(p => ({ ...p, habit_name: e.target.value }))} required />
                  <input style={styles.input} placeholder="Description (optional)" value={newHabit.description} onChange={e => setNewHabit(p => ({ ...p, description: e.target.value }))} />
                  <select style={styles.select} value={newHabit.frequency} onChange={e => setNewHabit(p => ({ ...p, frequency: e.target.value }))}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="weekdays">Weekdays</option>
                  </select>
                  <input style={styles.input} type="date" value={newHabit.start_date} onChange={e => setNewHabit(p => ({ ...p, start_date: e.target.value }))} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={styles.submitBtn} type="submit">Add habit</button>
                    <button style={{ ...styles.submitBtn, background: "none", color: "#888", border: "0.5px solid #ddd" }} type="button" onClick={() => setAdding(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <button style={{ ...styles.addBtn, marginTop: "12px" }} onClick={() => setAdding(true)}>+ Add habit</button>
            )}
          </>
        )}

        {tab === "goals" && (
          <>
            <div style={{ display: "grid", gap: "10px" }}>
              {goals.map(g => (
                <div key={g.goal_id} style={styles.goalCard}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#111" }}>{g.goal_name}</div>
                  <span style={{ ...styles.goalStatus, background: g.status === "completed" ? "#e1f5ee" : "#faeeda", color: g.status === "completed" ? "#0f6e56" : "#854f0b" }}>{g.status}</span>
                </div>
              ))}
            </div>
            <div style={{ ...styles.addCard, marginTop: "12px" }}>
              <form onSubmit={addGoal} style={{ display: "flex", gap: "8px" }}>
                <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="New goal" value={newGoal.goal_name} onChange={e => setNewGoal(p => ({ ...p, goal_name: e.target.value }))} required />
                <select style={{ ...styles.select, marginBottom: 0, width: "140px" }} value={newGoal.status} onChange={e => setNewGoal(p => ({ ...p, status: e.target.value }))}>
                  <option value="in progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
                <button style={{ ...styles.submitBtn, width: "auto", padding: "8px 16px", marginBottom: 0 }} type="submit">Add</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
