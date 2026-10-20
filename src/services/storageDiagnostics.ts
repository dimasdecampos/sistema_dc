import { getSupabase } from '../lib/supabase';
import { dataUrlToFile } from './imageProcessing';
import { SUPABASE_STORAGE_BUCKET, STORAGE_BUCKET_CANDIDATES } from './storageService';

/** Diagnóstico do bucket de imagens (usado pelo teste do painel de administração). */

/**
 * Testa ativamente a conexão e escrita no bucket de imagens do Supabase
 */
export async function testSupabaseStorageBucket(
  preferredBucket = SUPABASE_STORAGE_BUCKET
): Promise<{
  success: boolean;
  bucketName: string;
  message: string;
  isRlsError?: boolean;
  isBucketNotFoundError?: boolean;
  details?: string;
  publicUrl?: string;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      bucketName: preferredBucket,
      message: 'Supabase não conectado. Configure a URL e a Chave Anon.',
    };
  }

  // Tenta primeiro o bucket preferido, depois candidatos alternativos
  const candidates = Array.from(
    new Set([preferredBucket, ...STORAGE_BUCKET_CANDIDATES])
  );

  let lastError: string | undefined;
  let isRls = false;
  let isNotFound = false;

  // Tiny 1x1 WebP pixel para teste
  const testPixel = dataUrlToFile(
    'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
    'ping.webp'
  );
  const testPath = `_probe_test_${Date.now()}.webp`;

  for (const bucket of candidates) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(testPath, testPixel, {
          cacheControl: '60',
          upsert: true,
          contentType: 'image/webp',
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(testPath);
        // Remove arquivo de teste (best-effort)
        supabase.storage.from(bucket).remove([testPath]).catch(() => {});

        return {
          success: true,
          bucketName: bucket,
          message: `Bucket '${bucket}' está ativo e gravando fotos com sucesso!`,
          publicUrl: pubData.publicUrl,
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
          isRls = true;
          // Bucket existe, mas RLS bloqueou inserção
          return {
            success: false,
            bucketName: bucket,
            message: `O bucket '${bucket}' existe, mas as Políticas RLS de acesso público precisam ser executadas no Supabase SQL Editor.`,
            isRlsError: true,
            details: error.message,
          };
        }
        if (msg.includes('not found') || (error as any).statusCode === '404') {
          isNotFound = true;
        }
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (isNotFound) {
    return {
      success: false,
      bucketName: preferredBucket,
      message: `Nenhum dos buckets ('${candidates.join("', '")}') foi encontrado. Crie o bucket 'img' como público ou execute o script SQL.`,
      isBucketNotFoundError: true,
      details: lastError,
    };
  }

  return {
    success: false,
    bucketName: preferredBucket,
    message: `Falha no teste do bucket: ${lastError || 'Erro desconhecido'}`,
    isRlsError: isRls,
    details: lastError,
  };
}
