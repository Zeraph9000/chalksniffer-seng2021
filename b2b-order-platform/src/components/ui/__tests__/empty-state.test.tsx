/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders title and body", () => {
    render(<EmptyState title="No orders yet" body="When you place an order, it'll show up here." />);
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByText(/When you place an order/)).toBeInTheDocument();
  });

  it("renders the icon when provided", () => {
    render(<EmptyState title="t" body="b" icon={<svg data-testid="ic" />} />);
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("renders an action button when action is provided", () => {
    const onClick = jest.fn();
    render(<EmptyState title="t" body="b" action={{ label: "Go", onClick }} />);
    const button = screen.getByRole("button", { name: "Go" });
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
