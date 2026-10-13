import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/navbar';
import { AiAgentWidget } from '../components/ai-agent-widget';

export const metadata: Metadata = {
  title: 'StackLoop — AI-Powered GitHub Discovery',
  description: 'Discover, analyze, and bookmark open source repositories with Gemini 3.8 and Google Cloud.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B1220] text-gray-100 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800/80 bg-[#0B1220] py-8 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-300">StackLoop</span>
              <span>—</span>
              <span>AI-powered GitHub repository discovery platform</span>
            </div>
            <div className="flex items-center space-x-4 text-gray-400">
              <span>Powered by Gemini 3.8</span>
              <span>•</span>
              <span>Google Cloud Run</span>
            </div>
          </div>
        </footer>
        <AiAgentWidget />
      </body>
    </html>
  );
}
