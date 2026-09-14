# Локализация клиента через URL: пошаговая инструкция

## 1. Что мы хотим получить

После выполнения этой инструкции язык интерфейса будет частью URL:

```text
https://example.com/ru
https://example.com/ru/auth/login
https://example.com/ru/install/runMigrations

https://example.com/en
https://example.com/en/auth/login
https://example.com/en/install/runMigrations
```

Первая версия поддерживает два языка:

- `ru` — русский;
- `en` — английский.

URL будет единственным источником правды о выбранном языке. Если открыт адрес
`/en/auth/login`, интерфейс обязан быть английским. Если открыт `/ru/auth/login` —
русским.

Это важно по нескольким причинам:

- ссылку можно скопировать, и другой человек откроет её на том же языке;
- перезагрузка страницы не сбрасывает язык;
- кнопка «Назад» работает предсказуемо;
- React-компонентам не нужно угадывать язык по случайным значениям в памяти;
- в будущем сервер или reverse proxy сможет правильно обрабатывать такие URL.

В качестве первого реального примера локализуем страницу входа и находящийся на
ней компонент `AuthForm`.

## 2. Что в проекте уже есть

В клиенте уже установлены:

```text
i18next
react-i18next
```

И уже существуют файлы:

```text
client/src/shared/i18n/index.ts
client/src/shared/i18n/resources.ts
client/src/shared/i18n/api-message.ts
client/src/shared/i18n/locales/ru/api.ts
client/src/shared/i18n/locales/en/api.ts
```

Сейчас они переводят коды ответов сервера. Например, сервер возвращает
`AUTH.INVALID_CREDENTIALS`, а клиент показывает нужный текст.

Эту систему не нужно удалять или создавать заново. Мы расширим её так, чтобы тот
же экземпляр `i18next` переводил ещё и обычный интерфейс.

Важно различать:

```text
api namespace       → сообщения о результате запросов сервера
authForm namespace  → надписи, принадлежащие форме входа
loginPage namespace → надписи, принадлежащие самой странице входа
```

Сервер по-прежнему возвращает коды, а не русский или английский текст. Язык
интерфейса выбирает клиент.

## 3.

Но не нужно механически
создавать папку `i18n` для каждого маленького `div`, `Button` или `Input`.

Правило должно быть таким:

> Перевод хранится рядом с тем модулем, который владеет смыслом текста.

Например:

- `AuthForm` знает, что поле называется «Имя пользователя», поэтому перевод
  принадлежит `features/auth-form`;
- обычный `ControlledInput` не знает, какое поле он показывает, и получает
  `label` через props — собственный перевод ему не нужен;
- `Button` получает текст через `children` — отдельная папка перевода ему тоже не
  нужна;
- сообщение `AUTH.INVALID_CREDENTIALS` относится к API-контракту и остаётся в
  общем namespace `api`;
- надпись, используемая во многих независимых местах, может жить в namespace
  `common`.

Так переводы остаются рядом с функцией, но проект не превращается в сотни папок с
одной строкой.

## 4. Итоговая структура первой реализации

Новые и изменяемые файлы будут выглядеть так:

```text
client/src/
├─ app/
│  └─ routing/
│     ├─ guards/
│     │  └─ AppGate.tsx
│     ├─ layouts/
│     │  └─ LocaleLayout.tsx
│     ├─ locale/
│     │  ├─ locale-path.ts
│     │  └─ use-app-locale.ts
│     ├─ app-paths.ts
│     └─ router.tsx
│
├─ features/
│  ├─ auth-form/
│  │  ├─ i18n/
│  │  │  ├─ ru.json
│  │  │  └─ en.json
│  │  └─ ui/AuthForm.tsx
│  │
│  └─ language-switcher/
│     └─ ui/LanguageSwitcher.tsx
│
├─ pages/
│  └─ login/
│     ├─ i18n/
│     │  ├─ ru.json
│     │  └─ en.json
│     └─ loginPage.tsx
│
└─ shared/
   └─ i18n/
      ├─ config.ts
      ├─ index.ts
      ├─ resources.ts
      ├─ i18next.d.ts
      └─ resources.test.ts
```

Переключатель языка будет написан, но на этом этапе его не нужно импортировать в
layout, header или любую страницу.

---

## Этап 1. Описать поддерживаемые языки в одном месте

### Какую проблему решаем

Без общего каталога в одном файле может появиться проверка `ru | en`, в другом —
`ru | en | de`, а в третьем — просто `string`. Через некоторое время разные части
приложения начнут понимать список языков по-разному.

### Какой файл создать

```text
client/src/shared/i18n/config.ts
```

### Что в нём должно быть

