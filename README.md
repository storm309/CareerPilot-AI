# CareerPilot AI

<div align="center">
  <img src="public/logo.png" alt="CareerPilot AI Logo" width="200"/>
</div>

**CareerPilot AI** is a state-of-the-art web application designed to help users simulate real-world mock interviews for their desired job roles. By leveraging advanced generative AI models, CareerPilot tailors every interview to your specific job title, technology stack, and years of experience.

Double your chances of landing that dream job offer with our AI-powered interview prep!

## 🚀 Key Features

*   **Personalized Interview Questions**: Every session is uniquely tailored based on your input (job title, tech stack, experience).
*   **Generative AI-Driven Engine**: Utilizes Google's Gemini 2.5 Flash model to create unique, up-to-date, and challenging technical interview questions.
*   **Real-Time Audio & Video Simulation**: Experience a realistic interview environment with webcam integration and speech-to-text functionality.
*   **Detailed Feedback & Scoring**: Receive comprehensive feedback and a performance rating after each interview to identify areas for improvement.
*   **Secure Authentication**: User sessions and history are securely managed using Clerk.
*   **Modern Dashboard**: Track your performance over time and review your past interviews.

## 🛠️ Tech Stack

*   **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
*   **Backend & ORM**: Drizzle ORM, Node PostgreSQL (`pg`)
*   **Database**: Supabase (PostgreSQL)
*   **Authentication**: Clerk
*   **AI Engine**: Google Gemini API (`@google/generative-ai`)
*   **Media**: `react-webcam`, `react-hook-speech-to-text`

## ⚙️ Getting Started

Follow these instructions to set up CareerPilot AI on your local machine.

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   A Supabase Account
*   A Google AI Studio Account
*   A Clerk Account

### 1. Clone the repository
*(If you haven't already downloaded the source code)*
```bash
git clone <your-repository-url>
cd CareerPilot-AI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory of the project and add the following keys:

```env
# Database Connection (Supabase Session Pooler URL)
NEXT_PUBLIC_DRIZZLE_DB_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Google Gemini API
NEXT_PUBLIC_KEY_GEMINI="your_gemini_api_key_here"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
```

### 4. Initialize the Database
Push the schema to your Supabase database using Drizzle:
```bash
npm run db-push
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📝 Usage Guide

1.  **Sign In/Sign Up**: Create an account to access your personal dashboard.
2.  **Add New Interview**: Click on "Add New" and fill in your target job role, tech stack, and years of experience.
3.  **Permissions**: Ensure your browser allows camera and microphone access.
4.  **Start Interview**: Answer the 5 generated questions by recording your voice.
5.  **Review Feedback**: Once completed, review your answers against the AI's ideal answers and read the feedback to improve.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

---
*Built with ❤️ to help you ace your next interview.*
