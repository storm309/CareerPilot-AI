import React from "react";

import Header from "./_components/Header";

export const metadata = {
  title: "Dashboard",
};

function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-blue-50/40 dark:from-background dark:via-background dark:to-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export default DashboardLayout;
