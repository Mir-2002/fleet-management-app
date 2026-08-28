import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signInResult: { data: { user: null }, error: null } as {
    data: { user: { app_metadata: { user_role?: string } } | null };
    error: { message: string } | null;
  },
  signOut: vi.fn(async () => ({ error: null })),
  redirect: vi.fn((destination: string): never => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async () => state.signInResult),
      signOut: state.signOut,
    },
  })),
}));

vi.mock("next/navigation", () => ({ redirect: state.redirect }));

import { login } from "../../apps/web/src/app/login/actions";
import { portalLogin } from "../../apps/web/src/app/portal/login/actions";
import { signOut } from "../../apps/web/src/app/dashboard/actions";
import { portalSignOut } from "../../apps/web/src/app/portal/actions";

function credentials() {
  const form = new FormData();
  form.set("email", "person@fleetman.test");
  form.set("password", "password123");
  return form;
}

describe("auth server actions", () => {
  beforeEach(() => {
    state.signInResult = { data: { user: null }, error: null };
    state.signOut.mockClear();
    state.redirect.mockClear();
  });

  it("I-AUTH-10 redirects a failed dispatcher login without establishing a session", async () => {
    state.signInResult = { data: { user: null }, error: { message: "Invalid login credentials" } };
    await expect(login(credentials())).rejects.toThrow("NEXT_REDIRECT:/login?error=Invalid%20login%20credentials");
    expect(state.signOut).not.toHaveBeenCalled();
  });

  it("I-AUTH-11 signs out a client attempting dispatcher login", async () => {
    state.signInResult = { data: { user: { app_metadata: { user_role: "CLIENT" } } }, error: null };
    await expect(login(credentials())).rejects.toThrow("NEXT_REDIRECT:/login?error=unauthorized");
    expect(state.signOut).toHaveBeenCalledOnce();
  });

  it("I-AUTH-12 signs out a dispatcher attempting portal login", async () => {
    state.signInResult = { data: { user: { app_metadata: { user_role: "DISPATCHER" } } }, error: null };
    await expect(portalLogin(credentials())).rejects.toThrow("NEXT_REDIRECT:/portal/login?error=unauthorized");
    expect(state.signOut).toHaveBeenCalledOnce();
  });

  it("allows the matching role through each login action", async () => {
    state.signInResult = { data: { user: { app_metadata: { user_role: "DISPATCHER" } } }, error: null };
    await expect(login(credentials())).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    state.signInResult = { data: { user: { app_metadata: { user_role: "CLIENT" } } }, error: null };
    await expect(portalLogin(credentials())).rejects.toThrow("NEXT_REDIRECT:/portal/requests");
  });

  it("I-AUTH-13 signs out and redirects each web surface", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");
    await expect(portalSignOut()).rejects.toThrow("NEXT_REDIRECT:/portal/login");
    expect(state.signOut).toHaveBeenCalledTimes(2);
  });
});
