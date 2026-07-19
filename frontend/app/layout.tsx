import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEVgauge | AI Code Review Assistant",
  description: "Automated static analysis and AI-powered code auditing dashboard.",
};

import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
