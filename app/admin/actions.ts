"use server";

import { redirect } from "next/navigation";

import { requestAdminLoginCode, verifyAdminLoginCode } from "@/lib/admin/otp-service";
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
} from "@/lib/admin/session-cookie";
import { getRequestIp } from "@/lib/utils/request";

export type AdminLoginResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function sendAdminLoginCodeAction(
  _prev: AdminLoginResult | null,
  formData: FormData
): Promise<AdminLoginResult> {
  const email = String(formData.get("email") ?? "");
  const ip = await getRequestIp();
  const r = await requestAdminLoginCode(email, ip);

  if (!r.ok) {
    return { ok: false, message: r.message };
  }

  return {
    ok: true,
    message: "We sent a 6-digit code to your email.",
  };
}

export async function verifyAdminLoginCodeAction(
  _prev: AdminLoginResult | null,
  formData: FormData
): Promise<AdminLoginResult> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");

  const r = await verifyAdminLoginCode(email, code);
  if (!r.ok) {
    return { ok: false, message: r.message };
  }

  await setAdminSessionCookie(email);
  redirect("/admin/waitlist");
}

export async function adminSignOut(): Promise<void> {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