```ts
export const SUPPORTED_LOCALES = ['ru', 'en'] as const;

export type AppLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: AppLocale = 'ru';

export function isAppLocale(value: unknown): value is AppLocale {
    return typeof value === 'string'
        && SUPPORTED_LOCALES.includes(value as AppLocale);
}
```

### Что означает этот код

`SUPPORTED_LOCALES` — единственный список доступных языков.

`as const` говорит TypeScript: это не просто массив любых строк, а точные значения
`ru` и `en`.

`AppLocale` в результате становится типом:

```ts
type AppLocale = 'ru' | 'en';
```

`DEFAULT_LOCALE` — язык, на который мы отправим человека, открывшего просто `/`.

`isAppLocale` — runtime-проверка. TypeScript не может гарантировать содержимое
URL, потому что его вводит пользователь. Поэтому значение из URL сначала имеет
тип `string | undefined`, а затем проверяется этой функцией.

### Проверка этапа

Временно вызови `isAppLocale('ru')`, `isAppLocale('en')` и
`isAppLocale('anything')` в тесте или через IDE. Результаты должны быть `true`,
`true`, `false`.

---

## Этап 2. Добавить переводы формы входа рядом с формой

### Какие файлы создать

```text
client/src/features/auth-form/i18n/ru.json
client/src/features/auth-form/i18n/en.json
```

### Русский файл

```json
{
  "title": "Вход в админ-панель",
  "description": "Введите имя пользователя и пароль",
  "fields": {
    "userName": {
      "label": "Имя пользователя",
      "placeholder": "admin"
    },
    "password": {
      "label": "Пароль",
      "placeholder": "Введите пароль"
    }
  },
  "submit": "Войти",
  "requestInProgress": "Выполняется вход..."
}
```

### Английский файл

```json
{
  "title": "Sign in to the admin panel",
  "description": "Enter your username and password",
  "fields": {
    "userName": {
      "label": "Username",
      "placeholder": "admin"
    },
    "password": {
      "label": "Password",
      "placeholder": "Enter your password"
    }
  },
  "submit": "Sign in",
  "requestInProgress": "Signing in..."
}
```

### Почему ключи написаны по-английски

Ключ — это стабильный технический адрес текста, а не сам текст. Плохой вариант:

```ts
t('Вход в админ-панель')
```

Если русская фраза изменится, придётся менять код. Хороший вариант:

```ts
t('title')
```

Текст можно менять отдельно от компонента.

### Важное правило одинаковой структуры

У `ru.json` и `en.json` должны быть одинаковые ключи. Если в русском есть
`fields.password.label`, этот же ключ обязан существовать в английском.

---

## Этап 3. Добавить перевод, принадлежащий странице входа

Сама `LoginPage` сейчас почти не содержит текста. Чтобы показать правильное
разделение ответственности, отдадим ей только заголовок вкладки браузера.

Создать:

```text
client/src/pages/login/i18n/ru.json
client/src/pages/login/i18n/en.json
```

`ru.json`:

```json
{
  "documentTitle": "Вход — Auto Admin"
}
```

`en.json`:

```json
{
  "documentTitle": "Sign in — Auto Admin"
}
```

Заголовок формы не нужно дублировать здесь. Он принадлежит `AuthForm` и уже лежит
в переводах этой feature.

---

## Этап 4. Подключить локальные JSON к общему реестру

### Зачем нужен общий реестр

Переводы лежат рядом с компонентами, но `i18next` всё равно должен один раз узнать,
какие наборы переводов существуют. Для этого используется
`client/src/shared/i18n/resources.ts`.

Этот файл не владеет текстами. Он только импортирует и собирает их.

### Как изменить `resources.ts`

Сохрани существующие `ruApi` и `enApi`, затем добавь импорты JSON:

```ts
import { ruApi } from './locales/ru/api';
import { enApi } from './locales/en/api';
import authFormRu from '../../features/auth-form/i18n/ru.json';
import authFormEn from '../../features/auth-form/i18n/en.json';
import loginPageRu from '../../pages/login/i18n/ru.json';
import loginPageEn from '../../pages/login/i18n/en.json';

export const resources = {
    ru: {
        api: ruApi,
        authForm: authFormRu,
        loginPage: loginPageRu,
    },
    en: {
        api: enApi,
        authForm: authFormEn,
        loginPage: loginPageEn,
    },
} as const;
```

`api`, `authForm` и `loginPage` называются namespace.

Полный адрес ключа можно представить так:

```text
authForm:title
authForm:fields.userName.label
loginPage:documentTitle
api:AUTH.INVALID_CREDENTIALS
```

Namespace предотвращает столкновения одинаковых ключей. Например, `title` может
одновременно существовать у формы входа и у страницы настройки базы.

### Почему не нужно автоматически искать JSON через файловую систему

