import { describe, expect, it } from "vitest";

import { getUpholsteryImageUrl } from "./image-url";

describe("getUpholsteryImageUrl", () => {
  it("returns null for a missing url", () => {
    expect(getUpholsteryImageUrl(null, { width: 100, height: 100 })).toBeNull();
    expect(getUpholsteryImageUrl(undefined, { width: 100, height: 100 })).toBeNull();
  });

  it("rewrites a Nevotex image path to their thumbnail endpoint", () => {
    const url = getUpholsteryImageUrl(
      "https://nevotex.se/Files/Images/foo.jpg",
      { width: 200, height: 200 },
    );

    expect(url).toContain("https://nevotex.se/Admin/Public/GetImage.ashx");
    expect(url).toContain("width=200");
    expect(url).toContain("height=200");
    expect(url).toContain("image=%2FFiles%2FImages%2Ffoo.jpg");
  });

  it("adds Bunny CDN optimizer params for a *.b-cdn.net host", () => {
    const url = getUpholsteryImageUrl(
      "https://stofogstil.b-cdn.net/826303_pack_solid_140621.jpg",
      { width: 290, height: 290 },
    );

    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.hostname).toBe("stofogstil.b-cdn.net");
    expect(parsed.pathname).toBe("/826303_pack_solid_140621.jpg");
    expect(parsed.searchParams.get("width")).toBe("290");
    expect(parsed.searchParams.get("height")).toBe("290");
    expect(parsed.searchParams.get("aspect_ratio")).toBe("force");
    expect(parsed.searchParams.get("quality")).toBe("75");
  });

  it("passes through a url from an unrecognized host untouched", () => {
    const url = getUpholsteryImageUrl("https://fargotex.pl/img/foo.jpg", {
      width: 200,
      height: 200,
    });

    expect(url).toBe("https://fargotex.pl/img/foo.jpg");
  });
});
