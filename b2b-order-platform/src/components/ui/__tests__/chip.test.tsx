/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { Chip } from "@/components/ui/chip";

describe("Chip", () => {
  it("renders its children", () => {
    const { getByText } = render(<Chip tone="paid">Paid</Chip>);
    expect(getByText("Paid")).toBeInTheDocument();
  });

  it("renders a leading StatusDot when withDot is set", () => {
    const { getByLabelText } = render(<Chip tone="paid" withDot>Paid</Chip>);
    expect(getByLabelText(/^Status:/)).toBeInTheDocument();
  });

  it("applies the status tone background utility", () => {
    const { container } = render(<Chip tone="paid">Paid</Chip>);
    expect(container.firstElementChild?.className).toMatch(/bg-s-paid-bg/);
    expect(container.firstElementChild?.className).toMatch(/text-s-paid-fg/);
  });

  it("supports the cancelled tone", () => {
    const { container } = render(<Chip tone="cancelled">Cancelled</Chip>);
    expect(container.firstElementChild?.className).toMatch(/bg-s-cancelled-bg/);
  });
});
