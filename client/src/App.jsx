import { useState, useEffect, useCallback } from "react";
import "./App.css";
import Meetings from "./Meetings";

import Auth from "./Auth";
import CreateMeeting from "./CreateMeeting";
import EditMeeting from "./EditMeeting";
import Calendar from "./Calendar";
import MeetingRoom from "./assets/pages/MeetingRoom.jsx";
import Dashboard from "./Dashboard.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SharedMeeting from "./SharedMeeting";

const API_URL = "http://localhost:5000/api";

function AppDashboard() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem("intellmeet_user");
      const token = sessionStorage.getItem("intellmeet_token");

      if (savedUser && token) {
        return JSON.parse(savedUser);
      }
    } catch {
      sessionStorage.removeItem("intellmeet_user");
      sessionStorage.removeItem("intellmeet_token");
    }

    return null;
  });

  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState("");

  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");

  const [activePage, setActivePage] = useState("dashboard");

  // Load meetings from backend
  const loadMeetings = useCallback(async () => {
    const token = sessionStorage.getItem("intellmeet_token");

    if (!token) return;

    setMeetingsLoading(true);
    setMeetingsError("");

    try {
      const response = await fetch(`${API_URL}/meetings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load meetings");
      }

      setMeetings(
        Array.isArray(data.meetings) ? data.meetings : []
      );
    } catch (error) {
      setMeetingsError(
        error.message || "Cannot connect to the backend server"
      );
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadMeetings();
    } else {
      setMeetings([]);
      setMeetingsError("");
    }
  }, [user, loadMeetings]);

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem("intellmeet_token");
    sessionStorage.removeItem("intellmeet_user");

    setUser(null);
    setMeetings([]);
    setActivePage("dashboard");
    setShowCreateMeeting(false);
    setEditingMeeting(null);
  };

  // Delete meeting
  const handleDeleteMeeting = async (meeting) => {
    if (!meeting?._id) return;

   const confirmed = window.confirm(
  `Are you sure you want to delete "${meeting.title}"?`
);
    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem("intellmeet_token");

      const response = await fetch(
       `${API_URL}/meetings/${meeting._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to delete meeting");
      }

      setMeetings((current) =>
        current.filter((item) => item._id !== meeting._id)
      );
    } catch (error) {
      window.alert(error.message || "Unable to delete meeting");
    }
  };

  // Open meeting room
  const handleJoinMeeting = (meeting) => {
  if (meeting?._id) {
    setSelectedMeetingId(meeting._id);
  } else if (meetings.length > 0) {
    setSelectedMeetingId(meetings[0]._id);
  } else {
    window.alert("Please create a meeting first.");
    return;
  }

  setActivePage("messages");
};
    
  // Login screen
  if (!user) {
    return (
      <Auth
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
          setActivePage("dashboard");
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">✳️</span>
          <span>IntellMeet</span>
        </div>

        <p className="menu-label">WORKSPACE</p>

        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("dashboard")}
          >
            ▦ Dashboard
          </button>

          <button
            type="button"
            className={`nav-item ${
              activePage === "meetings" ? "active" : ""
            }`}
            onClick={() => setActivePage("meetings")}
          >
            ▣ My Meetings
          </button>

          <button
            type="button"
            className={`nav-item ${
              activePage === "calendar" ? "active" : ""
            }`}
            onClick={() => setActivePage("calendar")}
          >
            ▦ Calendar
          </button>

          <button
            type="button"
            className={`nav-item ${
              activePage === "messages" ? "active" : ""
            }`}
            onClick={() => setActivePage("messages")}
          >
            ▤ Messages
          </button>
        </nav>

        <p className="menu-label tools-label">TOOLS</p>

        <nav className="nav-menu">
          <button
            type="button"
            className="nav-item"
            onClick={() =>
              window.alert("AI summaries will be added next.")
            }
          >
            ✧ AI Summaries
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() =>
              window.alert("Recordings will be added next.")
            }
          >
            ▷ Recordings
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() =>
              window.alert("Settings will be added next.")
            }
          >
            ⚙️ Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✦</div>
            <strong>Need some help?</strong>
            <p>Explore tips to make your meetings better.</p>

            <button
              type="button"
              onClick={() => window.alert("Guides coming soon!")}
            >
              Explore guides ↗️
            </button>
          </div>

          <div className="profile">
            <div className="avatar">
              {(user.name || user.fullName || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>{user.name || user.fullName || "User"}</strong>
              <small>My workspace</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main page header */}
      <div className="app-page">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace /{" "}
            {activePage === "messages"
              ? "Meeting Room"
              : activePage === "calendar"
              ? "Calendar"
              : activePage === "meetings"
              ? "My Meetings"
              : "Dashboard"}
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="notification"
              aria-label="Notifications"
              onClick={() =>
                window.alert("No new notifications.")
              }
            >
              ♧
            </button>

            <div className="top-avatar">
              {(user.name || user.fullName || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard */}
        {activePage === "dashboard" && (
          <Dashboard
            user={user}
            meetings={meetings}
            meetingsLoading={meetingsLoading}
            meetingsError={meetingsError}
            onCreateMeeting={() => setShowCreateMeeting(true)}
            onEditMeeting={(meeting) => setEditingMeeting(meeting)}
            onDeleteMeeting={handleDeleteMeeting}
            onOpenCalendar={() => setActivePage("calendar")}
            onJoinMeeting={handleJoinMeeting}
          />
        )}

        {/* My Meetings */}
        {activePage === "meetings" && (
  <main className="main-content">
    <Meetings />
  </main>
)}

        {/* Calendar */}
        {activePage === "calendar" && (
          <main className="main-content">
            <Calendar meetings={meetings} />
          </main>
        )}

        {/* Messages / Meeting Room */}
        {activePage === "messages" && (
         <main className="main-content">
       <MeetingRoom
      user={user}
      meetings={meetings}
      selectedMeetingId={selectedMeetingId}
    />
  </main>
)}
      </div>

      {/* Create Meeting Modal */}
      {showCreateMeeting && (
        <CreateMeeting
          onClose={() => setShowCreateMeeting(false)}
          onCreated={(meeting) => {
            if (meeting?._id) {
              setMeetings((current) => {
                const exists = current.some(
                  (item) => item._id === meeting._id
                );

                if (exists) return current;

                return [...current, meeting].sort(
                  (a, b) =>
                    new Date(a.scheduledAt) -
                    new Date(b.scheduledAt)
                );
              });
            } else {
              loadMeetings();
            }

            setShowCreateMeeting(false);
          }}
        />
      )}

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <EditMeeting
          meeting={editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onUpdated={(updatedMeeting) => {
            setMeetings((current) =>
              current
                .map((meeting) =>
                  meeting._id === updatedMeeting._id
                    ? updatedMeeting
                    : meeting
                )
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt) -
                    new Date(b.scheduledAt)
                )
            );

            setEditingMeeting(null);
          }}
        />
      )}
    </div>
  );
}
 function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/meeting/:meetingId"
          element={<SharedMeeting />}
        />
        <Route
          path="*"
          element={<AppDashboard />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
