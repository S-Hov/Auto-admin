import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '../../shared/ui/Button/Button';
import { getErrorVariant } from '../../shared/ui/StatusPanel/get-error-variant';
import { StatusPanel } from '../../shared/ui/StatusPanel/StatusPanel';

export function RouteError() {
    const error = useRouteError();
    const { t } = useTranslation('status');
    const variant = getErrorVariant(isRouteErrorResponse(error) ? error.status : error);
    const title = variant === 'forbidden' ? 'forbidden' : variant === 'confused' ? 'notFound' : 'systemError';

    return (
        <StatusPanel variant={variant} title={t(title)} fullscreen role="alert">
            <Button onClick={() => window.location.reload()}>{t('reload')}</Button>
        </StatusPanel>
    );
}