Явные импорты немного длиннее, зато:

- сборщик точно видит используемые файлы;
- переименование ломается на этапе сборки, а не у пользователя;
- легко найти все зарегистрированные namespace;
- порядок и состав ресурсов не зависят от окружения.

Для текущего размера проекта это надёжнее магической автозагрузки.

---

## Этап 5. Настроить один экземпляр i18next

Изменить:

```text
client/src/shared/i18n/index.ts
```

Целевая настройка:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './config';
import { resources } from './resources';

void i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: SUPPORTED_LOCALES,
        defaultNS: 'api',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
```

### Для чего нужна каждая настройка

- `resources` — все известные переводы;
- `lng` — начальный язык до чтения URL;
- `fallbackLng` — запасной язык, если ключ случайно отсутствует;
- `supportedLngs` — языки, которые разрешено использовать;
- `defaultNS` — namespace для вызова без явного namespace;
- `escapeValue: false` — React сам безопасно экранирует обычный текст.

Fallback не заменяет проверку переводов. Если английский ключ пропущен, приложение
не должно молча считаться готовым только потому, что показало русский вариант.

### Чего не делать

Не создавай второй экземпляр `i18next` внутри компонента. Во всём клиенте должен
использоваться тот экземпляр, который импортируется в `main.tsx` через:

```ts
import './shared/i18n';
```

---

## Этап 6. Добавить TypeScript-подсказки для ключей

Создать:

```text
client/src/shared/i18n/i18next.d.ts
```

```ts
import 'i18next';
import type { resources } from './resources';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'api';
        resources: (typeof resources)['ru'];
    }
}
```

Этот файл расширяет типы библиотеки. После этого IDE лучше подсказывает namespace
и ключи и чаще замечает опечатки.

Например, корректный ключ:

```ts
t('fields.userName.label')
```

А опечатка вроде `fields.userName.lable` должна подсвечиваться.

Типы строятся по русскому ресурсу, поэтому отдельный тест позже проверит, что
английский ресурс имеет те же ключи.

---

## Этап 7. Научить страницу и форму получать переводы

### 7.1. Локализация `AuthForm`

Изменить:

```text
client/src/features/auth-form/ui/AuthForm.tsx
```

В компоненте получить функцию перевода:

```ts
import { useTranslation } from 'react-i18next';

const AuthForm = () => {
    const { t } = useTranslation('authForm');

    // остальной код
};
```

`useTranslation` — React hook. Он делает две вещи:

1. Даёт функцию `t`, которая получает текст по ключу.
2. Просит React перерисовать компонент, когда язык изменится.

Существующий массив `FIELDS` сейчас находится вне компонента и содержит готовый
русский текст. Переведи его внутрь `AuthForm`, потому что функция `t` доступна
только после вызова hook:

```ts
const fields: FieldConfig[] = [
    {
        name: 'userName',
        label: t('fields.userName.label'),
        placeholder: t('fields.userName.placeholder'),
    },
    {
        name: 'password',
        label: t('fields.password.label'),
        type: 'password',
        placeholder: t('fields.password.placeholder'),
    },
];
```

Затем заменить строки:

```tsx
<CardForm
    headerTitle={t('title')}
    headerDescription={t('description')}
    onSubmit={handleSubmit(onSubmit)}
>
```

Текст кнопки:

```tsx
<Button ...>
    {t('submit')}
</Button>
```

Текст загрузки toast:

```ts
loading: t('requestInProgress')
```

Успех и ошибка запроса продолжают проходить через `apiMessage`. Дублировать
`AUTH.LOGIN_SUCCEEDED` в `authForm/ru.json` не нужно.

### Почему `fields` пока не обязательно оборачивать в `useMemo`

В массиве всего два элемента. Его создание на каждом render почти ничего не
стоит. `useMemo` сейчас только усложнит учебный пример. Оптимизацию добавляют после
измерения реальной проблемы, а не заранее.

### 7.2. Локализация `LoginPage`

Изменить:

```text
client/src/pages/login/loginPage.tsx
```

Страница получает свой namespace отдельно:

```ts
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AuthForm from '../../features/auth-form/ui/AuthForm';

const LoginPage = () => {
    const { t } = useTranslation('loginPage');

    useEffect(() => {
        document.title = t('documentTitle');
    }, [t]);

    return (
        <section className="section login-page h-100">
            <div className="container flex flex-center h-100__percent">
                <AuthForm />
            </div>
        </section>
    );
};

