"use client";
import { getInterviewList as fetchInterviewList } from '@/actions/dbActions';
import { useUser } from '@clerk/clerk-react'
import { desc, eq } from 'drizzle-orm';
import React, { useEffect } from 'react'
import InterviewcardList from './InterviewcardList';


function InterviewList() {
    const {user} = useUser();
    const[interviewList, setInterviewList] = React.useState([]);

    useEffect(() => { 
        user && GetInterviewList();
     }, [user]) 

    const GetInterviewList = async () => {
        const response = await fetchInterviewList(user?.primaryEmailAddress?.emailAddress);

        console.log(response);

        setInterviewList(response);
    }
  return (
    <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
            <h2 className='font-bold text-xl text-slate-800'>Previous Mock Interviews</h2>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {interviewList && interviewList.map((interview,index) => (
                <InterviewcardList key={index} interview={interview} />
            ))}
        </div>
    </div>
  )
}

export default InterviewList