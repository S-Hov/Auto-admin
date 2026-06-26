server/src/
  app.ts
  server.ts

  config/
    env.ts
    db.ts

  shared/
    database/
    errors/
    middlewares/
    utils/

  modules/
    install/
      install.routes.ts
      install.controller.ts
      install.service.ts
      install.repository.ts
      install.types.ts

    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.types.ts

    schema/
      schema.routes.ts
      schema.controller.ts
      schema.service.ts
      schema.repository.ts
      schema.types.ts

    menu/
      menu.routes.ts
      menu.controller.ts
      menu.service.ts
      menu.repository.ts
      menu.types.ts

    table-config/
      table-config.routes.ts
      table-config.controller.ts
      table-config.service.ts
      table-config.repository.ts
      table-config.types.ts

    data-crud/
      data-crud.routes.ts
      data-crud.controller.ts
      data-crud.service.ts
      data-crud.repository.ts
      data-crud.types.ts



client/src/
  app/
    App.tsx
    router.tsx
    providers.tsx

  pages/
    install/
      InstallPage.tsx
    login/
      LoginPage.tsx
    setup-menu/
      SetupMenuPage.tsx
    dashboard/
      DashboardPage.tsx
    table/
      TablePage.tsx
    table-settings/
      TableSettingsPage.tsx

  widgets/
    app-layout/
      AppLayout.tsx
    sidebar/
      Sidebar.tsx
    topbar/
      Topbar.tsx
    data-table/
      DataTable.tsx
    dynamic-form/
      DynamicForm.tsx

  features/
    install-database/
    create-admin/
    menu-builder/
    table-config-editor/
    record-create/
    record-edit/

  entities/
    table-schema/
      types.ts
      mock.ts
    menu/
      types.ts
      mock.ts
    table-config/
      types.ts
      mock.ts

  shared/
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Select.tsx
    api/
    lib/
    types/