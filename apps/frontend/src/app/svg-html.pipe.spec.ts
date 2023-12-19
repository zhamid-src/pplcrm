import { BypassHtmlSanitizerPipe } from "./svg-html.pipe";

describe("BypassHtmlSanitizerPipe", () => {
  it("create an instance", () => {
    const pipe = new BypassHtmlSanitizerPipe();
    expect(pipe).toBeTruthy();
  });
});
