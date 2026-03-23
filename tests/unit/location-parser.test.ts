import { describe, it, expect } from "vitest";
import { parseLocation } from "@/lib/location-parser";

describe("parseLocation", () => {
  // Spec cases
  it("parses city + country: Berlin, Germany", () => {
    expect(parseLocation("Berlin, Germany")).toEqual({ country: "DE", region: "Berlin" });
  });

  it("parses city + US state abbreviation: San Francisco, CA", () => {
    expect(parseLocation("San Francisco, CA")).toEqual({ country: "US", region: "California" });
  });

  it("parses Remote (US only) → country only", () => {
    expect(parseLocation("Remote (US only)")).toEqual({ country: "US", region: null });
  });

  it("parses bare Remote → null/null", () => {
    expect(parseLocation("Remote")).toEqual({ country: null, region: null });
  });

  it("parses compound string: New York, NY or Remote", () => {
    expect(parseLocation("New York, NY or Remote")).toEqual({ country: "US", region: "New York" });
  });

  it("parses Multiple locations → null/null", () => {
    expect(parseLocation("Multiple locations")).toEqual({ country: null, region: null });
  });

  it("handles null input", () => {
    expect(parseLocation(null)).toEqual({ country: null, region: null });
  });

  it("handles empty string", () => {
    expect(parseLocation("")).toEqual({ country: null, region: null });
  });

  it("parses Remote - Europe → null/null (continent qualifier)", () => {
    expect(parseLocation("Remote - Europe")).toEqual({ country: null, region: null });
  });

  it("parses bare city: London", () => {
    expect(parseLocation("London")).toEqual({ country: "GB", region: "London" });
  });

  it("parses city + country: Warsaw, Poland", () => {
    expect(parseLocation("Warsaw, Poland")).toEqual({ country: "PL", region: "Warsaw" });
  });

  it("parses city + US state abbreviation: Austin, TX", () => {
    expect(parseLocation("Austin, TX")).toEqual({ country: "US", region: "Texas" });
  });

  it("parses bare city: Munich", () => {
    expect(parseLocation("Munich")).toEqual({ country: "DE", region: "Munich" });
  });

  it("parses Anywhere → null/null", () => {
    expect(parseLocation("Anywhere")).toEqual({ country: null, region: null });
  });

  // Additional cases
  it("parses bare country name: Germany", () => {
    expect(parseLocation("Germany")).toEqual({ country: "DE", region: null });
  });

  it("parses US state abbreviation alone: CA", () => {
    expect(parseLocation("CA")).toEqual({ country: "US", region: "California" });
  });

  it("parses full US state name: California", () => {
    expect(parseLocation("California")).toEqual({ country: "US", region: "California" });
  });

  it("parses Remote (DE) → country only", () => {
    expect(parseLocation("Remote (DE)")).toEqual({ country: "DE", region: null });
  });

  it("parses Remote - Germany → country only", () => {
    expect(parseLocation("Remote - Germany")).toEqual({ country: "DE", region: null });
  });

  it("is case-insensitive for city names", () => {
    expect(parseLocation("LONDON")).toEqual({ country: "GB", region: "London" });
  });

  it("is case-insensitive for country names", () => {
    expect(parseLocation("GERMANY")).toEqual({ country: "DE", region: null });
  });

  it("trims leading/trailing whitespace", () => {
    expect(parseLocation("  London  ")).toEqual({ country: "GB", region: "London" });
  });

  it("parses German Bundesland: Bayern", () => {
    expect(parseLocation("Bayern")).toEqual({ country: "DE", region: "Bayern" });
  });

  it("parses German Bundesland alias: Bavaria", () => {
    expect(parseLocation("Bavaria")).toEqual({ country: "DE", region: "Bayern" });
  });

  it("parses Berlin as city (also a DE state)", () => {
    expect(parseLocation("Berlin")).toEqual({ country: "DE", region: "Berlin" });
  });

  it("parses Amsterdam", () => {
    expect(parseLocation("Amsterdam")).toEqual({ country: "NL", region: "Amsterdam" });
  });

  it("parses Toronto", () => {
    expect(parseLocation("Toronto")).toEqual({ country: "CA", region: "Toronto" });
  });

  it("parses Sydney", () => {
    expect(parseLocation("Sydney")).toEqual({ country: "AU", region: "Sydney" });
  });

  it("parses 'Multiple Locations' case-insensitively", () => {
    expect(parseLocation("Multiple Locations")).toEqual({ country: null, region: null });
  });

  it("parses worldwide → null/null", () => {
    expect(parseLocation("Worldwide")).toEqual({ country: null, region: null });
  });

  it("parses Remote (US) without 'only'", () => {
    expect(parseLocation("Remote (US)")).toEqual({ country: "US", region: null });
  });

  it("parses Tel Aviv", () => {
    expect(parseLocation("Tel Aviv")).toEqual({ country: "IL", region: "Tel Aviv" });
  });

  it("parses Singapore", () => {
    expect(parseLocation("Singapore")).toEqual({ country: "SG", region: "Singapore" });
  });

  it("parses São Paulo", () => {
    expect(parseLocation("São Paulo")).toEqual({ country: "BR", region: "São Paulo" });
  });

  it("returns null/null for unrecognised string", () => {
    expect(parseLocation("Timbuktu")).toEqual({ country: null, region: null });
  });
});
