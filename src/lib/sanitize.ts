export function stripControlCharacters(value: string): string {
  let clean = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code >= 32 && code !== 127) clean += character;
  }
  return clean;
}
