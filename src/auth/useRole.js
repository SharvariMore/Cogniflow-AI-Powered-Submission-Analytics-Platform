import { useUser } from "@clerk/clerk-react";

export function useRole() {
  const { isSignedIn, user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role || "user";
  const isAdmin = role === "admin";
  return { isLoaded, isSignedIn, role, isAdmin };
}
