import React from "react";

interface AnnouncerProps {
  children: React.ReactNode;
  politeness?: "polite" | "assertive";
  className?: string;
}

export function Announcer({ children, politeness = "polite", className }: AnnouncerProps) {
  if (!children) return null;

  return (
    <div
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      className={className ?? "sr-only"}
    >
      {children}
    </div>
  );
}

export function FormErrorMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p role="alert" className="text-xs text-destructive mt-0.5">
      {message}
    </p>
  );
}
