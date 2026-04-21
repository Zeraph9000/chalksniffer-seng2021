"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-[18px] font-semibold tracking-[-.01em] text-ink">{title}</h2>
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-paper p-6">
        {children}
      </div>
    </section>
  );
}

export default function PrimitivesGallery() {
  const [sw, setSw] = React.useState(false);
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-paper-2 p-10">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="mb-2 font-display text-[28px] font-semibold tracking-[-.02em] text-ink">
            Primitives — dev gallery
          </h1>
          <p className="mb-8 text-[13px] text-ink-3">
            Every themed primitive. Not linked from the app. Change styling in{" "}
            <code>src/components/ui/*</code> and refresh.
          </p>

          <Section title="Button">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </Section>

          <Section title="Input / Textarea / Label / Select">
            <div className="w-[260px] grid gap-2">
              <Label>Email</Label>
              <Input type="email" placeholder="sebrah@gmail.com" />
            </div>
            <div className="w-[260px] grid gap-2">
              <Label>Note</Label>
              <Textarea placeholder="Optional note to the shop…" />
            </div>
            <div className="w-[220px] grid gap-2">
              <Label>Size</Label>
              <Select defaultValue="500g">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="250g">250g</SelectItem>
                  <SelectItem value="500g">500g</SelectItem>
                  <SelectItem value="1kg">1kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title="Checkbox / Switch / RadioGroup">
            <label className="flex items-center gap-2 text-[13px]">
              <Checkbox defaultChecked /> In stock only
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={sw} onCheckedChange={setSw} /> Recurring {sw ? "on" : "off"}
            </label>
            <RadioGroup defaultValue="active" className="flex gap-4">
              <label className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value="active" /> Active
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value="paused" /> Paused
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <RadioGroupItem value="closed" /> Closed
              </label>
            </RadioGroup>
          </Section>

          <Section title="Tabs / ToggleGroup">
            <Tabs defaultValue="guest" className="w-[360px]">
              <TabsList>
                <TabsTrigger value="guest">Guest</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="guest">
                <p className="text-[13px] text-ink-2">Continue as guest.</p>
              </TabsContent>
              <TabsContent value="signin">
                <p className="text-[13px] text-ink-2">Email + password.</p>
              </TabsContent>
              <TabsContent value="register">
                <p className="text-[13px] text-ink-2">Create account.</p>
              </TabsContent>
            </Tabs>
            <ToggleGroup type="single" defaultValue="30d">
              <ToggleGroupItem value="7d">7D</ToggleGroupItem>
              <ToggleGroupItem value="30d">30D</ToggleGroupItem>
              <ToggleGroupItem value="90d">90D</ToggleGroupItem>
            </ToggleGroup>
          </Section>

          <Section title="Status Dot + Chip">
            {(["open", "low", "oos", "pending", "info"] as const).map((s) => (
              <StatusDot key={s} status={s} size={10} />
            ))}
            <Chip tone="placed" withDot>Placed</Chip>
            <Chip tone="paid" withDot>Paid</Chip>
            <Chip tone="despatched" withDot>Despatched</Chip>
            <Chip tone="received" withDot>Received</Chip>
            <Chip tone="invoiced" withDot>Invoiced</Chip>
            <Chip tone="cancelled" withDot>Cancelled</Chip>
            <Chip tone="scheduled" withDot>Recurring</Chip>
            <Chip tone="draft" withDot>Draft</Chip>
            <Chip tone="sent" withDot>Sent</Chip>
            <Chip tone="neutral">48 products</Chip>
          </Section>

          <Section title="Badge (mono tags)">
            <Badge tone="mono">New</Badge>
            <Badge tone="mono">Bestseller</Badge>
            <Badge tone="warn">−27%</Badge>
            <Badge tone="ink">Featured</Badge>
          </Section>

          <Section title="Overlays — Dialog / Popover / DropdownMenu / Tooltip / Toast">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel order LDG-2026-0042?</DialogTitle>
                </DialogHeader>
                <div className="px-[22px] py-5 text-[13px] text-ink-2 leading-[1.55]">
                  <DialogDescription>
                    The buyer will be refunded $97.00 automatically. This cannot be undone.
                  </DialogDescription>
                </div>
                <DialogFooter>
                  <Button variant="ghost">Keep order</Button>
                  <Button variant="danger">Cancel &amp; refund</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost">Open popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-[13px] text-ink-2">Popover content — match our tokens.</p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">User menu ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Orders</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Tooltip — dark pill</TooltipContent>
            </Tooltip>

            <Button variant="ghost" onClick={() => toast("Added — Stringybark Raw Honey")}>
              Show toast
            </Button>
          </Section>

          <Section title="EmptyState">
            <EmptyState
              title="No recurring orders yet"
              body="When you place an order, tick 'Make this recurring' at cart review, or turn a past order into a template from its Order Detail page."
              action={{ label: "Browse the shop", onClick: () => toast("Navigate") }}
            />
          </Section>

          <Toaster />
        </div>
      </div>
    </TooltipProvider>
  );
}
