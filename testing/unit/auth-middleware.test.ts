import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authState = vi.hoisted(() => ({
  role: null as "DISPATCHER" | "CLIENT" | "DRIVER" | "HELPER" | null,
  signOut: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: authState.role
            ? { id: `${authState.role.toLowerCase()}-user`, app_metadata: { user_role: authState.role } }
            : null,
        },
      })),
      signOut: authState.signOut,
    },
  }),
}));

import { middleware } from "../../apps/web/src/middleware";

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

async function expectNext(path: string) {
  const response = await middleware(request(path));
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

async function expectRedirect(path: string, expected: string) {
  const response = await middleware(request(path));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`http://localhost:3000${expected}`);
}

describe("auth middleware RBAC", () => {
  beforeEach(() => {
    authState.role = null;
    authState.signOut.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  });

  it("I-AUTH-01 redirects an anonymous dashboard request", async () => {
    await expectRedirect("/dashboard", "/login");
  });

  it("I-AUTH-02 redirects an anonymous portal request", async () => {
    await expectRedirect("/portal/requests", "/portal/login");
  });

  it("I-AUTH-03 allows a dispatcher into the dashboard", async () => {
    authState.role = "DISPATCHER";
    await expectNext("/dashboard");
  });

  it("I-AUTH-04 rejects a dispatcher from the client portal and signs out", async () => {
    authState.role = "DISPATCHER";
    await expectRedirect("/portal/requests", "/portal/login?error=unauthorized");
    expect(authState.signOut).toHaveBeenCalledOnce();
  });

  it("I-AUTH-05 allows a client into the portal", async () => {
    authState.role = "CLIENT";
    await expectNext("/portal/requests");
  });

  it("I-AUTH-06 rejects a client from the dashboard and signs out", async () => {
    authState.role = "CLIENT";
    await expectRedirect("/dashboard", "/login?error=unauthorized");
    expect(authState.signOut).toHaveBeenCalledOnce();
  });

  it.each(["DRIVER", "HELPER"] as const)("I-AUTH-07 rejects a %s from both web surfaces", async (role) => {
    authState.role = role;
    await expectRedirect("/dashboard", "/login?error=unauthorized");
    await expectRedirect("/portal/requests", "/portal/login?error=unauthorized");
    expect(authState.signOut).toHaveBeenCalledTimes(2);
  });

  it("I-AUTH-08 redirects an authenticated dispatcher away from login", async () => {
    authState.role = "DISPATCHER";
    await expectRedirect("/login", "/dashboard");
  });

  it("I-AUTH-09 redirects an authenticated client away from portal login", async () => {
    authState.role = "CLIENT";
    await expectRedirect("/portal/login", "/portal/requests");
  });
});
