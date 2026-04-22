const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const TAMANHO_MAX = 10 * 1024 * 1024 // 10MB

export function validarArquivo(file: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'
  }
  if (file.size > TAMANHO_MAX) {
    return 'Arquivo muito grande. Máximo 10MB.'
  }
  return null
}
