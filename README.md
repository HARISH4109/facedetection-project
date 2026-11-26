# Face Detection Web Application

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/harish4109s-projects/v0-face-detection-app-website)

An advanced real-time face detection web application built with Next.js, React, and `face-api.js`. The app allows users to detect faces, analyze facial expressions, inspect landmarks, and record detection history across live camera feeds and uploaded media.

---

## 🚀 Live Deployment

The application is deployed and accessible at:

**[https://vercel.com/harish4109s-projects/v0-face-detection-app-website](https://vercel.com/harish4109s-projects/v0-face-detection-app-website)**

---

## ✨ Features

- **Real-Time Webcam Face Detection**: Fast, in-browser facial detection powered by `face-api.js`.
- **Media Upload Analysis**: Upload images or videos to detect faces with bounding boxes, landmarks, and confidence scores.
- **Facial Expression Recognition**: Accurately classifies facial emotions (happy, sad, neutral, surprised, fearful, etc.) with real-time probability charts.
- **Detection Dashboard & History**: Save detection records and explore detailed detection metrics per session.
- **User Authentication**: Secure user registration, login, and session persistence integrated with NextAuth and Firebase.
- **Modern Responsive UI**: Sleek, mobile-friendly interface designed with Tailwind CSS and Radix UI primitives, including dark/light theme support.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Frontend Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Face Detection AI / ML**: [face-api.js](https://github.com/justadudewhohacks/face-api.js)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Authentication & Backend**: NextAuth.js, Firebase
- **Deployment**: [Vercel](https://vercel.com/)

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (pages and API routes)
│   ├── api/              # API endpoints (NextAuth handlers)
│   ├── dashboard/        # User detection history & dashboard
│   ├── detect/           # Core face detection studio & detailed view
│   ├── login/            # Sign in page
│   ├── signup/           # User registration page
│   ├── layout.tsx        # Root layout with providers & header
│   └── page.tsx          # Landing / hero page
├── components/           # Reusable UI components & Radix primitives
│   ├── ui/               # Design system elements (buttons, dialogs, cards, etc.)
│   ├── auth-context.tsx  # Authentication context and provider
│   └── site-header.tsx   # Navigation bar & theme switcher
├── hooks/                # Custom React hooks
├── lib/                  # Authentication, Firebase, and database helper utilities
├── public/               # Static assets, placeholders, and detection model preloader
└── styles/               # Global styling configurations
```

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.18.0 or later recommended)
- [pnpm](https://pnpm.io/) or `npm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HARISH4109/facedetection-project.git
   cd facedetection-project
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and configure the necessary credentials for NextAuth and Firebase:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   # Firebase credentials (if using Firebase services)
   ```

4. **Run the development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build for Production

To create an optimized production build:

```bash
pnpm build
pnpm start
```
