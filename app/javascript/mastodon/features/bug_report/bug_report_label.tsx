import { useIntl } from 'react-intl';

const labelForLocale = (locale: string): string => {
  switch (locale.split('-')[0]) {
    case 'pt':
      return 'Relatar bug';
    case 'es':
      return 'Informar un error';
    case 'fr':
      return 'Signaler un bug';
    default:
      return 'Report a bug';
  }
};

export const BugReportLabel = () => {
  const intl = useIntl();

  return labelForLocale(intl.locale.toLowerCase());
};
