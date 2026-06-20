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
    <div>
        <h2 className='font-bold text-xl'>Previous Mock Interviews</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 my-4 gap-5'>
            {interviewList && interviewList.map((interview,index) => (
                <InterviewcardList key={index} interview={interview} />
            ))}
        </div>
    </div>
  )
}

export default InterviewList