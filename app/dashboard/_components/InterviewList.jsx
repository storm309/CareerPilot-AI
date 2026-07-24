"use client";
import { getInterviewList as fetchInterviewList } from '@/actions/dbActions';
import { useUser } from '@clerk/clerk-react'
import { desc, eq } from 'drizzle-orm';
import React, { useEffect } from 'react'
import InterviewcardList from './InterviewcardList';


import { Skeleton } from '@/components/ui/skeleton';

function InterviewList() {
    const {user} = useUser();
    const[interviewList, setInterviewList] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => { 
        if (user) {
          GetInterviewList();
        }
     }, [user]) 

    const GetInterviewList = async () => {
        setLoading(true);
        const response = await fetchInterviewList(user?.primaryEmailAddress?.emailAddress);
        setInterviewList(response);
        setLoading(false);
    }
  return (
    <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
            <h2 className='font-bold text-xl text-slate-800'>Previous Mock Interviews</h2>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {loading ? (
                [1,2,3].map((item, index) => (
                    <Skeleton key={index} className="h-[200px] w-full rounded-2xl bg-slate-200" />
                ))
            ) : (
                interviewList && interviewList.map((interview,index) => (
                    <InterviewcardList key={index} interview={interview} />
                ))
            )}
        </div>
    </div>
  )
}

export default InterviewList