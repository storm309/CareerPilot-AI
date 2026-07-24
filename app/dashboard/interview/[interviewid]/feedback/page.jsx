"use client";
import { getFeedbackByMockId } from '@/actions/dbActions';
import React, { useEffect, useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function Feedback({ params }) {
  const [feedbackData, setFeedbackData] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const router = useRouter();

  useEffect(() => {
    GetInterviewData();
  }, []);

  const GetInterviewData = async () => {
    const result = await getFeedbackByMockId(params.interviewid);

    console.log(result);
    setFeedbackData(result);
    calculateAverageRating(result);
  };

  const calculateAverageRating = (data) => {
    if (data.length > 0) {
      const totalRating = data.reduce((sum, item) => {
        const rating = parseFloat(item.rating) || 0;
        return sum + rating;
      }, 0);
  
      const average = totalRating / data.length;
      setAverageRating(average.toFixed(1)); 
    }
  };

  return (
    <div className='p-6 md:p-10 max-w-4xl mx-auto'>
      <div className="mb-8">
        <h2 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700 tracking-tight'>
          Congratulations! 🎉
        </h2>
        <h2 className='font-bold text-2xl mt-2 text-slate-800'>Here is your detailed Interview Feedback</h2>
      </div>

      {feedbackData.length === 0 ? (
        <div className="p-10 border border-red-200 bg-red-50 rounded-2xl text-center">
          <h2 className='text-red-500 text-lg font-semibold'>No feedback Found</h2>
        </div>
      ) : (
        <>
          <div className="p-6 border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl mb-8 shadow-sm">
            <h2 className='text-indigo-900 text-xl font-medium'>
              Your Overall Interview Rating: <span className="font-bold text-2xl text-indigo-700">{averageRating}/10</span>
            </h2>
            <p className='text-sm text-slate-600 mt-2'>
              Review the detailed feedback below. Focus on the suggestions provided by our AI HR manager to improve your grammar, structure, and technical accuracy.
            </p>
          </div>

          <div className="space-y-4">
            {feedbackData && feedbackData.map((data, index) => (
              <Collapsible key={index} className='border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden'>
                <CollapsibleTrigger className='p-4 hover:bg-slate-50 transition-colors w-full flex justify-between items-center text-left font-semibold text-slate-800'>
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-full shrink-0">
                      Q{index + 1}
                    </span>
                    {data.question}
                  </div>
                  <ChevronDown className="text-slate-400 shrink-0" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className='flex flex-col gap-4'>
                    <div className="inline-flex">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${parseFloat(data.rating) >= 7 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        Rating: {data.rating}/10
                      </span>
                    </div>
                    
                    <div className='p-4 border border-red-100 bg-white rounded-xl shadow-sm'>
                      <strong className="text-red-700 flex items-center gap-2 mb-1">❌ Your Answer</strong> 
                      <p className="text-slate-700 text-sm leading-relaxed">{data.useranswer}</p>
                    </div>
                    
                    <div className='p-4 border border-green-100 bg-white rounded-xl shadow-sm'>
                      <strong className="text-green-700 flex items-center gap-2 mb-1">✅ Ideal Answer</strong> 
                      <p className="text-slate-700 text-sm leading-relaxed text-justify">{data.correctanswer}</p>
                    </div>
                    
                    <div className='p-4 border border-blue-100 bg-blue-50/50 rounded-xl shadow-sm'>
                      <strong className="text-blue-700 flex items-center gap-2 mb-1">💡 HR Feedback & Suggestions</strong> 
                      <p className="text-slate-700 text-sm leading-relaxed text-justify">{data.feedback}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex justify-end">
        <Button size="lg" className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl" onClick={() => router.replace('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default Feedback;
