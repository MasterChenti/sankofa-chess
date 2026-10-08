"use client";

import * as React from "react";
import { Bot, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasActiveComputerGame } from "@/features/chess/components/play-client";

/** People first, computer always available. Opens on "Computer" if a computer game is in progress on this device. */
export function PlayTabs({ initialTab, people, computer }: { initialTab: "people" | "computer" | null; people: React.ReactNode; computer: React.ReactNode }) {
  const [tab, setTab] = React.useState<string>(initialTab ?? "people");
  React.useEffect(() => {
    if (!initialTab && hasActiveComputerGame()) setTab("computer");
  }, [initialTab]);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-2">
        <TabsTrigger value="people" data-testid="tab-people">
          <Users className="size-4" /> People
        </TabsTrigger>
        <TabsTrigger value="computer" data-testid="tab-computer">
          <Bot className="size-4" /> Computer
        </TabsTrigger>
      </TabsList>
      <TabsContent value="people" forceMount hidden={tab !== "people"}>
        {people}
      </TabsContent>
      <TabsContent value="computer" forceMount hidden={tab !== "computer"}>
        {computer}
      </TabsContent>
    </Tabs>
  );
}
