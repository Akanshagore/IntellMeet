import React from "react";
import "./Dashboard.css";

export default function Dashboard({
  user,
  meetings,
  meetingsLoading,
  meetingsError,
  onCreateMeeting,
  onEditMeeting,
  onDeleteMeeting,
  onOpenCalendar,
  onJoinMeeting,
}) {
  const displayName =
    user?.name || user?.fullName || user?.username || "User";

  return (
    <main className="main-content" id="dashboard">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>
            Good morning, {displayName} <span>✦</span>
          </h1>
          <p className="welcome-text">
            Here is what is happening with your meetings today.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onCreateMeeting}
        >
          ＋ Create meeting
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Meetings today</span>
            <span className="stat-icon lavender">▦</span>
          </div>
          <h2>
            {meetings.filter((meeting) => {
              if (!meeting.scheduledAt) return false;

              const meetingDate = new Date(meeting.scheduledAt);
              const today = new Date();

              return (
                meetingDate.getDate() === today.getDate() &&
                meetingDate.getMonth() === today.getMonth() &&
                meetingDate.getFullYear() === today.getFullYear()
              );
            }).length}
          </h2>
          <p>Meetings scheduled for today</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Hours in meetings</span>
            <span className="stat-icon sky">◷</span>
          </div>
          <h2>{meetings.length}</h2>
          <p>Total scheduled meetings</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>AI summaries</span>
            <span className="stat-icon mint">✧</span>
          </div>
          <h2>0</h2>
          <p>Summaries created</p>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Team members</span>
            <span className="stat-icon peach">♧</span>
          </div>
          <h2>
            {new Set(
              meetings.flatMap((meeting) => meeting.participants || [])
            ).size}
          </h2>
          <p>Unique meeting participants</p>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel meetings-panel" id="meetings">
          <div className="panel-heading">
            <div>
              <h2>Upcoming meetings</h2>
              <p>Your scheduled team meetings.</p>
            </div>

            <button
              type="button"
              className="dashboard-text-button"
              onClick={onOpenCalendar}
            >
              View calendar →
            </button>
          </div>

          <div className="meeting-list">
            {meetingsLoading && (
              <p>Loading your meetings...</p>
            )}

            {meetingsError && (
              <p role="alert" className="dashboard-error">
                {meetingsError}
              </p>
            )}

            {!meetingsLoading &&
              !meetingsError &&
              meetings.length === 0 && (
                <p>No meetings yet. Create your first meeting!</p>
              )}

            {!meetingsLoading &&
              [...meetings]
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt) -
                    new Date(b.scheduledAt)
                )
                .map((meeting) => (
                  <article
                    className="meeting-card"
                    key={meeting._id}
                  >
                    <div className="meeting-symbol purple">▦</div>

                    <div className="meeting-info">
                      <span className="meeting-tag">
                        TEAM MEETING
                      </span>

                      <h3>{meeting.title}</h3>

                      <p>
                        ◷{" "}
                        {meeting.scheduledAt
                          ? new Date(
                              meeting.scheduledAt
                            ).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Date not set"}
                        {" · "}
                        {meeting.participants?.length || 0} participants
                      </p>
                    </div>

                    <div className="dashboard-meeting-actions">
                      <button
                        type="button"
                        className="join-button"
                        onClick={() => onJoinMeeting(meeting)}
                      >
                        Join
                      </button>

                      <button
                        type="button"
                        className="join-button"
                        onClick={() => onEditMeeting(meeting)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="join-button"
                        onClick={() => onDeleteMeeting(meeting)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
          </div>

          <div className="panel-footer">
            <span>Showing your meetings</span>
            <button
              type="button"
              className="dashboard-text-button"
              onClick={onOpenCalendar}
            >
              View calendar →
            </button>
          </div>
        </div>

        <div className="right-column">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Get things done faster.</p>
              </div>
            </div>

            <div className="quick-actions">
              <button
                className="quick-action"
                onClick={onCreateMeeting}
              >
                <span className="quick-icon lavender">＋</span>
                <span className="quick-text">
                  <strong>New meeting</strong>
                  <small>Schedule a meeting</small>
                </span>
                <span>→</span>
              </button>

              <button
                className="quick-action"
                onClick={() => onJoinMeeting(null)}
              >
                <span className="quick-icon sky">↗️</span>
                <span className="quick-text">
                  <strong>Join meeting</strong>
                  <small>Open meeting room</small>
                </span>
                <span>→</span>
              </button>

              <button
                className="quick-action"
                onClick={() =>
                  window.alert("AI summaries will be added next.")
                }
              >
                <span className="quick-icon mint">✧</span>
                <span className="quick-text">
                  <strong>AI summary</strong>
                  <small>Review key takeaways</small>
                </span>
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="panel ai-panel">
            <div className="ai-heading">
              <div className="ai-sparkle">✧</div>
              <div>
                <h2>AI Meeting Insights</h2>
                <p>Your meetings, made smarter.</p>
              </div>
            </div>

            <div className="ai-highlight">
              <span className="meeting-tag">AI FEATURES</span>
              <h3>Meeting summaries</h3>
              <p>AI summaries are not connected yet.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <span>© 2026 IntellMeet</span>
        <span>Designed for better collaboration ♥️</span>
      </footer>
    </main>
  );
}