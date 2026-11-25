import type { BackupErrorCode } from '../../application/errors';
import type { MedicationFormIssueCode } from '../forms/medicationFormValues';

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

export const BACKUP_ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  not_json: 'Este arquivo não é um backup válido. Escolha um arquivo .json exportado pelo MeuRemédio.',
  not_a_backup: 'Este arquivo não é um backup do MeuRemédio. Escolha o arquivo que você exportou pelo app.',
  unsupported_version: 'Este backup foi criado por uma versão incompatível do app. Exporte um novo backup no aparelho de origem.',
  incomplete: 'O backup está incompleto ou danificado. Tente exportar de novo no aparelho de origem.',
  invalid_data: 'O backup contém dados inválidos. Nada foi alterado.',
};
