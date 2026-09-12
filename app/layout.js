import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "CareerPilot AI - AI Mock Interview Practice",
    template: "%s | CareerPilot AI",
  },
  description:
    "Practice job interviews with an AI interviewer. Get tailored questions from your job description and resume, then instant scoring and feedback on every answer.",
  keywords: [
    "mock interview",
    "AI interview practice",
    "interview preparation",
    "technical interview",
    "behavioral interview",
  ],
  openGraph: {
    title: "CareerPilot AI - AI Mock Interview Practice",
    description:
      "Tailored AI interview questions and instant, structured feedback on every answer.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#080c14",
  colorScheme: "dark light",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {/* Dark-first: the product ships dark and stays dark unless the
              person switches it, rather than following the OS. */}
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Toaster position="top-right" richColors expand />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
