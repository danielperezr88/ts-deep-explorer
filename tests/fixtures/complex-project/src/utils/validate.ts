export function validate(config: { name: string }): boolean {
  return config.name.length > 0;
}
