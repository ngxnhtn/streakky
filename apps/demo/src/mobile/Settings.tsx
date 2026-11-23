import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { ChevronLeft } from "lucide-react";
import { SettingsBody } from "../parts/settings-body.tsx";
import { ScreenScroll, useNav } from "./App.tsx";

export function Settings() {
  const { pop } = useNav();
  return (
    <>
      <AppBar
        left={
          <Button variant="ghost" size="icon" aria-label="Back to habits" onClick={pop}>
            <ChevronLeft strokeWidth={1.75} />
          </Button>
        }
        title="Settings"
      />
      <ScreenScroll>
        <SettingsBody className="px-5" />
      </ScreenScroll>
    </>
  );
}
