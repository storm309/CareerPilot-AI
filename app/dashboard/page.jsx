"use client";
import { UserButton, useUser } from '@clerk/clerk-react';
import AddNewInterview from './_components/AddNewInterview';
import React, { useEffect, useState } from 'react'
import InterviewList from './_components/InterviewList';
import { getDashboardStats } from '@/actions/dbActions';
import { Briefcase, CheckCircle, Mail, PenTool, TrendingUp } from 'lucide-react';

function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    const data = await getDashboardStats(user?.primaryEmailAddress?.emailAddress);
    setStats(data);
  };

  return (
    <div className='p-4 md:p-10 space-y-8'>
      <div className="flex justify-between items-center">
        <div>
          <h2 className='font-extrabold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500 tracking-tight'>
            Dashboard
          </h2>
          <p className='text-slate-500 mt-1 font-medium'>
            Track your progress and start new AI Mock Interviews
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card text-card-foreground p-6 rounded-2xl border shadow-sm flex flex-col justify-center items-start gap-2">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold"><Briefcase className="w-5 h-5"/> Total Interviews</div>
            <span className="text-3xl font-bold">{stats.totalInterviews}</span>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border shadow-sm flex flex-col justify-center items-start gap-2">
            <div className="flex items-center gap-2 text-green-600 font-semibold"><TrendingUp className="w-5 h-5"/> Average Score</div>
            <span className="text-3xl font-bold">{stats.averageScore} / 10</span>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border shadow-sm flex flex-col justify-center items-start gap-2">
            <div className="flex items-center gap-2 text-purple-600 font-semibold"><PenTool className="w-5 h-5"/> Grammar Checks</div>
            <span className="text-3xl font-bold">{stats.grammarUsage}</span>
          </div>
          <div className="bg-card text-card-foreground p-6 rounded-2xl border shadow-sm flex flex-col justify-center items-start gap-2">
            <div className="flex items-center gap-2 text-blue-600 font-semibold"><Mail className="w-5 h-5"/> Emails Written</div>
            <span className="text-3xl font-bold">{stats.emailUsage}</span>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <AddNewInterview />
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-bold mb-4">Your Recent Interviews</h3>
        <InterviewList />
      </div>
    </div>
  )
}

export default Dashboard