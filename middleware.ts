import { clerkMiddleware } from '@clerk/nextjs/server';

// Primary auth domain. We only gate that /admin and /user require a signed-in user;
// role enforcement for admins happens in the server layout (needs metadata lookup).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
