import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from "./App";
import { ErrorBoundary } from 'react-error-boundary';
import { HammerIcon } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function reloadApp() {
  if (window._ziteOnReload) {
    window._ziteOnReload();
  } else {
    location.reload();
  }
}

function RuntimeErrorFallback(props: { error: Error }) {
  const allowAiFix = window.__ziteAllowAiFix === true;

  return (
    <div className="fixed inset-0 grid place-items-center bg-background p-4 text-foreground">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight">
          Issue rendering app
        </h3>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          {allowAiFix
            ? 'Try asking Zite to fix the issue or find a workaround.'
            : 'Something went wrong while loading this app. You can try reloading the page.'}
        </p>

        <pre className="overflow-auto rounded-xl border border-destructive/20 bg-destructive/5 p-4 font-mono text-xs leading-5 text-destructive">
          {props.error.message}
        </pre>
        <div className="mt-4 flex gap-2">
          {allowAiFix ? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => window._ziteOnFixError?.(props.error)}
            >
              <HammerIcon className="h-4 w-4" />
              Fix it for me
            </button>
          ) : null}
          <button
            type="button"
            onClick={reloadApp}
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallbackRender={props => <RuntimeErrorFallback error={props.error} />}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
