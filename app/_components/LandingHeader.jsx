"use client"
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

function LandingHeader() {
  return (
    <div className='flex p-4 items-center justify-between bg-transparent backdrop-blur-md shadow-sm sticky top-0 z-50'>
        <div className='flex items-center gap-2'>
            <Image src={'/logo.png'} width={160} height={100} alt='logo' className='h-12 w-auto object-contain dark:invert' />
        </div>
        <ul className='hidden md:flex gap-8'>
            <Link href="#how-it-works">
              <li className='hover:text-primary hover:font-bold transition-all cursor-pointer text-slate-700 dark:text-slate-300'>
                  How it Works
              </li>
            </Link>
            <Link href="#features">
              <li className='hover:text-primary hover:font-bold transition-all cursor-pointer text-slate-700 dark:text-slate-300'>
                  Features
              </li>
            </Link>
        </ul>
        <div className='flex items-center gap-4'>
          <ThemeToggle />
          <SignedIn>
            <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">Go to Dashboard</Button>
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="rounded-full px-6">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
    </div>
  )
}

export default LandingHeader
