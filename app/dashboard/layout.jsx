import React from "react";

import DashboardShell from "./_components/DashboardShell";

export const metadata = {
  title: "Dashboard",
};

function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}

export default DashboardLayout;
