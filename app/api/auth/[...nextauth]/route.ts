// File: app/api/auth/[...nextauth]/route.ts

import { handler } from "@/lib/auth";

// Only HTTP methods may be exported from a route.ts file
export { handler as GET, handler as POST };