export default LoginPage;
```

Здесь хорошо видно разделение:

- `LoginPage` переводит только то, чем владеет страница;
- `AuthForm` сама переводит свою форму;
- `CardForm`, `ControlledInput` и `Button` получают уже готовые строки через
  props/children.

---

## Этап 8. Создать функции для языковых URL

После появления префикса нельзя продолжать вручную писать строки вроде
`'/auth/login'`. Иначе один redirect добавит язык, а другой случайно его потеряет.

### 8.1. Каталог путей

Создать:

```text
client/src/app/routing/app-paths.ts
```

```ts
import type { AppLocale } from '../../shared/i18n/config';

export const appPaths = {
    home: (locale: AppLocale) => `/${locale}`,
    login: (locale: AppLocale) => `/${locale}/auth/login`,
    install: (locale: AppLocale) => `/${locale}/install`,
    runMigrations: (locale: AppLocale) => `/${locale}/install/runMigrations`,
    migrationRecovery: (locale: AppLocale) => `/${locale}/install/migrationRecovery`,
    registerAdmin: (locale: AppLocale) => `/${locale}/install/register`,
    users: (locale: AppLocale) => `/${locale}/users`,
} as const;
```

Пока сохраняем текущие названия `runMigrations` и `migrationRecovery`. Переход на
kebab-case можно сделать отдельно. Не стоит смешивать изменение URL-стиля с
локализацией.

### 8.2. Замена языка в существующем URL

Создать:

```text
client/src/app/routing/locale/locale-path.ts
```

Функция нужна переключателю языка и обработке неправильных URL:

```ts
import type { AppLocale } from '../../../shared/i18n/config';

const LOCALE_SEGMENT_PATTERN = /^[a-z]{2}$/i;

export function changePathLocale(pathname: string, locale: AppLocale): string {
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];

    if (firstSegment && LOCALE_SEGMENT_PATTERN.test(firstSegment)) {
        segments[0] = locale;
    } else {
        segments.unshift(locale);
    }

    return `/${segments.join('/')}`;
}
```

Примеры:

```text
changePathLocale('/ru/auth/login', 'en') → /en/auth/login
changePathLocale('/en/install', 'ru')    → /ru/install
changePathLocale('/de/auth/login', 'ru') → /ru/auth/login
changePathLocale('/auth/login', 'ru')    → /ru/auth/login
changePathLocale('/', 'ru')              → /ru
```

`search` и `hash` эта функция не принимает. Их переключатель сохранит отдельно,
чтобы `?page=2` и `#section` не потерялись.

---

## Этап 9. Создать hook для получения проверенного языка

Создать:

```text
client/src/app/routing/locale/use-app-locale.ts
```

```ts
import { useParams } from 'react-router-dom';
import { isAppLocale, type AppLocale } from '../../../shared/i18n/config';

export function useAppLocale(): AppLocale {
    const { locale } = useParams<{ locale: string }>();

    if (!isAppLocale(locale)) {
        throw new Error('useAppLocale must be used inside a valid locale route');
    }

    return locale;
}
```

Почему здесь допустим `throw`:

- введённое пользователем значение проверит `LocaleLayout`;
- дочерние компоненты появятся только после успешной проверки;
- если этот hook вызвали не там, это уже ошибка разработчика, которую нельзя
  тихо скрывать.

---

## Этап 10. Создать `LocaleLayout`

### Задача layout

`LocaleLayout` находится выше всех страниц языка и выполняет четыре действия:

1. Читает `:locale` из URL.
2. Проверяет, поддерживается ли он.
3. Синхронизирует `i18next` с URL.
4. Устанавливает атрибут `<html lang="...">`.

Создать:

```text
client/src/app/routing/layouts/LocaleLayout.tsx
```

Основная форма компонента:

```tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import i18n from '../../../shared/i18n';
import {
    DEFAULT_LOCALE,
    isAppLocale,
} from '../../../shared/i18n/config';
import { changePathLocale } from '../locale/locale-path';

const LocaleLayout = () => {
    const { locale } = useParams<{ locale: string }>();
    const location = useLocation();
    const validLocale = isAppLocale(locale) ? locale : null;
    const [isLanguageReady, setIsLanguageReady] = useState(
        validLocale !== null && i18n.resolvedLanguage === validLocale,
    );

    useEffect(() => {
        if (!validLocale) return;

        let isActive = true;
        setIsLanguageReady(i18n.resolvedLanguage === validLocale);

        void i18n.changeLanguage(validLocale).then(() => {
            if (isActive) setIsLanguageReady(true);
        });

        document.documentElement.lang = validLocale;

        return () => {
            isActive = false;
        };
    }, [validLocale]);

    if (!validLocale) {
        const pathname = changePathLocale(location.pathname, DEFAULT_LOCALE);

        return (
            <Navigate
                to={`${pathname}${location.search}${location.hash}`}
                replace
            />
        );
    }

    if (!isLanguageReady || i18n.resolvedLanguage !== validLocale) {
        return <div>Loading...</div>;
    }

    return <Outlet />;
};

export default LocaleLayout;
```

