"use client";
import { UserButton } from '@clerk/clerk-react';
import AddNewInterview from './_components/AddNewInterview';
import React from 'react'
import InterviewList from './_components/InterviewList';

function Dashboard() {
  return (
    <div className='p-4 md:p-10'>
      <div className="mb-8">
        <h2 className='font-extrabold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500 tracking-tight'>
          Dashboard
        </h2>
        <p className='text-slate-500 mt-1 font-medium'>
          Create and start your AI Mockup Interview
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 my-5 gap-6'>
        <AddNewInterview />
      </div>

      <InterviewList />
    </div>
  )
}

export default Dashboard