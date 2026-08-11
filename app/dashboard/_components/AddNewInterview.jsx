"use client";
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { createChatSession } from '@/utils/Geminimodel';
import { LoaderCircle, Sparkles, Plus } from 'lucide-react';
import { insertMockInterview } from '@/actions/dbActions';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

function AddNewInterview() {
    const [openDialog, setOpenDialog] = React.useState(false);
    const [Jobpost, setJobpost] = React.useState("");
    const [JobDescription, setJobDescription] = React.useState("");
    const [Experience, setExperience] = React.useState("");
    const [interviewType, setInterviewType] = React.useState("Technical");
    const [resumeFile, setResumeFile] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const { user } = useUser();
    const Router = useRouter();

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let resumeText = "";

        if (resumeFile) {
            try {
                const formData = new FormData();
                formData.append('file', resumeFile);
                const response = await fetch('/api/parse-pdf', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.text) {
                    resumeText = data.text;
                }
            } catch (err) {
                console.error("PDF parse error:", err);
                toast.error("Failed to parse resume. Proceeding without it.");
            }
        }

        const Inputprompt = `Job position: ${Jobpost}, Job Description: ${JobDescription}, Years of Experience: ${Experience}, Interview Type: ${interviewType}. ${resumeText ? `Here is the candidate's resume: ${resumeText}` : ''} Based on these details, give me exactly 5 interview questions specifically tailored for a ${interviewType} interview. Return ONLY a JSON array like: [{"question":"...","answer":"..."}]`;

        try {
            // ✅ Fresh chat session for every submit - prevents reuse bugs
            const session = createChatSession();
            const result = await session.sendMessage(Inputprompt);
            let responseText = await result.response.text();

            // Parse JSON directly since Gemini is configured to output strict JSON
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError, "\nRaw:", responseText);
                toast.error("AI response was not valid JSON. Please try again.");
                setLoading(false);
                return;
            }

            if (jsonResponse) {
                // ✅ Use 'createdat' to match the database schema column name
                const output = await insertMockInterview({
                    mockid: uuidv4(),
                    jsonmockresp: JSON.stringify(jsonResponse),
                    jobposition: Jobpost,
                    jobdescription: JobDescription,
                    jobexp: Experience,
                    interviewType: interviewType,
                    resumeText: resumeText.substring(0, 5000), // store up to 5k chars
                    createdby: user?.primaryEmailAddress?.emailAddress,
                    createdat: moment().format('YYYY-MM-DD HH:mm:ss')
                });

                if (output && output.error) {
                    toast.error("Database Error: " + output.error);
                    setLoading(false);
                    return;
                }

                if (output && output[0]?.mockId) {
                    toast.success("Interview created successfully!");
                    setOpenDialog(false);
                    Router.push(`/dashboard/interview/${output[0].mockId}`);
                } else {
                    toast.error("Something went wrong saving to database. Please try again.");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("An error occurred: " + (error?.message || "Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div
                className='p-8 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-400 hover:scale-[1.02] hover:shadow-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 group'
                onClick={() => setOpenDialog(true)}
            >
                <div className="bg-indigo-100 p-2 rounded-full group-hover:bg-indigo-600 transition-colors duration-300">
                    <Plus className="text-indigo-600 group-hover:text-white transition-colors" size={24} />
                </div>
                <h2 className='text-lg font-semibold text-indigo-700 group-hover:text-indigo-900 transition-colors'>Add New</h2>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="bg-white max-w-2xl rounded-2xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="text-indigo-600" />
                            Tell us about your Job Interview
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Add the details below and our AI will generate 5 tailored interview questions for you.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={onSubmit} className="mt-4 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Job Role / Position</label>
                                <Input
                                    placeholder="Ex. Full Stack Developer"
                                    required
                                    onChange={(e) => setJobpost(e.target.value)}
                                    className="focus-visible:ring-indigo-600 border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Interview Type</label>
                                <select 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    value={interviewType}
                                    onChange={(e) => setInterviewType(e.target.value)}
                                >
                                    <option value="Technical">Technical</option>
                                    <option value="HR">HR / Behavioral</option>
                                    <option value="Mixed">Mixed (Tech + HR)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Job Description / Tech Stack</label>
                            <Textarea
                                placeholder="Ex. React, Node.js, PostgreSQL, REST APIs..."
                                required
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="focus-visible:ring-indigo-600 border-slate-200 min-h-[100px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Years of Experience</label>
                                <Input
                                    placeholder="Ex. 3"
                                    min="0"
                                    max="50"
                                    type="number"
                                    required
                                    onChange={(e) => setExperience(e.target.value)}
                                    className="focus-visible:ring-indigo-600 border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Upload Resume (Optional PDF)</label>
                                <Input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => setResumeFile(e.target.files[0])}
                                    className="focus-visible:ring-indigo-600 border-slate-200 file:text-indigo-600 file:font-semibold file:border-0 file:bg-indigo-50 hover:file:bg-indigo-100"
                                />
                            </div>
                        </div>

                        <div className='flex gap-4 justify-end pt-4 border-t border-slate-100'>
                            <Button type="button" variant="ghost" onClick={() => setOpenDialog(false)} className="text-slate-600 hover:text-slate-900">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
                                {loading
                                    ? <><LoaderCircle className='animate-spin mr-2 h-4 w-4' /> Generating Questions...</>
                                    : 'Start Interview 🚀'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddNewInterview;