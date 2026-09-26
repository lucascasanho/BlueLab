import { initialState } from '@/mastodon/initial_state';

export interface ClientBugReportError {
  type: 'javascript' | 'unhandled_rejection' | 'api';
  message: string;
  stack?: string;
  source?: string;
  status?: number;
  method?: string;
  url?: string;
  request_id?: string;
  timestamp: string;
}

const MAX_ERRORS = 20;
const MAX_TEXT = 4_000;
const recentErrors: ClientBugReportError[] = [];

const truncate = (value: unknown, max = MAX_TEXT) =>
  String(value ?? '').slice(0, max);

const pathOnly = (value: unknown) => {
  const raw = String(value ?? '');
  if (!raw) return '';

  if (typeof window === 'undefined') {
    return raw.split('?')[0].slice(0, 500);
  }

  try {
    const url = new URL(raw, window.location.origin);
    return url.pathname;
  } catch {
    return raw.split('?')[0].slice(0, 500);
  }
};

export const recordClientError = (
  error: Omit<ClientBugReportError, 'timestamp'> & {
    timestamp?: string;
  },
) => {
  recentErrors.push({
    ...error,
    message: truncate(error.message, 2_000),
    stack: truncate(error.stack, MAX_TEXT),
    source: pathOnly(error.source),
    url: pathOnly(error.url),
    request_id: truncate(error.request_id, 128),
    timestamp: error.timestamp ?? new Date().toISOString(),
  });

  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.splice(0, recentErrors.length - MAX_ERRORS);
  }
};

const installErrorListeners = () => {
  if (typeof window === 'undefined') return;

  const globalWindow = window as typeof window & {
    __bluelabBugReportDiagnosticsInstalled?: boolean;
  };

  if (globalWindow.__bluelabBugReportDiagnosticsInstalled) return;
  globalWindow.__bluelabBugReportDiagnosticsInstalled = true;

  window.addEventListener('error', (event) => {
    const error = event.error as Error | undefined;

    recordClientError({
      type: 'javascript',
      message: error?.message || event.message || 'Unknown JavaScript error',
      stack: error?.stack,
      source: event.filename,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as Error | undefined;

    recordClientError({
      type: 'unhandled_rejection',
      message: reason?.message || String(event.reason ?? 'Unhandled rejection'),
      stack: reason?.stack,
    });
  });
};

installErrorListeners();

export const getBugReportDiagnostics = (interfaceLanguage: string) => {
  const body = document.body;
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 700px)').matches;
  const layout = isMobile
    ? 'mobile'
    : body.classList.contains('layout-multiple-columns')
      ? 'multi-column'
      : 'single-column';

  return {
    interface_language: truncate(interfaceLanguage, 32),
    theme: truncate(body.dataset.theme, 128),
    interface_layout: layout,
    current_path: window.location.pathname.slice(0, 500),
    viewport: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`,
    app_version: truncate(initialState?.meta.version, 64),
    client_errors: [...recentErrors],
  };
};
export const populateBugReportFormDiagnostics = (
  form: HTMLFormElement,
  interfaceLanguage: string,
) => {
  const diagnostics = getBugReportDiagnostics(interfaceLanguage);

  const fields: Record<string, string> = {
    interface_language: diagnostics.interface_language,
    theme: diagnostics.theme,
    interface_layout: diagnostics.interface_layout,
    viewport: diagnostics.viewport,
    app_version: diagnostics.app_version,
    client_errors: JSON.stringify(diagnostics.client_errors),
  };

  Object.entries(fields).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);

    if (field instanceof HTMLInputElement) {
      field.value = value;
    }
  });
};
