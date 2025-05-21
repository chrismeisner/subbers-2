// File: app/page.tsx

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    // Not signed in → send to login
    return redirect("/login");
  }
  // Signed in → go to dashboard
  return redirect("/dashboard");
}
