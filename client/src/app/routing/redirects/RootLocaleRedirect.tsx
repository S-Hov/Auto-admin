import { Navigate } from 'react-router-dom';
import { DEFAULT_LOCALE } from '../../../shared/i18n/config';
import { appPaths } from '../app-paths';

export const RootLocaleRedirect = () => (
  <Navigate to={appPaths.home(DEFAULT_LOCALE)} replace />
);