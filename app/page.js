import { Button } from "@/components/ui/button";
import Image from "next/image";
import Header from "./dashboard/_components/Header";
import { AtomIcon, ReceiptText, Focus, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-cyan-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 px-4 mx-auto max-w-screen-xl text-center lg:pt-32 lg:px-12">
        
        {/* Modern Badge */}
        <div className="inline-flex items-center justify-center py-1 px-3 mb-7 text-sm font-medium text-indigo-800 bg-indigo-100 rounded-full border border-indigo-200 hover:bg-indigo-200 transition-colors shadow-sm cursor-pointer">
          <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
          <span className="tracking-wide">AI-Powered Interview Preparation</span>
        </div>

        <h1 className="mb-6 text-5xl font-extrabold tracking-tight leading-tight md:text-6xl lg:text-7xl">
          <span className="text-gray-900">Master your interviews with </span>
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
            CareerPilot AI
          </span>
        </h1>
        
        <p className="mb-10 text-lg font-medium text-gray-500 lg:text-xl sm:px-16 xl:px-48">
          Land your dream job by practicing with our intelligent AI interviewer. Get real-time feedback, personalized questions, and boost your confidence in minutes.
        </p>
        
        <div className="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-6">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-1">
              Get Started for Free
              <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </Button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full text-lg px-8 py-6 rounded-full border-gray-300 hover:bg-gray-50 transition-all">
              Watch Demo
            </Button>
          </a>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 py-16 px-4 mx-auto max-w-screen-xl text-center lg:py-24 lg:px-12">
        <div className="mb-12">
          <h2 className="font-extrabold text-3xl md:text-4xl text-gray-900 mb-4">How it Works?</h2>
          <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">Prepare for your next big opportunity in just three simple steps.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1 */}
          <div className="relative group rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-indigo-200 text-left cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10"></div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <ReceiptText className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">1. Add Job Details</h3>
            <p className="text-gray-600 leading-relaxed">
              Paste the Job Title, Company Name, and Job Description. Our AI analyzes the role to tailor the experience perfectly for you.
            </p>
          </div>

          {/* Card 2 */}
          <div className="relative group rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-cyan-200 text-left cursor-default">
             <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-100 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10"></div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-100 text-cyan-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Focus className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">2. Face the AI Interviewer</h3>
            <p className="text-gray-600 leading-relaxed">
              Enable your webcam and microphone. Answer 5 highly-relevant behavioral and technical questions in a simulated environment.
            </p>
          </div>

          {/* Card 3 */}
          <div className="relative group rounded-2xl border border-gray-200 bg-white/60 backdrop-blur-md p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-purple-200 text-left cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10"></div>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <AtomIcon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">3. Get Instant Feedback</h3>
            <p className="text-gray-600 leading-relaxed">
              Receive a detailed performance rating and constructive feedback on each answer, helping you improve immediately.
            </p>
          </div>

        </div>
      </section>

      {/* Decorative background shapes */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-20 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  );
}