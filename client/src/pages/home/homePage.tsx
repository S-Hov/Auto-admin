import { useTranslation } from 'react-i18next';
import { StatusPanel } from '../../shared/ui/StatusPanel/StatusPanel';

const HomePage = () => {
  const { t } = useTranslation('status');

  return <StatusPanel variant="waving" title={t('welcome')} description={t('welcomeDescription')} />;
};

export default HomePage;
