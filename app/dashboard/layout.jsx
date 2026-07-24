import React from 'react';
import Header from './_components/Header';

function DashboardLayout({children}) {
  return (
   

    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40'>
      <Header />
      <div className='mx-5 md:mx-20 lg:mx-36 py-10'>
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout