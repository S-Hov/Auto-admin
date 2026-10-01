import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import { once } from "node:events";
import { manager } from "../../../tests/fixtures/access.fixture";

const { readAuthSession } = vi.hoisted(() => ({ readAuthSession: vi.fn() }));
vi.mock("../auth", () => ({ readAuthSession }));
import queryRouter from "./query.routes";
import accessRouter from "../access-control/access-control.routes";
import menuRouter from "../menu/menu.routes";
import { errorHandler } from "../../shared/middleware/errorHandler";
import { COOKIE_NAMES } from "../../constants/cookies";
import { queryEngineService } from "../../core/query-engine";
import { accessControlService } from "../../core/access-control";
import { permissionManagementService } from "../../core/access-control/permission-management.service";
import { menuService } from "../menu/menu.service";
import { forbidden } from "../../shared/api/errors/error-helpers";
import { ERROR_CODES } from "../../shared/api/codes/error-codes";

let server: Server;
let url: string;
const session = {
    ...manager,
    username: "manager",
    expiresAt: new Date(Date.now() + 60_000),
};
const cookie = `${COOKIE_NAMES.AUTH_SESSION}=${"a".repeat(64)}`;

beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/query", queryRouter);
    app.use("/access", accessRouter);
    app.use("/menu", menuRouter);
    app.use(errorHandler);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("Test server has no address");
    url = `http://127.0.0.1:${address.port}`;
});
beforeEach(() => {
    vi.restoreAllMocks();
    readAuthSession.mockReset().mockResolvedValue(session);
});
afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
    );
});

describe("authenticated HTTP boundaries", () => {
    it.each([
        ["POST", "/query/execute"],
        ["POST", "/query/pipeline"],
        ["GET", "/access/catalog"],
        ["PUT", "/access/permissions"],
        ["POST", "/access/scan"],
        ["GET", "/menu"],
        ["GET", "/menu/manage"],
        ["POST", "/menu"],
        ["DELETE", "/menu/1"],
        ["PUT", "/menu/permissions"],
    ])("%s %s requires a valid session", async (method, path) => {
        const response = await fetch(url + path, { method });
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({
            success: false,
            code: "COMMON.UNAUTHORIZED",
        });
        expect(readAuthSession).not.toHaveBeenCalled();
    });
    it("takes the principal only from the session, never from the JSON", async () => {
        const execute = vi
            .spyOn(queryEngineService, "execute")
            .mockResolvedValue({ rows: [], affectedRows: 0 });
        const body = {
            action: "read",
            table: "orders",
            select: ["total"],
            principal: { userId: 1, roleKey: "admin" },
        };
        const response = await fetch(url + "/query/execute", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ version: 1, query: body }),
        });
        expect(response.status).toBe(200);
        expect(execute).toHaveBeenCalledWith(body, session);
    });
    it("returns a safe 403 code without target IDs, SQL or denial details", async () => {
        vi.spyOn(queryEngineService, "execute").mockRejectedValue(
            forbidden(ERROR_CODES.ACCESS_QUERY_DENIED, {
                internalMessage: "private table internal_note",
                cause: { targetId: 123 },
            }),
        );
        const response = await fetch(url + "/query/execute", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ version: 1, query: {} }),
        });
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            success: false,
            code: "ACCESS.QUERY_DENIED",
        });
    });
    it("rejects unknown API versions before entering the engine", async () => {
        const execute = vi.spyOn(queryEngineService, "execute");
        const response = await fetch(url + "/query/execute", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ version: 999, query: {} }),
        });
        expect(response.status).toBe(400);
        expect(execute).not.toHaveBeenCalled();
    });
    it("provides catalog and administration calls with the same authenticated principal", async () => {
        const catalog = vi
            .spyOn(accessControlService, "getAccessibleCatalog")
            .mockResolvedValue({
                schemaName: "shop",
                fingerprint: "f",
                resources: [],
            });
        const change = vi
            .spyOn(permissionManagementService, "change")
            .mockResolvedValue({ changed: true });
        const menu = vi.spyOn(menuService, "getMenu").mockResolvedValue([]);
        expect(
            (
                await fetch(url + "/access/catalog", {
                    headers: { Cookie: cookie },
                })
            ).status,
        ).toBe(200);
        expect(
            (
                await fetch(url + "/access/permissions", {
                    method: "PUT",
                    headers: {
                        Cookie: cookie,
                        "Content-Type": "application/json",
                    },
                    body: "{}",
                })
            ).status,
        ).toBe(200);
        expect(
            (await fetch(url + "/menu", { headers: { Cookie: cookie } }))
                .status,
        ).toBe(200);
        expect(catalog).toHaveBeenCalledWith(session);
        expect(change).toHaveBeenCalledWith({}, session, null);
        expect(menu).toHaveBeenCalledWith(session);
    });
});
