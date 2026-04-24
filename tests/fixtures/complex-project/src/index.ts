import { processDoc } from "@/core/engine";
import type { Config } from "@/types/config";
import { validate } from "./utils/validate";
import "./utils/setup";

export async function main(config: Config): Promise<void> {
  validate(config);
  await processDoc(config);
}
