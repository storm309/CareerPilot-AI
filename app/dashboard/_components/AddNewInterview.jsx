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
import { LoaderCircle } from 'lucide-react';
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
    const [loading, setLoading] = React.useState(false);
    const { user } = useUser();
    const Router = useRouter();

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const Inputprompt = `Job position: ${Jobpost}, Job Description: ${JobDescription}, Years of Experience: ${Experience}. Based on these details, give me exactly 5 interview questions along with ideal answers in JSON format. Return ONLY a JSON array like: [{"question":"...","answer":"..."}]`;

        try {
            // ✅ Fresh chat session for every submit - prevents reuse bugs
            const session = createChatSession();
            const result = await session.sendMessage(Inputprompt);
            let responseText = await result.response.text();

            // Clean up markdown code blocks if any
            responseText = responseText.trim()
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            // Parse JSON
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
                    createdby: user?.primaryEmailAddress?.emailAddress,
                    createdat: moment().format('YYYY-MM-DD HH:mm:ss')
                });

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
                className='p-10 border rounded-lg bg-secondary hover:scale-105 hover:shadow-md cursor-pointer transition-all'
                onClick={() => setOpenDialog(true)}
            >
                <h2 className='text-lg text-center'>+ Add new</h2>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="bg-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Tell us about your Job Interview</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Add the details below and our AI will generate 5 tailored interview questions for you.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={onSubmit} className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Role / Position</label>
                            <Input
                                placeholder="Ex. Full Stack Developer"
                                required
                                onChange={(e) => setJobpost(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description / Tech Stack</label>
                            <Textarea
                                placeholder="Ex. React, Node.js, PostgreSQL, REST APIs..."
                                required
                                onChange={(e) => setJobDescription(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                            <Input
                                placeholder="Ex. 3"
                                min="0"
                                max="50"
                                type="number"
                                required
                                onChange={(e) => setExperience(e.target.value)}
                            />
                        </div>

                        <div className='flex gap-3 justify-end pt-2'>
                            <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
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