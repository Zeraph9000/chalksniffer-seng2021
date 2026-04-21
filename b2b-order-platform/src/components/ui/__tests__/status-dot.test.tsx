/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { StatusDot } from "@/components/ui/status-dot";

describe("StatusDot", () => {
  it("renders a span with an aria-label reflecting the status", () => {
    const { container, getByLabelText } = render(<StatusDot status="open" />);
    expect(getByLabelText("Status: open")).toBeInTheDocument();
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.className).toContain("rounded-full");
  });

  it("applies the open variant background class", () => {
    const { container } = render(<StatusDot status="open" />);
    expect(container.querySelector("span")?.className).toMatch(/bg-accent\b/);
  });

  it("applies the low variant background class", () => {
    const { container } = render(<StatusDot status="low" />);
    expect(container.querySelector("span")?.className).toMatch(/bg-warn\b/);
  });

  it("applies the oos variant background color", () => {
    const { container } = render(<StatusDot status="oos" />);
    const style = container.querySelector("span")?.getAttribute("style") ?? "";
    // jsdom may serialise hex as rgb(); accept either #741818 or rgb(116, 24, 24)
    expect(style).toMatch(/#741818|rgb\(\s*116,\s*24,\s*24\s*\)/);
  });

  it("respects the size prop", () => {
    const { container } = render(<StatusDot status="open" size={10} />);
    const style = container.querySelector("span")?.getAttribute("style") ?? "";
    expect(style).toMatch(/width:\s*10px/);
    expect(style).toMatch(/height:\s*10px/);
  });
});
