import { asyncHandler } from '../../utils/asyncHandler';
import { checkConnectionService } from './install.service';
import { type DbConnectionData } from './install.types';

export const checkConnectionController = asyncHandler(async (req: any, res: any) => {
    const { host, port, database, user, password }: DbConnectionData = req.body;
    const isConnected = await checkConnectionService({ host, port, database, user, password });

})