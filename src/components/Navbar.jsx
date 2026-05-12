import { useState } from "react";

function Navbar({ addTab }) {
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("READ LATER");
  const [showDropdown, setShowDropdown] = useState(false);

  const [useTimer, setUseTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(60);

  const [useDeadline, setUseDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState("");

  function handleCapture() {
    if (!url.trim() || !reason.trim()) return;

    const remindAt = useTimer
      ? Date.now() + Number(timerMinutes) * 60 * 1000
      : null;

    const deadlineAt =
      useDeadline && deadlineDate
        ? new Date(`${deadlineDate}T23:59:59`).getTime()
        : null;

    addTab(url, reason, category, remindAt, deadlineAt);

    setUrl("");
    setReason("");
    setCategory("READ LATER");
    setUseTimer(false);
    setTimerMinutes(60);
    setUseDeadline(false);
    setDeadlineDate("");
    setShowDropdown(false);
  }

  return (
    <div className="navbar-wrapper">
      <div className="logo">
        <h2>KEEPER.</h2>
      </div>

      <div className="navbar">
        <input
          type="text"
          placeholder="Paste URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <input
          type="text"
          placeholder="The 'Why' (mandatory)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="dropdown">
          <button
            className="dropdown-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {category} ▼
          </button>

          {showDropdown && (
            <div className="dropdown-menu">
              <div
                onClick={() => {
                  setCategory("READ LATER");
                  setShowDropdown(false);
                }}
              >
                READ LATER
              </div>
              <div
                onClick={() => {
                  setCategory("TO BUY");
                  setShowDropdown(false);
                }}
              >
                TO BUY
              </div>
              <div
                onClick={() => {
                  setCategory("RESEARCH");
                  setShowDropdown(false);
                }}
              >
                RESEARCH
              </div>
              <div
                onClick={() => {
                  setCategory("WATCH");
                  setShowDropdown(false);
                }}
              >
                WATCH
              </div>
            </div>
          )}
        </div>

        <div className="timer-box">
          <label className="timer-label">
            <input
              type="checkbox"
              checked={useTimer}
              onChange={(e) => setUseTimer(e.target.checked)}
            />
            Timer
          </label>

          {useTimer && (
            <div className="timer-wrapper">
              <input
                className="timer-input"
                type="number"
                min="1"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
              />
              <span className="timer-unit">min</span>
            </div>
          )}
        </div>

        <div className="deadline-box">
          <label className="timer-label">
            <input
              type="checkbox"
              checked={useDeadline}
              onChange={(e) => setUseDeadline(e.target.checked)}
            />
            Deadline
          </label>

          {useDeadline && (
            <input
              className="deadline-input"
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
            />
          )}
        </div>

        <button className="capture-btn" onClick={handleCapture}>
          CAPTURE
        </button>
      </div>
    </div>
  );
}

export default Navbar;