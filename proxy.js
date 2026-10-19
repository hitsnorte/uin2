import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/backend/login"
  }
});

export const config = {
  matcher: ["/backend((?!/login).*)"]
};