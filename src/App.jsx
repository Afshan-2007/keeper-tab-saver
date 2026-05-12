import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";

const defaultTabs = [];

function toFullUrl(url) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function getDomain(url) {
  try {
    return new URL(toFullUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
    toFullUrl(url)
  )}`;
}

function formatCountdown(ms) {
  if (ms <= 0) return "Time’s up";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatRelativeTime(timestamp, now) {
  if (!timestamp) return "";

  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function dayKey(timestamp) {
  const d = new Date(timestamp);
  return d.toISOString().slice(0, 10);
}

function App() {
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("keeper-tabs");
    if (!saved) return defaultTabs;

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : defaultTabs;
    } catch {
      return defaultTabs;
    }
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem("keeper-tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.done) return;
      if (tab.notified) return;
      if (!tab.remindAt) return;
      if (now < tab.remindAt) return;

      if (Notification.permission === "granted") {
        new Notification("KEEPER Reminder", {
          body: tab.reason,
        });
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id ? { ...t, notified: true } : t
        )
      );
    });
  }, [now, tabs]);

  function addTab(url, reason, category, remindAt = null, deadlineAt = null) {
    const newTab = {
      id: Date.now(),
      url,
      reason,
      category,
      remindAt,
      deadlineAt,
      notified: false,
      done: false,
      pinned: false,
      createdAt: Date.now(),
      completedAt: null,
      lastOpenedAt: null,
    };

    setTabs((prev) => [newTab, ...prev]);
  }

  function deleteTab(id) {
    setTabs((prev) => prev.filter((tab) => tab.id !== id));
  }

  function toggleDone(id) {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              done: !tab.done,
              completedAt: !tab.done ? Date.now() : null,
            }
          : tab
      )
    );
  }

  function togglePin(id) {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, pinned: !tab.pinned } : tab
      )
    );
  }

  function openLink(id, url) {
    window.open(toFullUrl(url), "_blank", "noopener,noreferrer");

    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, lastOpenedAt: Date.now() } : tab
      )
    );
  }

  function clearAll() {
    setTabs([]);
  }

  const filteredTabs = useMemo(() => {
    return tabs
      .filter((tab) => {
        const matchesSearch =
          tab.url.toLowerCase().includes(search.toLowerCase()) ||
          tab.reason.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === "ALL" || tab.category === filter;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.done !== b.done) return a.done ? 1 : -1;

        const aDue = a.deadlineAt ?? Number.POSITIVE_INFINITY;
        const bDue = b.deadlineAt ?? Number.POSITIVE_INFINITY;
        return aDue - bDue;
      });
  }, [tabs, search, filter]);

  const analytics = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const savedThisWeek = tabs.filter(
      (tab) => tab.createdAt && tab.createdAt >= weekAgo
    ).length;

    const completedThisWeek = tabs.filter(
      (tab) => tab.completedAt && tab.completedAt >= weekAgo
    ).length;

    const activeDays = new Set();
    tabs.forEach((tab) => {
      if (tab.createdAt) activeDays.add(dayKey(tab.createdAt));
      if (tab.completedAt) activeDays.add(dayKey(tab.completedAt));
      if (tab.lastOpenedAt) activeDays.add(dayKey(tab.lastOpenedAt));
    });

    let currentStreak = 0;
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);

    while (activeDays.has(dayKey(cursor.getTime()))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const completionRate = tabs.length
      ? Math.round((tabs.filter((tab) => tab.done).length / tabs.length) * 100)
      : 0;

    return {
      savedThisWeek,
      completedThisWeek,
      currentStreak,
      completionRate,
    };
  }, [tabs, now]);

  return (
    <div>
      <Navbar addTab={addTab} />

      <Hero />

      <div className="controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search saved tabs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-row">
          {["ALL", "READ LATER", "TO BUY", "RESEARCH", "WATCH"].map((item) => (
            <button
              key={item}
              className={filter === item ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <button className="clear-btn" onClick={clearAll}>
          Clear all
        </button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <h4>Total saved</h4>
          <p>{tabs.length}</p>
        </div>

        <div className="stat-card">
          <h4>Read later</h4>
          <p>{tabs.filter((t) => t.category === "READ LATER").length}</p>
        </div>

        <div className="stat-card">
          <h4>Watch</h4>
          <p>{tabs.filter((t) => t.category === "WATCH").length}</p>
        </div>

        <div className="stat-card">
          <h4>To buy</h4>
          <p>{tabs.filter((t) => t.category === "TO BUY").length}</p>
        </div>

        <div className="stat-card">
          <h4>Research</h4>
          <p>{tabs.filter((t) => t.category === "RESEARCH").length}</p>
        </div>
      </div>

      <div className="productivity-section">
        <div className="section-title-row">
          <h3>Productivity analysis</h3>
          <span>Last 7 days</span>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <p>Current streak</p>
            <h4>{analytics.currentStreak} day(s)</h4>
          </div>
          <div className="analytics-card">
            <p>Saved this week</p>
            <h4>{analytics.savedThisWeek}</h4>
          </div>
          <div className="analytics-card">
            <p>Completed this week</p>
            <h4>{analytics.completedThisWeek}</h4>
          </div>
          <div className="analytics-card">
            <p>Completion rate</p>
            <h4>{analytics.completionRate}%</h4>
          </div>
        </div>
      </div>

      <div className="saved-tabs">
        {filteredTabs.map((tab) => {
          const remaining = tab.remindAt ? tab.remindAt - now : null;
          const deadlineRemaining = tab.deadlineAt ? tab.deadlineAt - now : null;
          const isOverdue = tab.deadlineAt && deadlineRemaining <= 0;
          const isDueSoon =
            tab.deadlineAt && deadlineRemaining > 0 && deadlineRemaining <= 24 * 60 * 60 * 1000;

          return (
            <div
              className={[
                "tab-card",
                tab.done ? "done-card" : "",
                tab.pinned ? "pinned-card" : "",
                isOverdue ? "overdue-card" : "",
              ].join(" ")}
              key={tab.id}
            >
              <div className="tab-top">
                <div className="tab-source">
                  <img
                    className="favicon"
                    src={getFaviconUrl(tab.url)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span>{getDomain(tab.url)}</span>
                  {tab.pinned && <span className="mini-badge">Pinned</span>}
                </div>

                <div className="card-actions">
                  <button className="open-btn" onClick={() => openLink(tab.id, tab.url)}>
                    OPEN ↗
                  </button>

                  <button className="pin-btn" onClick={() => togglePin(tab.id)}>
                    {tab.pinned ? "Unpin" : "Pin"}
                  </button>

                  <button className="done-btn" onClick={() => toggleDone(tab.id)}>
                    {tab.done ? "Undo" : "Done"}
                  </button>

                  <button className="delete-btn" onClick={() => deleteTab(tab.id)}>
                    ✕
                  </button>
                </div>
              </div>

              <h3>{tab.url}</h3>

              <p className={tab.done ? "done-text" : ""}>{tab.reason}</p>

              <span className="category-tag">{tab.category}</span>

              {tab.lastOpenedAt && (
                <div className="meta-line">
                  Last opened {formatRelativeTime(tab.lastOpenedAt, now)}
                </div>
              )}

              {tab.deadlineAt && (
                <div className={isOverdue ? "deadline-badge overdue" : isDueSoon ? "deadline-badge soon" : "deadline-badge"}>
                  Deadline: {new Date(tab.deadlineAt).toLocaleDateString()}
                  {isOverdue ? " • overdue" : isDueSoon ? " • due soon" : ""}
                </div>
              )}

              {tab.remindAt && !tab.done && (
                <div
                  className={
                    remaining <= 0
                      ? "timer-countdown done"
                      : "timer-countdown"
                  }
                >
                  {remaining <= 0
                    ? "Reminder time reached"
                    : `Reminds in ${formatCountdown(remaining)}`}
                </div>
              )}

              {tab.done && <div className="done-badge">Marked as done</div>}
            </div>
          );
        })}
      </div>

      <div className="idea-section">
        <p className="idea-title">THE IDEA</p>

        <p className="idea-text">
          You don't have a tab problem. You have a memory problem.
          Keeper holds the reason so the tab can close.
        </p>
      </div>

      <div className="bottom-line"></div>

      <div className="ending-text">
        EVERYTHING HAS A PLACE. EVERYTHING HAS A REASON.
      </div>
    </div>
  );
}

export default App;