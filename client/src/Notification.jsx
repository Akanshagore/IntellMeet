import { useState } from "react";
import "./Notification.css";

function Notification() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="notification-container">
      <button
        type="button"
        className="notification-btn"
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        ♧
      </button>

      {showNotifications && (
        <div className="notification-popup">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button onClick={() => setShowNotifications(false)}>
              ×
            </button>
          </div>

          <div className="notification-content">
            <span className="notification-icon">🔔</span>
            <h4>No new notifications</h4>
            <p>You are all caught up!</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notification;