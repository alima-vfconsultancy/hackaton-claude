import type { AllergyIssueCode } from '../../domain/allergy';
import type { BackupErrorCode } from '../../application/errors';
import type { MedicationFormIssueCode } from '../forms/medicationFormValues';
import type { RequiredField } from '../forms/missingRequiredFields';

/** Error messages always say what to do next. */
export const MEDICATION_ISSUE_MESSAGES: Record<MedicationFormIssueCode, string> = {
  name_required: 'Escreva o nome do remédio.',
  dosage_invalid: 'A dosagem deve ser um número, por exemplo 500 ou 0,5.',
  interval_required: 'Informe de quantas em quantas horas você toma (por exemplo, 8).',
  interval_too_long: 'O intervalo é muito grande. Use um valor de até 168 horas.',
  first_dose_required: 'Escolha o horário da primeira dose.',
  times_required: 'Adicione pelo menos um horário.',
  start_date_required: 'Escolha a data de início.',
  duration_invalid: 'A duração deve ser de pelo menos 1 dia.',
  duration_required: 'Informe por quantos dias vai tomar, a data final ou marque uso contínuo.',
  end_before_start: 'A data final deve ser igual ou depois da data de início.',
};

/** Shown next to a required field that is empty: `notRead` when the prescription did not provide it, `empty` otherwise. */
export const REQUIRED_FIELD_MESSAGES: Record<RequiredField, { notRead: string; empty: string }> = {
  name: {
    notRead: 'Não encontrei o nome do remédio na receita. Escreva o nome.',
    empty: 'Falta o nome do remédio. Escreva o nome.',
  },
  schedule: {
    notRead: 'Não encontrei a frequência na receita. Informe de quantas em quantas horas ou os horários.',
    empty: 'Falta informar a frequência: de quantas em quantas horas ou os horários.',
  },
  duration: {
    notRead: 'Não encontrei por quanto tempo tomar. Informe os dias, a data final ou marque uso contínuo.',
    empty: 'Falta informar por quanto tempo vai tomar. Informe os dias, a data final ou marque uso contínuo.',
  },
};

export const ALLERGY_ISSUE_MESSAGES: Record<AllergyIssueCode, string> = {
  substance_required: 'Escreva o nome do remédio ou da substância à qual você tem alergia.',
  substance_duplicated: 'Esta alergia já está na sua lista.',
};

export const BACKUP_ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  not_json: 'Este arquivo não é um backup válido. Escolha um arquivo .json exportado pelo Dose Certa.',
  not_a_backup: 'Este arquivo não é um backup do Dose Certa. Escolha o arquivo que você exportou pelo app.',
  unsupported_version: 'Este backup foi criado por uma versão incompatível do app. Exporte um novo backup no aparelho de origem.',
  incomplete: 'O backup está incompleto ou danificado. Tente exportar de novo no aparelho de origem.',
  invalid_data: 'O backup contém dados inválidos. Nada foi alterado.',
};

export const AI_CHECK_CONSENT_TITLE = 'Enviar nomes para verificação por IA?';
export const AI_CHECK_CONSENT_MESSAGE =
  'Para verificar, o app envia pela internet apenas os nomes dos remédios desta receita e a lista das suas alergias a um serviço de inteligência artificial (Claude, da Anthropic). A foto, o texto da receita, seu nome e seus horários não são enviados. Você pode desligar isso em Ajustes.';

export const AI_CHECK_STATUS_MESSAGES = {
  failed: 'Não foi possível verificar agora. Confira sua internet e tente de novo. O aviso básico continua funcionando.',
  no_allergies: 'Cadastre suas alergias em Ajustes para usar esta verificação.',
  unavailable: 'A verificação por IA não está ativada neste app.',
} as const;

/** Result of asking the browser for permission to show reminders. */
export const NOTIFICATION_PERMISSION_MESSAGES = {
  granted: 'Avisos ativados. O celular vai avisar na hora de cada remédio.',
  denied:
    'Os avisos foram bloqueados. Para ativar, abra as configurações do navegador, permita notificações para este app e tente de novo.',
  unsupported: 'Este navegador não permite avisos. Use "Adicionar lembretes ao calendário" em cada remédio.',
  default: 'Os avisos não foram ativados. Toque de novo e escolha "Permitir".',
} as const;
