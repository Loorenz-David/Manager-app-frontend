export function createMetafieldFieldIdentity(
  shopIntegrationId: string,
  definitionId: string,
): string {
  return `${shopIntegrationId}:${definitionId}`;
}
