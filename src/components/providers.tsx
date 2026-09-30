import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 12_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={180}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className:
              "!bg-elevated !text-fg !border-border !font-sans !shadow-[var(--shadow-lift)]",
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
