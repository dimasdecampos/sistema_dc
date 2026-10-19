import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Quando este valor muda (ex.: a aba aberta), o erro é limpo e a tela tenta de novo */
  resetKey?: string | number;
  /** Tela cheia (raiz do app) ou só um bloco dentro da página */
  fullPage?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Protege contra erros de renderização: em vez de a página inteira ficar em branco,
 * mostra um aviso com botões para tentar de novo ou recarregar.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro de renderização:', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className={`flex items-center justify-center p-6 ${this.props.fullPage ? 'min-h-dvh bg-slate-50' : 'py-16'}`}
      >
        <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-extrabold text-slate-900">Algo deu errado nesta tela</h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Foi só um tropeço. Tente de novo; se continuar, recarregue a página.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Recarregar a página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
