import { useMemo, useState } from "react";
import "./Calendar.css";

function Calendar({ meetings = [] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
  }, [year, month]);

  const getMeetingsForDay = (day) => {
    if (!day) return [];

    return meetings.filter((meeting) => {
      const date = new Date(meeting.scheduledAt);

      return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      );
    });
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const today = new Date();

  return (
    <section className="calendar-page">
      <div className="calendar-header">
        <div>
          <p className="calendar-eyebrow">YOUR WORKSPACE</p>
          <h1>Meeting Calendar</h1>
          <p>Manage and track your scheduled meetings.</p>
        </div>

        <div className="calendar-controls">
          <button onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>

          <strong>{monthName}</strong>

          <button onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>

          <button
            className="calendar-today"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>
      </div>

      <div className="calendar-stats">
        <div>
          <span>Total meetings this month</span>
          <strong>
            {meetings.filter((meeting) => {
              const date = new Date(meeting.scheduledAt);
              return (
                date.getFullYear() === year &&
                date.getMonth() === month
              );
            }).length}
          </strong>
        </div>

        <div>
          <span>Today's meetings</span>
          <strong>
            {meetings.filter((meeting) => {
              const date = new Date(meeting.scheduledAt);
              return date.toDateString() === today.toDateString();
            }).length}
          </strong>
        </div>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => (
            <div className="calendar-weekday" key={day}>
              {day}
            </div>
          )
        )}

        {days.map((day, index) => {
          const dayMeetings = getMeetingsForDay(day);

          const isToday =
            day &&
            new Date(year, month, day).toDateString() ===
              today.toDateString();

          return (
            <div
              className={`calendar-day ${!day ? "empty-day" : ""} ${
                isToday ? "is-today" : ""
              }`}
              key={`${year}-${month}-${index}`}
            >
              {day && (
                <>
                  <span className="calendar-day-number">{day}</span>

                  <div className="calendar-day-meetings">
                    {dayMeetings.map((meeting) => (
                      <div
                        className="calendar-meeting"
                        key={meeting._id}
                        title={`${meeting.title} — ${new Date(
                          meeting.scheduledAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                      >
                        <strong>{meeting.title}</strong>
                        <small>
                          {new Date(
                            meeting.scheduledAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-footer">
        Showing meetings saved in your IntellMeet workspace.
      </div>
    </section>
  );
}

export default Calendar;
