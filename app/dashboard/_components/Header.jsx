"use client"
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'

function Header() {

    const path=usePathname();
    useEffect(()=>{
        console.log(path)
    },[])

  return (
    <div className='flex p-4 items-center justify-between bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50'>
        <Image src={'/logo.png'} width={160} height={100} alt='logo' className='h-12 w-auto object-contain' />
        <ul className='hidden md:flex gap-6'>
          <Link href={"/dashboard"}>
            <li className={`hover:text-primary hover:font-bold transition-all
            cursor-pointer
            ${path=='/dashboard'&&'text-primary font-bold'}
            `}
            
            >Dashboard</li>
            </Link>
            <Link href={"/dashboard/questions"}>
            <li className={`hover:text-primary hover:font-bold transition-all
            cursor-pointer
            ${path=='/dashboard/questions'&&'text-primary font-bold'}
            `}>Questions</li>
            </Link>
              <Link href={"/dashboard/upgrade"}>
            <li className={`hover:text-primary hover:font-bold transition-all
            cursor-pointer
            ${path=='/dashboard/upgrade'&&'text-primary font-bold'}
            `}>Upgrade</li>
            </Link>
            <Link href="/#how-it-works">
              <li className={`hover:text-primary hover:font-bold transition-all
              cursor-pointer
              ${path=='/dashboard/how'&&'text-primary font-bold'}
              `}>How it Works?</li>
            </Link>
        </ul>
        <div>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
    </div>
  )
}

export default Header