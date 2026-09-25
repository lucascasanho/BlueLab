import { useIntl } from 'react-intl';

const labels: Record<string, string> = {
  en: 'Report a bug',
  pt: 'Relatar bug',
  es: 'Informar un error',
  fr: 'Signaler un bug',
};

export const BugReportLabel: React.FC = () => {
  const intl = useIntl();
  const locale = intl.locale.toLowerCase();

  return <>{labels[locale] ?? labels[locale.split('-')[0]] ?? labels.en}</>;
};
