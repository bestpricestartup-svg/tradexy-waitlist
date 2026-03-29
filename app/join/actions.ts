"use server";

import { sendWaitlistCode } from "@/lib/waitlist/code-service";
import { getRequestIp } from "@/lib/utils/request";

export type JoinWaitlistResult =
  | {
      ok: true;
      status: "verification_sent" | "already_joined_verified";
      message: string;
    }
  | {
      ok: false;
      status:
        | "invalid_email"
        | "rate_limited"
        | "error"
        | "email_send_failed";
      message: string;
    };

export async function joinWaitlistForm(
  _prev: JoinWaitlistResult | null,
  formData: FormData
): Promise<JoinWaitlistResult | null> {
  return joinWaitlist({
    email: String(formData.get("email") ?? ""),
  });
}

export async function joinWaitlist(input: {
  email: string;
}): Promise<JoinWaitlistResult> {
  const ip = await getRequestIp();
  const result = await sendWaitlistCode(input.email, ip);

  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_email: "Please enter a valid email.",
      rate_limited: "Too many attempts. Please try again later.",
      error: "Something went wrong. Please try again.",
      email_send_failed: "Could not send email. Please try again later.",
    };
    return {
      ok: false,
      status: result.status,
      message: messages[result.status] ?? "Something went wrong.",
    };
  }

  if (result.status === "already_joined_verified") {
    return {
      ok: true,
      status: "already_joined_verified",
      message: "This email is already on the waitlist.",
    };
  }

  return {
    ok: true,
    status: "verification_sent",
    message: "We sent a 6-digit code to your email.",
  };
}