### Почему нужен промежуточный loader

`changeLanguage` возвращает Promise. Без ожидания React может на один кадр показать
старый язык, а затем новый. Проверка `isLanguageReady` не даёт отрисовать страницу,
пока язык не синхронизирован.

Позже текст `Loading...` нужно заменить существующим визуальным loader-компонентом.
Он не должен сам зависеть от ещё не загруженного перевода.

### Почему `useEffect` вызывается до `if (!validLocale)`

React hooks нельзя вызывать условно. Если на одном render hook был вызван, а на
другом нет, порядок hooks меняется и React выдаёт ошибку. Поэтому hook вызывается
всегда, а проверка находится внутри него.

### Что произойдёт с неправильными адресами

```text
/de/auth/login → /ru/auth/login
/auth/login    → /ru/auth/login
/install       → /ru/install
```

Переход делается с `replace`, чтобы неправильный адрес не оставался лишней записью
в истории браузера.

---

## Этап 11. Перестроить router под `/:locale`

Изменить:

```text
client/src/app/routing/router.tsx
```

Главная идея дерева маршрутов:

```text
/
└─ redirect → /ru

/:locale
└─ LocaleLayout
   └─ AppGate
      ├─ index                  → AdminLayout / HomePage
      ├─ auth/login             → AuthLayout / LoginPage
      ├─ install                → InstallPage
      ├─ install/register       → CreateAdminPage
      ├─ install/runMigrations  → RunMigrationsPage
      └─ install/migrationRecovery
```

Маршруты внутри `/:locale` должны быть относительными — без начального `/`:

```tsx
{
    path: '/:locale',
    element: <LocaleLayout />,
    children: [
        {
            element: <AppGate />,
            children: [
                {
                    element: <AdminLayout />,
                    children: [
                        {
                            index: true,
                            element: PageLoader(<HomePage />),
                        },
                    ],
                },
                {
                    path: 'auth',
                    element: <AuthLayout />,
                    children: [
                        {
                            path: 'login',
                            element: PageLoader(<LoginPage />),
                        },
                    ],
                },
                {
                    path: 'install',
                    element: <InstallLayout />,
                    children: [
                        {
                            index: true,
                            element: PageLoader(<InstallPage />),
                        },
                        {
                            path: 'register',
                            element: PageLoader(<CreateAdminPage />),
                        },
                        {
                            path: 'runMigrations',
                            element: PageLoader(<RunMigrationsPage />),
                        },
                        {
                            path: 'migrationRecovery',
                            element: PageLoader(<MigrationRecoveryPage />),
                        },
                    ],
                },
                {
                    path: '*',
                    element: PageLoader(<NotFoundPage />),
                },
            ],
        },
    ],
}
```

Для `/` создай отдельный файл:

```text
client/src/app/routing/redirects/RootLocaleRedirect.tsx
```

В нём будет маленький компонент:

```tsx
import { Navigate } from 'react-router-dom';
import { DEFAULT_LOCALE } from '../../../shared/i18n/config';
import { appPaths } from '../app-paths';

export const RootLocaleRedirect = () => (
    <Navigate to={appPaths.home(DEFAULT_LOCALE)} replace />
);
```

И добавь его отдельным верхнеуровневым route перед `/:locale`:

```tsx
{
    path: '/',
    element: <RootLocaleRedirect />,
}
```

### Почему пока просто `/` → `/ru`

Автовыбор по `navigator.language` иногда неожиданно меняет язык на общем или
удалённом компьютере. Для первой версии детерминированное правило проще:

```text
нет языка в URL → DEFAULT_LOCALE
```

Позже можно запоминать последний выбор, но URL всё равно должен иметь высший
приоритет.

### Важная проверка Not Found

Не делай redirect любого неизвестного адреса на главную страницу. Адрес
`/ru/abracadabra` должен показать 404, а не молча открыть `/ru`. Иначе ошибки в
ссылках невозможно заметить.

---

## Этап 12. Исправить `AppGate`

Это обязательный этап. Сейчас `AppGate` сравнивает:

```text
/install
/install/runMigrations
/auth/login
/
```

После добавления языка реальные адреса станут другими:

```text
/ru/install
/ru/install/runMigrations
/ru/auth/login
/ru
```

Если оставить старые сравнения, gate будет считать правильную страницу
неправильной и может создать бесконечные redirect.

В начале `AppGate` получи язык:

```ts
const locale = useAppLocale();
```

Затем используй каталог путей:

