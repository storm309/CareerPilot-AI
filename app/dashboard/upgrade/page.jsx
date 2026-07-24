import React from 'react'

import planData from '@/utils/planData'
import PlanItemCard from './_components/PlanItemCard'

function Upgrade() {
    return (
        <div className='p-10'>
            <h2 className='font-bold text-3xl text-center'>Upgrade</h2>
            <h2 className='text-center  text-gray-500'>Upgrade to monthly plan to access unlimited mock interview</h2>

            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center md:gap-8">

                {planData.map((plan,index)=>(
                     <PlanItemCard plan={plan} key={index} />
                ))}
                </div>
            </div>

            <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
                <p>For payments or any queries, you can contact us via WhatsApp:</p>
                <p className="font-bold text-lg mt-2 text-indigo-600 dark:text-indigo-400">
                    <a href="https://wa.me/9182529680774" target="_blank" rel="noreferrer">
                        +91 82529680774
                    </a>
                </p>
            </div>
        </div>
    )
}

export default Upgrade