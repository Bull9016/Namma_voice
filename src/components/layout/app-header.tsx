import { MessageSquareText } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="text-center">
      <div className="flex items-center justify-center space-x-3">
        <MessageSquareText className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
        <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
          NammaVoice
        </h1>
      </div>
      <p className="mt-2 text-lg text-muted-foreground sm:text-xl">
        Seamless Real-Time Voice Translation
      </p>
    </header>
  );
}