```ts
const paths = {
    home: appPaths.home(locale),
    login: appPaths.login(locale),
    install: appPaths.install(locale),
    runMigrations: appPaths.runMigrations(locale),
    migrationRecovery: appPaths.migrationRecovery(locale),
    registerAdmin: appPaths.registerAdmin(locale),
};
```

Пример одной проверки:

```tsx
if (state.stage === 'database_required') {
    if (location.pathname !== paths.install) {
        return <Navigate to={paths.install} replace />;
    }

    return <Outlet />;
}
```

По этому же принципу заменить остальные жёстко записанные пути.

Проверка страницы входа:

```tsx
if (status === 'unauthenticated' && location.pathname !== paths.login) {
    return <Navigate to={paths.login} replace />;
}
```

Проверку install/auth-адреса можно построить от локализованных корней:

```ts
const authRoot = `/${locale}/auth`;
const installRoot = `/${locale}/install`;

const isAuthOrInstallPath =
    location.pathname === authRoot
    || location.pathname.startsWith(`${authRoot}/`)
    || location.pathname === installRoot
    || location.pathname.startsWith(`${installRoot}/`);
```

Авторизованного пользователя отправлять на:

```tsx
<Navigate to={paths.home} replace />
```

### Не сравнивай через `includes('/install')`

`includes` может случайно совпасть с частью другого адреса. Точное равенство и
`startsWith` с завершающим `/` дают более понятное правило.

---

## Этап 13. Исправить обычные ссылки

После изменения router найди клиентские переходы:

```text
<Link to="/...">
<Navigate to="/...">
navigate('/...')
location.pathname === '/...'
location.pathname.startsWith('/...')
```

В текущем проекте особенно проверь:

```text
client/src/app/routing/guards/AppGate.tsx
client/src/app/routing/layouts/AdminLayout.tsx
client/src/app/routing/router.tsx
```

Например, в `AdminLayout`:

```tsx
const locale = useAppLocale();

<Link to={appPaths.home(locale)}>
    ...
</Link>
```

И аналогично для `users`.

API-адреса менять не нужно:

```text
/auth/login
/auth/me
/install/migrations/plan
```

Это серверные endpoint, а не страницы React. Языковой префикс относится только к
URL интерфейса:

```text
страница: /ru/auth/login
API:      /api/auth/login или текущий настроенный API base URL
```

Добавление `/ru` к API-запросам будет ошибкой.

---

## Этап 14. Написать, но пока не подключать переключатель

Создать:

```text
client/src/features/language-switcher/ui/LanguageSwitcher.tsx
```

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { SUPPORTED_LOCALES, type AppLocale } from '../../../shared/i18n/config';
import { changePathLocale } from '../../../app/routing/locale/locale-path';
import { useAppLocale } from '../../../app/routing/locale/use-app-locale';

const LABELS: Record<AppLocale, string> = {
    ru: 'RU',
    en: 'EN',
};

export const LanguageSwitcher = () => {
    const currentLocale = useAppLocale();
    const location = useLocation();
    const navigate = useNavigate();

    const selectLocale = (nextLocale: AppLocale) => {
        if (nextLocale === currentLocale) return;

        navigate(
            {
                pathname: changePathLocale(location.pathname, nextLocale),
                search: location.search,
                hash: location.hash,
            },
            { replace: true },
        );
    };

    return (
        <div role="group" aria-label="Language">
            {SUPPORTED_LOCALES.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    aria-pressed={locale === currentLocale}
                    onClick={() => selectLocale(locale)}
                >
                    {LABELS[locale]}
                </button>
            ))}
        </div>
    );
};
```

### Как он работает

Допустим, пользователь находится здесь:

```text
/ru/orders?page=3#history
```

Он нажимает `EN`. Переключатель:

1. Получает текущий язык `ru`.
2. Заменяет только первый сегмент URL на `en`.
3. Сохраняет путь `/orders`.
4. Сохраняет query `?page=3`.
5. Сохраняет hash `#history`.
6. Router сообщает `LocaleLayout` о новом URL.
7. `LocaleLayout` переключает `i18next` на английский.
8. Компоненты с `useTranslation` перерисовываются.

Итог:

```text
/en/orders?page=3#history
```

### Почему здесь `replace: true`

Переключение языка не является переходом к другой бизнес-странице. `replace`
не создаёт цепочку `ru → en → ru → en` в истории браузера. Если продукт позже
потребует возвращаться кнопкой «Назад» к предыдущему языку, это решение можно
поменять на `false`.

### Почему подписи `RU` и `EN` не переводятся

Это устойчивые названия языков. Они должны оставаться узнаваемыми даже тогда,
когда пользователь случайно выбрал незнакомый язык.

### Что важно сейчас

Файл должен существовать и компилироваться, но пока не добавляй:

```tsx
<LanguageSwitcher />
```

