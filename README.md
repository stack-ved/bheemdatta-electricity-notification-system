# ⚡ Bheemdatta NEA
### Smart Electricity Outage Notification & Reporting Platform

<p align="center">
  <strong>Connecting Citizens • Improving Communication • Powering Bheemdatta</strong>
</p>

<p align="center">
  🇳🇵 Built for Bheemdatta Municipality, Kanchanpur, Sudurpashchim Province, Nepal
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=for-the-badge" alt="Project Status"/>
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Backend-Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
</p>

---

## 🌐 About the Project

**Bheemdatta NEA** is a web-based electricity information and notification platform designed to improve communication between residents and municipal administrators in Bheemdatta Municipality, Nepal.

The platform helps residents stay informed about scheduled and unexpected electricity outages, receive relevant notifications, and report electricity-related problems. Municipal administrators can publish electricity notices and manage outage information for individual wards or the entire municipality.

By combining modern web technologies with real-time communication capabilities, Bheemdatta NEA aims to make electricity-related information more accessible, organized, and convenient for local communities.

## 🎯 Our Mission

To build a smarter, more connected community by making electricity outage information and problem reporting accessible to residents through a reliable, user-friendly digital platform.

## ✨ Key Features

### ⚡ Electricity Outage Notifications
- Publish electricity outage announcements.
- Notify residents about affected areas and outage schedules.
- Support ward-specific and municipality-wide notices.
- Display relevant electricity information through the web application.

### 📍 Ward-Based Communication
- Designed for all 19 wards of Bheemdatta Municipality.
- Target notifications to affected wards.
- Support municipality-wide announcements.
- Associate resident accounts with their selected ward.

### 🔔 Multi-Channel Notifications
- In-app notifications.
- Email notifications for affected residents.
- Browser push notifications where supported and permitted.
- Notification delivery tracking for supported channels.

### 📝 Electricity Problem Reporting
- Allow residents to submit electricity-related problem reports.
- Organize submitted reports for administrative review.
- Support evidence uploads where configured.

### 👥 Role-Based Access
- **Resident:** Access electricity notices, receive notifications, and report problems.
- **Municipality Administrator:** Manage electricity notices and relevant administrative workflows across the municipality.

### 🎨 Modern User Experience
- Responsive interface for desktop and mobile devices.
- English and Nepali language support.
- Dark and light appearance modes.
- Smooth page transitions and scrolling effects.
- Electricity-themed loading animation.
- Browser notification and location permissions when needed.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Interactive user interface |
| Vite | Development server and production build |
| JavaScript | Application logic |
| HTML5 & CSS3 | Structure, styling, and animations |
| Supabase | Database, authentication, and backend services |
| Supabase Edge Functions | Server-side notification workflows |
| Web Push | Browser push notifications |
| Email delivery integration | Email notification delivery |
| Git & GitHub | Version control and collaboration |

*The exact dependencies and integrations may vary as the project evolves.*

## 🏗️ How It Works

1. **Residents register** and select their municipality and ward.
2. **Municipality administrators publish** electricity outage announcements or notices.
3. **The platform identifies affected wards** and relevant residents.
4. **Notifications are delivered** through the configured in-app, email, and browser push channels.
5. **Residents report problems** and administrators manage the relevant information.

## 🗺️ Coverage Area

**Initial deployment target:** Bheemdatta Municipality, Kanchanpur, Nepal.

The system is designed around the municipality's 19 wards, with potential for adaptation to other municipalities in Nepal in the future.

## 🚀 Getting Started

Follow these instructions to run the project locally.

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) — use a version compatible with the project's dependencies.
- npm — included with Node.js.
- [Git](https://git-scm.com/).
- A Supabase project with the required database schema, authentication configuration, and backend functions.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bheemdatta-nea.git
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Enter the Project Directory

```bash
cd bheemdatta-nea
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a local environment file using the variable names expected by the project.

Configure the required Supabase project URL, public client key, and any other environment variables referenced by your application.

Do not commit private API keys, service-role keys, VAPID private keys, SMTP credentials, or other secrets to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

### 6. Build for Production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 🔐 Security & Configuration

This project uses Supabase and notification-related backend services. A secure deployment should include:

- Proper authentication and role verification.
- Database Row Level Security (RLS) policies.
- Server-side authorization for administrative operations.
- Secure handling of notification credentials.
- Appropriate storage access policies for uploaded evidence.
- Correct configuration of email and browser push services.
- Environment-specific configuration for local development and production.

**Never expose service-role keys or private notification credentials in frontend code or public repositories.**

## 📁 Project Structure

The following is a conceptual overview. Your actual folder and file names may differ.

```text
bheemdatta-nea/
├── public/                 # Static assets and public files
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Application pages
│   ├── assets/             # Images, icons, and other assets
│   └── ...                 # Application modules
├── supabase/
│   └── functions/          # Edge Functions, if included
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🛣️ Roadmap

- [x] React and Vite application foundation
- [x] Supabase backend integration
- [x] Resident and municipality administrator roles
- [x] Ward-based electricity notices
- [x] In-app notification workflows
- [x] Email and browser push notification integrations
- [x] Electricity problem reporting workflows
- [x] Bilingual interface and appearance options
- [ ] Further improvements to accessibility and mobile usability
- [ ] Enhanced notification monitoring and delivery recovery
- [ ] Continued performance, security, and reliability improvements
- [ ] Potential expansion to additional municipalities

*Roadmap items describe project goals and may change with development.*

## 🤝 Contributing

Contributions, suggestions, bug reports, and ideas are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them.
4. Commit your work with a descriptive message.
5. Open a pull request describing your improvements.

Please avoid committing credentials, personal resident data, or other sensitive information.

## 🌱 Vision for the Future

Bheemdatta NEA represents a step toward practical digital public services in Nepal. By bringing electricity announcements, resident reporting, and targeted notifications into one platform, the project aims to improve access to information and strengthen communication between communities and local administration.

The long-term vision is to develop a reusable model for digital electricity communication that can be adapted to other municipalities.

## 👨‍💻 Developer

Developed as a civic-tech project focused on web development, digital services, and community problem-solving in Nepal.

**Project:** Bheemdatta NEA  
**Location:** Bheemdatta Municipality, Kanchanpur, Sudurpashchim Province, Nepal 🇳🇵

## 📜 License

A license has not yet been specified. Until a license is added to the repository, all rights remain with the copyright holder and reuse is not automatically permitted.

---

<p align="center">
  <strong>⚡ Better Information. Stronger Communities. A Smarter Bheemdatta.</strong>
</p>

<p align="center">
  Made with ❤️ for the people of Bheemdatta, Nepal 🇳🇵
</p>
