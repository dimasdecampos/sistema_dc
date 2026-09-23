import React, { useState } from 'react';
import { X, Github, Copy, Check, Terminal, FolderGit2, Download, ArrowRight } from 'lucide-react';

interface GithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const GithubModal: React.FC<GithubModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const gitCommands = [
    '# 1. Vincular ao seu repositório criado no GitHub:',
    'git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git',
    '',
    '# 2. Renomear o branch principal para main:',
    'git branch -M main',
    '',
    '# 3. Enviar todo o código para o GitHub:',
    'git push -u origin main',
  ].join('\n');

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    onShowToast('Comandos copiados!', 'Cole no seu terminal para enviar os arquivos ao GitHub.', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Salvar Projeto no GitHub
              </h3>
              <p className="text-xs text-slate-500">
                Instruções para versionar e publicar seu código
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Option 1: AI Studio Export */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Opção 1: Exportação Direta no Google AI Studio</span>
            </div>
            <p className="text-emerald-800 text-xs leading-relaxed">
              Você pode exportar diretamente pelo menu do AI Studio:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-emerald-900 font-medium text-xs pl-1">
              <li>Clique no ícone de configurações / menu superior do AI Studio</li>
              <li>Selecione <strong>Export to GitHub</strong> ou <strong>Download ZIP</strong></li>
              <li>Conecte sua conta do GitHub para criar o repositório com 1 clique!</li>
            </ol>
          </div>

          {/* Option 2: Terminal Git push */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span>Opção 2: Linha de Comando (Git CLI)</span>
            </div>
            <p className="text-xs text-slate-500">
              O repositório Git local já foi inicializado e estruturado. Basta criar um novo repositório vazio no GitHub e rodar:
            </p>

            <div className="relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="font-mono">Terminal Bash</span>
                <button
                  onClick={() => handleCopy(gitCommands, 1)}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition"
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Comandos</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono text-emerald-300/90 leading-relaxed overflow-x-auto">
                {gitCommands}
              </pre>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">Dica de Segurança:</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              O arquivo <code>.gitignore</code> já está configurado para nunca expor suas chaves reais
              (arquivos <code>.env</code>). O repositório conterá o arquivo <code>.env.example</code> como modelo seguro para quem clonar o projeto.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
