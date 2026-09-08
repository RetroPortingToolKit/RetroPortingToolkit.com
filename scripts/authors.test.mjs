import { describe, expect, it } from "vitest";
import { authorsLine, authorsOf, canonicalAuthors, rosterLines, teamMemberByDiscord, teamMemberByGithub, teamSlugFor } from "./authors.mjs";

const team = {
  members: [
    { slug: "matthew-stanley", name: "Matthew Stanley", handles: [{ label: "GitHub", value: "mstan" }, { label: "Discord", value: "gamemaster" }] },
    { slug: "jack-rickey", name: "Jack Rickey", handles: [{ label: "GitHub", value: "JRickey" }, { label: "Discord", value: ".emissary" }] },
    { slug: "alex-vanderveen", name: "Alex Vanderveen", handles: [{ label: "GitHub", value: "TechnicallyComputers" }, { label: "Discord", value: "wretched99, also known as CobaltCryptid" }] },
    { slug: "shokunin", name: "Shokunin", handles: [{ label: "GitHub", value: "tetrisgm" }, { label: "Discord", value: "tetrisgm" }] },
  ],
};

describe("authorsOf", () => {
  it("prefers the list, reads the old single field, and falls back", () => {
    expect(authorsOf({ authors: ["Shokunin", "Matthew Stanley"], author: "ignored" })).toEqual(["Shokunin", "Matthew Stanley"]);
    expect(authorsOf({ author: "Shokunin" })).toEqual(["Shokunin"]);
    expect(authorsOf({}, "Site")).toEqual(["Site"]);
    expect(authorsOf({})).toEqual([]);
  });
  it("cleans the list: trims, drops blanks and non-strings, dedupes", () => {
    expect(authorsOf({ authors: [" Shokunin ", "", 3, null, "Shokunin", "Jack Rickey"] })).toEqual(["Shokunin", "Jack Rickey"]);
    expect(authorsOf({ authors: [] , author: "Shokunin" })).toEqual(["Shokunin"]);
  });
});

describe("authorsLine", () => {
  it("joins the way a byline reads", () => {
    expect(authorsLine([])).toBe("");
    expect(authorsLine(["Shokunin"])).toBe("Shokunin");
    expect(authorsLine(["Shokunin", "Matthew Stanley"])).toBe("Shokunin and Matthew Stanley");
    expect(authorsLine(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("who is who, from data/team.json", () => {
  it("finds a member by Discord username, ignoring case, @ and a leading dot", () => {
    expect(teamMemberByDiscord(team, "tetrisgm")?.name).toBe("Shokunin");
    expect(teamMemberByDiscord(team, "GameMaster")?.name).toBe("Matthew Stanley");
    expect(teamMemberByDiscord(team, ".emissary")?.name).toBe("Jack Rickey");
    expect(teamMemberByDiscord(team, "@gamemaster")?.name).toBe("Matthew Stanley");
  });
  it("reads a handle written as prose", () => {
    expect(teamMemberByDiscord(team, "wretched99")?.name).toBe("Alex Vanderveen");
    expect(teamMemberByDiscord(team, "cobaltcryptid")?.name).toBe("Alex Vanderveen");
    // but not on the connective words
    expect(teamMemberByDiscord(team, "known")).toBeNull();
  });
  it("finds a member by GitHub login", () => {
    expect(teamMemberByGithub(team, "MSTAN")?.name).toBe("Matthew Stanley");
    expect(teamMemberByGithub(team, "nobody")).toBeNull();
  });
  it("gives the /team anchor for a name", () => {
    expect(teamSlugFor(team, "matthew stanley")).toBe("matthew-stanley");
    expect(teamSlugFor(team, "A Guest")).toBeNull();
  });
});

describe("canonicalAuthors", () => {
  it("spells team members the team's way whatever was typed, keeps guests, dedupes", () => {
    expect(canonicalAuthors(team, ["shokunin", "gamemaster", "MSTAN", "A Guest", " ", "Shokunin"])).toEqual([
      "Shokunin",
      "Matthew Stanley",
      "A Guest",
    ]);
  });
});

describe("rosterLines", () => {
  it("names each member with how they are known", () => {
    const lines = rosterLines(team);
    expect(lines[0]).toBe("Matthew Stanley — GitHub mstan; Discord gamemaster");
    expect(lines).toHaveLength(4);
  });
});
