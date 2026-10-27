# IntellMeet – AI-Powered Enterprise Meeting & Collaboration Platform

IntellMeet is a MERN stack-based meeting and collaboration platform designed to simplify online meetings, team communication, and meeting management. It provides features for scheduling meetings, inviting participants through shareable links, real-time messaging, and video conferencing.

The platform aims to enhance productivity by bringing meeting management and collaboration tools together in one place, with AI-powered features planned for smarter meeting experiences.

## 🚀 Features

- **User Authentication:** Secure user registration and login using JWT.
- **Dashboard:** View and manage meetings from a centralized dashboard.
- **Meeting Scheduling:** Create meetings with titles, descriptions, start times, and end times.
- **Meeting Management:** View, edit, and manage upcoming, live, and expired meetings.
- **Meeting Invitations:** Generate and share meeting links with participants.
- **Guest Joining:** Allow participants to join meetings using an invitation link and their name.
- **Real-Time Messaging:** Communicate with meeting participants through chat.
- **Video Conferencing:** Support for real-time audio and video communication.
- **Participant Management:** Track participants joining and leaving meetings.
- **Calendar:** Organize and view scheduled meetings.
- **Responsive Interface:** Designed for convenient use across different screen sizes.
- **AI-Powered Enhancements:** Planned features include AI-generated meeting summaries and recording support.

## 🛠️ Technology Stack

### Frontend
- React.js
- Vite
- HTML5
- CSS3
- JavaScript
- React Router DOM

### Backend
- Node.js
- Express.js
- REST API
- JSON Web Token (JWT)
- Socket.IO

### Database
- MongoDB
- Mongoose

### Real-Time Communication
- Socket.IO for real-time messaging and meeting events
- WebRTC for peer-to-peer audio and video communication

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Postman

## 🏗️ Project Architecture

```text
IntellMeet/
│
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       │   └── pages/
│       ├── components/
│       ├── App.jsx
│       └── main.jsx
│
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Meeting.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── meetingRoutes.js
│   │   └── messageRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── socket/
│   │   └── meetingSocket.js
│   └── server.js
│
├── .gitignore
└── README.md
```

*Note: The directory structure above is illustrative. Adjust it to match your actual project folders and files.*

## ⚙️ Installation and Setup

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- MongoDB
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Akanshagore/IntellMeet.git
cd IntellMeet
```

### 2. Set Up the Backend

Open a terminal in the project directory:

```bash
cd server
npm install
```

Create a `.env` file in the backend directory and configure the environment variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/intellmeet
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

Replace `your_secret_key` with a secure secret. Never upload real credentials or secrets to GitHub.

Start the backend server:

```bash
npm run dev
```

If your project does not have a `dev` script, use the start command defined in your backend `package.json`.

### 3. Set Up the Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

### 4. Open the Application

Visit the following URLs in your browser:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

The backend URL may display a health-check message when the server is running.

## 🔄 How It Works

1. Users register or log in to their accounts.
2. The dashboard displays meeting-related information.
3. The meeting host creates a meeting with a scheduled start and end time.
4. Participants receive a shareable meeting invitation link.
5. Participants join the meeting using the supported joining flow.
6. Users communicate through real-time chat and available audio/video features.
7. The host manages the meeting and participants.
8. AI-based meeting summaries and additional enhancements can be integrated as the project evolves.

## 🔐 Security

- JWT-based authentication for protected routes.
- Password hashing should be used for securely storing user passwords.
- Environment variables for sensitive configuration.
- Input validation and error handling for API requests.
- Protected meeting-management operations.

## 🎯 Project Objectives

- Simplify online meeting scheduling and management.
- Enable real-time collaboration among team members.
- Provide convenient meeting invitations through shareable links.
- Integrate video communication and messaging into a single platform.
- Build a foundation for AI-assisted meeting productivity.

## 🔮 Future Enhancements

- AI-generated meeting summaries.
- Automatic transcription of meeting conversations.
- Meeting recording and playback.
- AI-based action-item extraction.
- Screen sharing and advanced conference controls.
- Notifications and calendar integration.
- Improved support for multi-participant video conferencing.
- Cloud deployment and production-ready infrastructure.

## 👩‍💻 Developed By

**Akansha Arjun Gore**

Computer Engineering Student

Project: IntellMeet – AI-Powered Enterprise Meeting & Collaboration Platform

Technology: MERN Stack

GitHub: [Akanshagore](https://github.com/Akanshagore)

## 📄 License

This project is developed for educational and learning purposes. A formal open-source license can be added to the repository if the project is intended for public reuse.

---

⭐ If you find this project interesting, consider giving the repository a star!
