import { Button } from '@/components/ui/button'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, LoaderCircle } from 'lucide-react'
import { deleteInterview } from '@/actions/dbActions'
import { toast } from 'sonner'

function InterviewcardList({interview, onDelete}) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteInterview(interview.mockid);
            toast.success("Interview deleted successfully!");
            if (onDelete) onDelete();
        } catch (error) {
            toast.error("Failed to delete interview.");
        } finally {
            setIsDeleting(false);
        }
    };

  return (
    <div className='border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md rounded-2xl p-5 bg-card text-card-foreground transition-all duration-300 relative'>
        <div className='flex justify-between items-start'>
            <div>
                <h2 className='font-bold text-indigo-700 dark:text-indigo-400 text-lg mb-1'>{interview?.jobposition}</h2>
                <h2 className='text-sm text-slate-600 dark:text-slate-300 font-medium'>{interview?.jobexp} Years of Experience</h2>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 -mt-2 -mr-2"
                onClick={handleDelete}
                disabled={isDeleting}
            >
                {isDeleting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
        </div>
        <h2 className='text-xs text-slate-400 mt-1'>Created At: {interview?.createdat ? interview.createdat.slice(0,10) : 'N/A'}</h2>

        <div className='flex justify-between mt-4 gap-3'> 
            <Button size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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