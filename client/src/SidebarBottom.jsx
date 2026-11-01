
import { createPortal } from "react-dom";

function SidebarBottom({ user, showProfile, setShowProfile }) {
  

  const userName = user?.name || user?.fullName || "User";
  const userEmail = user?.email || user?.emailId || "Not available";

  const handleExploreGuides = () => {
    window.alert(
      "Welcome to IntellMeet Help Center!\n\n" +
      "1. Create a Meeting\n" +
      "2. Share Meeting Link\n" +
      "3. Join Meeting\n" +
      "4. Chat and Screen Sharing\n" +
      "5. View Recordings"
    );
  };

  return (
    <>
      <div className="sidebar-bottom">

        {/* Help Card */}
        <div className="help-card">
          <div className="help-icon">✦</div>
          <strong>Need some help?</strong>
          <p>Explore tips to make your meetings better.</p>

          <button type="button" onClick={handleExploreGuides}>
            Explore guides ↗
          </button>
        </div>

        {/* Profile Button */}
        <button
          type="button"
          className="profile profile-button"
          onClick={() => setShowProfile(true)}
        >
          <div className="avatar">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className="profile-details">
            <strong>{userName}</strong>
            <small>My workspace</small>
          </div>

          <span className="profile-arrow">↗</span>
        </button>
      </div>

      {/* Profile Popup */}
      {showProfile && createPortal(
        <div
          className="profile-modal-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="profile-modal-close"
              onClick={() => setShowProfile(false)}
              type="button"
            >
              ×
            </button>

            <div className="profile-modal-header">
              <div className="profile-modal-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>

              <h2>{userName}</h2>
              <p>IntellMeet Workspace Member</p>
            </div>

            <div className="profile-modal-body">
              <h3>Personal Information</h3>

              <div className="profile-info-row">
                <span>👤 Full Name</span>
                <strong>{userName}</strong>
              </div>

              <div className="profile-info-row">
                <span>✉️ Email Address</span>
                <strong>{userEmail}</strong>
              </div>

              <div className="profile-info-row">
                <span>🏢 Workspace</span>
                <strong>My workspace</strong>
              </div>

              <div className="profile-info-row">
                <span>🔐 Account</span>
                <strong>Active</strong>
              </div>
            </div>

            <button
              type="button"
              className="profile-modal-done"
              onClick={() => setShowProfile(false)}
            >
              Done
            </button>
          </div>
        </div>
      , document.body )}
    </>
  );
}

export default SidebarBottom;

