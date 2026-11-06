// Демо-кейсы для проверки сцены. Настоящие кейсы будут грузиться из content/.
export interface DemoCase {
  kind: string; title: string; ini: string; from: string; time: string;
  body: string[]; signature: string[]; att: string; bad: boolean; why: string;
  portrait?: string; // файл в public/assets/portraits
}

export const DEMO: DemoCase[] = [
  {
    kind: 'Письмо', title: 'СРОЧНО: смена реквизитов, оплата счёта № 1187', ini: 'ТС',
    from: 'ООО ТехСнаб — бухгалтерия', time: 'сегодня, 16:02',
    body: ['Добрый день! В связи с проверкой наш расчётный счёт временно заблокирован. Просим оплату по счёту № 1187 на сумму 4 860 000 ₽ провести сегодня до 17:00 по новым реквизитам во вложении.', 'По всем вопросам звоните мне напрямую.'],
    signature: ['Сергей Павлов, бухгалтерия', '+7 499 113-08-52'],
    att: 'Novye_rekvizity_schet_1187.pdf · 96 КБ', bad: true, why: 'Телефон в подписи не совпадает с договором.',
  },
  {
    kind: 'Письмо', title: 'Изменение банковских реквизитов с 01.12.2026', ini: 'ЕК',
    from: 'Елена Кузнецова', time: 'сегодня, 16:20',
    body: ['Уважаемые коллеги! С 01.12.2026 ООО «Логистик Плюс» переходит на обслуживание в другой банк. Уведомление на бланке во вложении, оригинал направлен почтой.'],
    signature: ['Елена Кузнецова, главный бухгалтер', '+7 812 300-45-61'],
    att: 'Uvedomlenie_rekvizity_LP.pdf · 184 КБ', bad: false, portrait: 'p-kuznetsova.webp', why: 'Настоящее письмо, но по регламенту нужен звонок по договору.',
  },
];

export const QUEUE = ['Письмо', 'VPN', 'Письмо', 'Звонок', 'VPN', 'EDR'];

export const ALERTS: [string, string, boolean?][] = [
  ['16:41', 'VPN вход · o.zaytseva · Москва'],
  ['16:41', 'DNS · WS-BUH-07 → updates.docflow.ru'],
  ['16:42', 'Почта · 3 письма в карантине'],
  ['16:42', 'EDR · MON-01 · netwatch.exe → appsync-cdn.net', true],
  ['16:43', 'Proxy · 248 запросов · отдел продаж'],
  ['16:43', 'AD · 4624 · svc_backup'],
];
