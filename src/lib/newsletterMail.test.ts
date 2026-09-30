import { describe, expect, it } from "vitest";
import { mailConfig, parseAddress } from "./newsletterMail";

describe("newsletter mail", () => {
  it("splits a display name from the From address", () => {
    expect(parseAddress("Retro Porting Toolkit <newsletter@retroportingtoolkit.com>")).toEqual({ name: "Retro Porting Toolkit", email: "newsletter@retroportingtoolkit.com" });
    expect(parseAddress('"RPTK" <a@b.c>')).toEqual({ name: "RPTK", email: "a@b.c" });
    expect(parseAddress("a@b.c")).toEqual({ email: "a@b.c" });
  });

  it("is unconfigured until host, login and From are all set", () => {
    expect(mailConfig({ NEWSLETTER_SMTP_HOST: "smtp.example", NEWSLETTER_SMTP_USER: "u" } as NodeJS.ProcessEnv)).toBeNull();
    expect(mailConfig({ NEWSLETTER_SMTP_HOST: "h", NEWSLETTER_SMTP_USER: "u", NEWSLETTER_SMTP_PASS: "p", NEWSLETTER_FROM: "f" } as NodeJS.ProcessEnv)?.port).toBe(587);
  });
});
