// Mensagens amigáveis por `code` estável vindo do backend (api-real-estate).
// Um code ausente do mapa cai no passthrough de getErrorMessage — ver api-error.ts.
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou senha incorretos.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  EMAIL_ALREADY_EXISTS: 'Este email já está cadastrado.',
  REFRESH_TOKEN_MISSING: 'Sua sessão expirou. Faça login novamente.',
  REFRESH_TOKEN_MISMATCH: 'Sua sessão expirou. Faça login novamente.',
  REFRESH_TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  ADMIN_SECRET_FORBIDDEN: 'Você não tem permissão para realizar esta ação.',

  PROPERTY_NOT_FOUND: 'Este imóvel não foi encontrado — ele pode ter sido removido.',
  PROPERTY_NOT_DELETED: 'Este imóvel não está excluído.',
  INCOMPLETE_LOCATION_UPDATE: 'Para mudar a localização, informe bairro, cidade e estado juntos.',
  INVALID_STATUS_TRANSITION: 'Não é possível alterar o status deste imóvel dessa forma.',
  INVALID_BUSINESS_TYPE_CONFIG: 'Verifique os valores de preço informados para este imóvel.',
  INVALID_SUBTYPE_DATA: 'Verifique os dados informados para este tipo de imóvel.',

  // O Multer rejeita antes de qualquer código nosso rodar e sua mensagem é o
  // literal "File too large", em inglês. O backend carimba este code para que a
  // tradução aconteça aqui, como em qualquer outro erro.
  PAYLOAD_TOO_LARGE: 'Alguma foto é grande demais (máximo de 15MB por arquivo).',
  UNSUPPORTED_MEDIA_TYPE: 'Formato de arquivo não suportado. Envie imagens JPG ou PNG.',

  IMAGE_NOT_FOUND: 'Esta imagem não foi encontrada.',
  IMAGE_NOT_BELONG_TO_PROPERTY: 'Esta imagem não pertence a este imóvel.',
  PROPERTY_IMAGE_FILE_MISSING: 'Selecione uma imagem antes de enviar.',

  ROOM_NOT_FOUND: 'Este cômodo não foi encontrado.',
  ROOM_NOT_BELONG_TO_PROPERTY: 'Este cômodo não pertence a este imóvel.',
  ROOM_NAME_ALREADY_EXISTS: 'Já existe um cômodo com esse nome neste imóvel.',

  WHATSAPP_NUMBER_NOT_FOUND: 'Este número de WhatsApp não foi encontrado.',

  GEOCODING_INVALID_ADDRESS: 'Não foi possível localizar este endereço no mapa.',
  GEOCODING_SERVICE_ERROR: 'Não foi possível consultar a localização agora. Tente novamente.',

  STORAGE_NOT_CONFIGURED: 'O envio de imagens está indisponível no momento.',

  TOO_MANY_REQUESTS: 'Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.',

  // `VALIDATION_ERROR` está fora deste mapa **de propósito**, e não por esquecimento.
  //
  // É o code que o ValidationPipe global do backend carimba, e o corpo dele traz um array com
  // uma mensagem por campo inválido ("Bairro deve ter no mínimo 2 caracteres"). Mapear o code
  // fazia `getErrorMessage` resolvê-lo primeiro e **descartar** justamente a parte específica,
  // trocando-a por uma frase fixa. Ausente do mapa, ele cai no passthrough do `message` — que
  // aqui é sempre mais informativo do que qualquer texto que se escreva neste arquivo.
  //
  // A frase antiga ("Verifique os campos destacados e tente novamente") ainda prometia algo que
  // o app não faz: nenhum formulário deste projeto destaca campo — a superfície de erro é um
  // banner agregado. Se um dia passar a destacar, o lugar de dizer isso é o formulário, não uma
  // tabela de mensagens que não sabe em que tela está.
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
};
