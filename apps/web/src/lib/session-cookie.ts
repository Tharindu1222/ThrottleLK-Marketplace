export function readAccessCookie(jar: {
  get(name: string): { value: string } | undefined;
}): string | undefined {
  return jar.get('__Host-tlk_access')?.value ?? jar.get('tlk_access')?.value;
}
