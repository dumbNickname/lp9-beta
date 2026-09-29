// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";
import { registerServiceWorker } from "~/lib/pwa";

mount(() => <StartClient />, document.getElementById("app")!);
void registerServiceWorker();