ни в `AdminLayout`, ни в `AuthLayout`, ни в любую страницу. Подключение будет
отдельным продуктовым шагом после проверки маршрутизации.

---

## Этап 15. Проверить существующие API-уведомления

`apiMessage` использует тот же глобальный экземпляр `i18next`. Поэтому после
`i18n.changeLanguage('en')` сообщение с кодом `AUTH.INVALID_CREDENTIALS` должно
стать английским автоматически.

Правильный поток:

```text
URL /en/auth/login
        ↓
LocaleLayout вызывает changeLanguage('en')
        ↓
сервер возвращает AUTH.INVALID_CREDENTIALS
        ↓
apiMessage ищет api:AUTH.INVALID_CREDENTIALS
        ↓
пользователь видит Invalid credentials
```

Не передавай язык в body каждого API-запроса. Для текущей архитектуры сервер не
создаёт пользовательский текст, поэтому он не обязан знать язык интерфейса.

Если в будущем сервер начнёт формировать локализованные письма или документы, это
будет отдельная задача. Тогда язык можно передавать через `Accept-Language`, но не
смешивать с кодами API.

---

## Этап 16. Что делать с текстами в Zod-схемах

В текущем `AuthFormSchema` нет русских сообщений, поэтому для первого примера его
можно оставить как есть.

Если позже появятся сообщения:

```ts
z.string().min(3, 'Минимум 3 символа')
```

не оставляй русский текст внутри постоянной схемы. Есть два нормальных варианта:

1. Схема возвращает технический ключ, а UI переводит его.
2. Создаётся фабрика `createAuthFormSchema(t)`, которая строит схему для текущего
   языка.

Для этого проекта на первом этапе проще второй вариант:

```text
createAuthFormSchema(t)
        ↓
zodResolver(schema текущего языка)
```

Но не добавляй его, пока в схеме действительно нет сообщений. Не надо усложнять
код ради будущей гипотезы.

---

## Этап 17. Добавить тест совпадения ключей

### Какую дыру закрывает тест

TypeScript может хорошо подсказать ключи русского ресурса, но обычный JSON не
гарантирует, что ученик добавил тот же ключ в `en.json`.

Создать:

```text
client/src/shared/i18n/resources.test.ts
```

В тесте нужна рекурсивная функция, которая превращает объект:

```json
{
  "fields": {
    "userName": {
      "label": "..."
    }
  }
}
```

в список:

```text
fields.userName.label
```

Затем для каждого namespace сравнить отсортированные списки ключей русского и
английского ресурсов.

Логика теста:

```text
для каждого namespace в resources.ru
    namespace должен существовать в resources.en
    получить все конечные ключи ru
    получить все конечные ключи en
    expect(enKeys).toEqual(ruKeys)
```

Импортируй `describe`, `it` и `expect` прямо из `vitest`, потому что в текущем
`tsconfig.app.json` глобальные типы Vitest не подключены.

Этот тест нужно запускать после добавления каждого нового namespace.

---

## Этап 18. Тесты поведения маршрутов

После реализации написать минимум следующие сценарии:

### URL и язык

```text
/                 → redirect на /ru
/ru/auth/login    → русский интерфейс
/en/auth/login    → английский интерфейс
/de/auth/login    → redirect на /ru/auth/login
/auth/login       → redirect на /ru/auth/login
/ru/unknown       → страница 404, а не redirect на главную
```

### AppGate

Для каждого языка повторить важные bootstrap-сценарии:

```text
database_required           → /{locale}/install
migrations_required         → /{locale}/install/runMigrations
migration_recovery_required → /{locale}/install/migrationRecovery
admin_required              → /{locale}/install/register
unauthenticated             → /{locale}/auth/login
authenticated на login      → /{locale}
```

Важно проверить оба языка хотя бы для одного полного прохода. Для остальных
состояний можно использовать параметризованный тест `it.each(['ru', 'en'])`.

### Переключатель

Компонент пока не подключён в интерфейс, но его можно тестировать отдельно:

```text
/ru/auth/login?next=/orders#form
нажать EN
ожидать /en/auth/login?next=/orders#form
```

---

## Этап 19. Проверка вручную

Запустить клиент и выполнить сценарии в браузере.

### Проверка русского языка

1. Открыть `/ru/auth/login`.
2. Убедиться, что заголовок, поля и кнопка русские.
3. Ввести неправильный пароль.
4. Убедиться, что API-ошибка тоже русская.
5. Обновить страницу.
6. Убедиться, что язык не изменился.

### Проверка английского языка

1. Открыть `/en/auth/login` напрямую, не переходя с русского URL.
2. Убедиться, что весь интерфейс формы английский.
3. Ввести неправильный пароль.
4. Убедиться, что API-ошибка английская.
5. Обновить страницу.
6. Убедиться, что язык остался английским.

