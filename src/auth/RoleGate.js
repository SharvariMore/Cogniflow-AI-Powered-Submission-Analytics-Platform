import React from "react";
import { SignedIn } from "@clerk/clerk-react";
import { useRole } from "./useRole";

export default function RoleGate({ allow = [], fallback = null, children }) {
  const { isLoaded, isSignedIn, role } = useRole();

  if (!isLoaded) return null; // or a spinner
  if (!isSignedIn) return fallback || <p>Please sign in</p>;
  if (allow.length && !allow.includes(role)) {
    return fallback || <p>Not authorized</p>;
  }
  return <SignedIn>{children}</SignedIn>;
}
