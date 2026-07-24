import { Button } from '@/components/ui/button'
import React from 'react'
import { useRouter } from 'next/navigation'

function InterviewcardList({interview}) {
    const router = useRouter();

  return (
    <div className='border border-slate-200 shadow-sm hover:shadow-md rounded-2xl p-5 bg-white transition-all duration-300'>
        <h2 className='font-bold text-indigo-700 text-lg mb-1'>{interview?.jobposition}</h2>
        <h2 className='text-sm text-slate-600 font-medium'>{interview?.jobexp} Years of Experience</h2>
        <h2 className='text-xs text-slate-400 mt-1'>Created At: {interview?.createdat ? interview.createdat.slice(0,10) : 'N/A'}</h2>

        <div className='flex justify-between mt-4 gap-3'> 
            <Button size="sm" variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/interview/${interview?.mockid}/feedback`)}
            >
                Feedback
            </Button>
            <Button size="sm" className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white shadow-md"
                onClick={() => router.push(`/dashboard/interview/${interview?.mockid}/start`)}
            >
                Start
            </Button>
        </div>
    </div>
  )
}

export default InterviewcardList