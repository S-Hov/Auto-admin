import { internal, notFound } from "../../shared/api/errors/error-helpers"
import type { RequestMeta } from "../../utils/getRequestMeta"
import { getUserByUserName } from "./auth.repository"
import { LoginData } from "./auth.types"
import bcrypt from 'bcryptjs';


export const loginService = async (data: LoginData, meta: RequestMeta) => {
    const {
        userName,
        password
    } = data

    const user = await getUserByUserName(userName)
    if(!user) throw notFound('Пользователь с таким именем и паролем не найден')

    try {
        const match = await bcrypt.compare(password, user.password_hash)
        if(!match) throw notFound('Пользователь с таким именем и паролем не найден')
        
    }
    catch (err) {
        throw internal('Не Удалось проверить пароль')
    }
}

export const loginConfirmationService = async (id: Number) => {

}
