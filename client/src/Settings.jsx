import { useEffect, useState } from "react";

function Settings() {
  const [user, setUser] = useState({});
  const [theme, setTheme] = useState(
    localStorage.getItem("intellmeet_theme") || "light"
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem("intellmeet_notifications") !== "false"
  );

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem("intellmeet_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Unable to load user details:", error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("intellmeet_theme", theme);
  }, [theme]);

  const handleNotificationChange = (checked) => {
    setNotifications(checked);
    localStorage.setItem("intellmeet_notifications", String(checked));
  };

  return (
    <main className="main-content">
      <div style={{ marginBottom: "25px" }}>
        <h2>Settings</h2>
        <p>Manage your IntellMeet account preferences.</p>
      </div>

      {/* Profile Settings */}
      <section className="settings-card">
        <h3>Profile Settings</h3>

        <div className="settings-info">
          <p><strong>Name:</strong> {user.name || user.fullName || "Not available"}</p>
          <p><strong>Email:</strong> {user.email || user.emailId || "Not available"}</p>
        </div>
      </section>

      {/* Appearance Settings */}
      <section className="settings-card">
        <h3>Appearance</h3>
        <p>Choose your preferred dashboard theme.</p>

        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="settings-select"
        >
          <option value="light">Light Mode</option>
          <option value="dark">Dark Mode</option>
        </select>
      </section>

      {/* Notification Settings */}
      <section className="settings-card">
        <h3>Notification Settings</h3>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => handleNotificationChange(e.target.checked)}
          />
          Enable meeting notifications
        </label>
      </section>

      {/* Password Settings */}
      <section className="settings-card">
        <h3>Security</h3>
        <p>Change Password</p>
        <button
          type="button"
          disabled
          title="Password change API is not connected yet"
        >
          Change Password (Coming Soon)
        </button>
      </section>
    </main>
  );
}

export default Settings;