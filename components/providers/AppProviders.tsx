"use client";

import AuthModal from "@/components/auth/AuthModal";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AuthModal />
    </>
  );
}