### Проверка bootstrap redirect

Повторить этапы установки и убедиться, что язык сохраняется:

```text
/en → /en/install
/en → /en/install/runMigrations
/en → /en/install/register
```

Неправильно:

```text
/en → /install
/en → /ru/install
```

Любой автоматический переход обязан сохранять уже выбранный валидный язык.

---

## Этап 20. Требование к production-серверу

React Router обрабатывает маршрут после загрузки `index.html`. Поэтому production
web server должен возвращать `index.html` не только для `/`, но и для вложенных
клиентских URL:

```text
/ru
/ru/auth/login
/en/install/register
```

Иначе переход внутри React будет работать, а обновление `/en/auth/login` вернёт
обычный серверный 404.

Для Nginx смысл правила выглядит так:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

API location должен быть объявлен отдельно и не попадать под SPA fallback.
Конкретный Docker/Nginx-файл нужно править на этапе production-развёртывания, но
это требование нельзя забывать.

---

## 21. Правила для дальнейших компонентов

Когда появляется новый текст:

1. Определи, какой page, feature или widget владеет его смыслом.
2. Создай у этого модуля `i18n/ru.json` и `i18n/en.json`, если их ещё нет.
3. Добавь одинаковый ключ в оба файла.
4. Зарегистрируй namespace в `shared/i18n/resources.ts`.
5. Владелец вызывает `useTranslation('namespace')`.
6. Глупые переиспользуемые UI-компоненты получают готовый текст через props.
7. Запусти тест совпадения ключей.

Пример будущей структуры:

```text
pages/settings/i18n/ru.json
pages/settings/i18n/en.json

features/create-menu-item/i18n/ru.json
features/create-menu-item/i18n/en.json

widgets/sidebar/i18n/ru.json
widgets/sidebar/i18n/en.json
```

Не используй один огромный `ru.json` на всё приложение. Но и не дроби одну форму
на десять namespace по числу вложенных элементов.

## 22. Что нельзя хранить в переводах

В JSON переводов нельзя помещать:

- пароли и токены;
- SQL;
- секреты `.env`;
- пользовательские данные;
- HTML, который затем вставляется через `dangerouslySetInnerHTML`;
- URL API;
- бизнес-статусы вместо их отображаемых подписей.

Перевод содержит только безопасный статический пользовательский текст.

## 23. Порядок коммитов

Удобный порядок:

```text
feat(i18n): add locale config and login translations
feat(i18n): register component translation namespaces
feat(routing): add locale-prefixed client routes
refactor(routing): preserve locale in app gate redirects
feat(i18n): add standalone language switcher
test(i18n): verify locale resources and routes
```

Этапы изменения router и `AppGate` лучше делать в одном рабочем подходе: между
ними приложение временно будет иметь несовместимые пути.

## 24. Финальная проверка готовности

Работа завершена, когда выполнены все пункты:

- [ ] Поддерживаемые языки описаны одним типизированным каталогом.
- [ ] `/` переводит на `/ru`.
- [ ] Все страницы находятся под `/:locale`.
- [ ] Неподдерживаемый язык безопасно заменяется на `ru`.
- [ ] Неизвестная локализованная страница показывает 404.
- [ ] `AppGate` сохраняет язык при каждом redirect.
- [ ] Обычные `Link`, `Navigate` и `navigate()` не теряют язык.
- [ ] API endpoint не получили языковой префикс.
- [ ] `AuthForm` не содержит русских UI-строк.
- [ ] Русская и английская формы отображаются по прямым URL.
- [ ] API-toast использует язык из URL.
- [ ] `<html lang>` соответствует URL.
- [ ] Переключатель написан и компилируется, но нигде не подключён.
- [ ] Query и hash сохраняются при смене языка.
- [ ] Тест проверяет одинаковый набор ключей `ru` и `en`.
- [ ] `npm run build`, `npm run lint` и `npm test` проходят.
- [ ] Production web server умеет отдавать SPA для `/ru/*` и `/en/*`.

## 25. Что делать после этой инструкции

Не нужно сразу локализовать весь проект одним большим изменением. После того как
страница входа и языковые маршруты полностью работают:

1. Локализовать состояния `checking` и `error` в `AppGate`.
2. Локализовать `AuthLayout` и `AdminLayout`.
3. Локализовать страницы установки по одной.
4. Только затем подключить `LanguageSwitcher` в выбранное место интерфейса.
5. После этого пройти поиском по оставшимся русским строкам в `.tsx` и `.ts`.

Так первая страница становится проверенным образцом. Следующие страницы повторяют
уже понятный подход, а не изобретают собственную систему локализации.
