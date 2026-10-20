import { getSupabase } from '../lib/supabase';
import { optimizeAndResizeImage, sanitizeFileName, type OptimizationStats } from './imageProcessing';

export const SUPABASE_STORAGE_BUCKET = 'img';
export const SUPABASE_STORAGE_FOLDER = '';
export const MAX_PHOTOS_PER_PRODUCT = 5;

// Buckets suportados em ordem de tentativa
export const STORAGE_BUCKET_CANDIDATES = ['img', 'Img', 'images'];

export interface UploadResult {
  url: string;
  path: string;
  isSupabase: boolean;
  bucketUsed?: string;
  stats?: OptimizationStats;
  error?: string;
  isRlsError?: boolean;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}


/**
 * Faz upload de uma imagem para o bucket do Supabase Storage.
 * - Tenta os buckets suportados ('img', 'Img', 'images').
 * - Aplica redimensionamento e otimização automática para economizar ~90% de espaço.
 * - Se falhar no Supabase, salva com fallback base64 MAS retorna diagnóstico transparente.
 */
export async function uploadImageToSupabase(
  fileOrBlob: File | Blob,
  options?: {
    folder?: string;
    bucket?: string;
    customName?: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    skipResize?: boolean;
  }
): Promise<UploadResult> {
  const primaryBucket = options?.bucket || SUPABASE_STORAGE_BUCKET;
  const folder = (options?.folder || SUPABASE_STORAGE_FOLDER).replace(/^\/+|\/+$/g, '');
  const supabase = getSupabase();

  // 1. Otimiza e redimensiona a imagem antes de qualquer envio
  let fileToUpload: File;
  let stats: OptimizationStats | undefined;

  if (options?.skipResize) {
    const originalName =
      options?.customName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `foto-${Date.now()}.jpg`);
    fileToUpload =
      fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], originalName, { type: fileOrBlob.type || 'image/jpeg' });
  } else {
    const optimized = await optimizeAndResizeImage(fileOrBlob, {
      maxWidth: options?.maxWidth || 1200,
      maxHeight: options?.maxHeight || 1200,
      quality: options?.quality ?? 0.82,
      outputFormat: 'image/webp',
    });
    fileToUpload = optimized.file;
    stats = optimized.stats;
  }

  const safeName = sanitizeFileName(options?.customName || fileToUpload.name);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const filePath = folder ? `${folder}/${uniquePrefix}-${safeName}` : `${uniquePrefix}-${safeName}`;

  // Se o Supabase estiver configurado e conectado
  if (supabase) {
    const candidateBuckets = Array.from(
      new Set([primaryBucket, ...STORAGE_BUCKET_CANDIDATES])
    );

    let lastError: string | undefined;
    let isRlsError = false;

    for (const b of candidateBuckets) {
      try {
        const { error, data } = await supabase.storage
          .from(b)
          .upload(filePath, fileToUpload, {
            cacheControl: '31536000', // 1 ano de cache
            upsert: true,
            contentType: fileToUpload.type || 'image/webp',
          });

        if (!error && data) {
          // Sucesso no upload para o Supabase! Retorna a URL pública
          const { data: pubData } = supabase.storage.from(b).getPublicUrl(filePath);
          return {
            url: pubData.publicUrl,
            path: filePath,
            isSupabase: true,
            bucketUsed: b,
            stats,
          };
        }

        if (error) {
          lastError = error.message;
          const msg = error.message?.toLowerCase() || '';
          if (
            msg.includes('row-level security') ||
            msg.includes('violates') ||
            msg.includes('policy') ||
            (error as any).statusCode === '403'
          ) {
            isRlsError = true;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    // Se chegou aqui, todos os buckets candidatos falharam no Supabase
    console.warn(`Falha ao salvar no Supabase Storage:`, lastError);
    const fallbackUrl = await blobToDataUrl(fileToUpload);

    let errorDetail = `Falha no Supabase: ${lastError || 'Erro desconhecido'}.`;
    if (isRlsError) {
      errorDetail = `Erro de Permissão (RLS): O bucket existe, mas falta a política de inserção pública no Supabase. Execute o script SQL no SQL Editor.`;
    } else if (lastError?.toLowerCase().includes('not found')) {
      errorDetail = `Bucket '${primaryBucket}' não encontrado no seu Supabase. Crie o bucket com nome 'img' e acesso público (Public).`;
    }

    return {
      url: fallbackUrl,
      path: filePath,
      isSupabase: false,
      stats,
      isRlsError,
      error: `${errorDetail} (Foto mantida localmente para não perder seu anúncio).`,
    };
  }

  // Fallback se o Supabase não estiver conectado ainda
  const fallbackUrl = await blobToDataUrl(fileToUpload);
  return {
    url: fallbackUrl,
    path: filePath,
    isSupabase: false,
    stats,
    error: 'Supabase não conectado. Configure a URL e Chave Anon para gravar as fotos na nuvem.',
  };
}

/**
 * Upload de múltiplas imagens em lote para a pasta do bucket 'img' com otimização
 */
export async function uploadMultipleImagesToSupabase(
  files: File[],
  options?: {
    folder?: string;
    bucket?: string;
    onProgress?: (completed: number, total: number, stats?: OptimizationStats) => void;
  }
): Promise<{ urls: string[]; results: UploadResult[] }> {
  const results: UploadResult[] = [];
  const urls: string[] = [];
  let count = 0;

  for (const file of files) {
    const res = await uploadImageToSupabase(file, {
      folder: options?.folder,
      bucket: options?.bucket,
    });
    results.push(res);
    urls.push(res.url);
    count++;
    if (options?.onProgress) {
      options.onProgress(count, files.length, res.stats);
    }
  }

  return { urls, results };
}

/**
 * Exclui uma imagem do Supabase Storage dado seu caminho ou URL pública.
 * Suporta buckets 'Img' e 'img'.
 */
export async function deleteImageFromSupabase(urlOrPath: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !urlOrPath) return false;

  // Se for DataURL (base64) ou foto externa (ex: Unsplash), não precisa apagar do Supabase
  if (urlOrPath.startsWith('data:') || urlOrPath.includes('images.unsplash.com')) {
    return true;
  }

  let targetBucket = SUPABASE_STORAGE_BUCKET;
  let filePath = urlOrPath;

  // Se for URL pública do Supabase (.../storage/v1/object/public/<bucket>/<path>)
  const match = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    targetBucket = match[1];
    filePath = match[2];
  } else {
    // Remove possíveis prefixos de bucket se passados no path
    filePath = filePath.replace(/^Img\//, '').replace(/^img\//, '');
  }

  try {
    const { error } = await supabase.storage.from(targetBucket).remove([filePath]);
    if (error) {
      // Tenta na capitalização alternativa
      const altBucket = targetBucket === 'Img' ? 'img' : 'Img';
      await supabase.storage.from(altBucket).remove([filePath]);
    }
    return true;
  } catch (err) {
    console.warn('Erro ao remover imagem do Supabase Storage:', err);
    return false;
  }
}

/**
 * Exclui múltiplas fotos de um anúncio do Supabase Storage
 */
export async function deleteMultipleImagesFromSupabase(urlsOrPaths: string[]): Promise<void> {
  if (!urlsOrPaths || urlsOrPaths.length === 0) return;
  await Promise.allSettled(urlsOrPaths.map((p) => deleteImageFromSupabase(p)));
}

/**
 * Converte Blob ou File para DataURL (Base64) como fallback
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

