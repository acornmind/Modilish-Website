"use server";

import { redirect } from "next/navigation";
import { logout, requestOtp, verifyOtp } from "./auth";

export async function requestOtpAction(phone: string) {
  return requestOtp(phone);
}

export async function verifyOtpAction(phone: string, code: string) {
  return verifyOtp(phone, code);
}

export async function logoutAction(allDevices = false) {
  await logout(allDevices);
  redirect("/admin/login");
}
