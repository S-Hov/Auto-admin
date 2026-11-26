import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { appPaths } from '../../app/routing/app-paths';
import { useAppLocale } from '../../app/routing/locale/use-app-locale';
import { StatusPanel } from '../../shared/ui/StatusPanel/StatusPanel';

const NotFoundPage = () => {
  const locale = useAppLocale();
  const { t } = useTranslation('status');

  return (
    <StatusPanel variant="confused" title={t('notFound')} description={t('notFoundDescription')} fullscreen>
      <Link to={appPaths.home(locale)}>{t('home')}</Link>
    </StatusPanel>
  );
};

export default NotFoundPage;
