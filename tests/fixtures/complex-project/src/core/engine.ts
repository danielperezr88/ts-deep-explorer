export function processDoc(config: { name: string }): Promise<void> {
  console.log("Processing:", config.name);
  return Promise.resolve();
}
