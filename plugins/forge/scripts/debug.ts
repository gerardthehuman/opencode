import { handshake } from "../lib/handshake";

const forge = await handshake();

console.group("Handshake");
console.log(`  → Path: ${forge.path}`);
console.log(`  → URI: ${forge.uri}`);
console.log(`  → Token: ${forge.token}`);
console.groupEnd();

const agents = await forge.agents();

console.group("Agents");
for (const [name, agent] of Object.entries(agents)) {
  console.log(`  → ${name}: ${agent?.model}`);
}
console.groupEnd();

const provider = await forge.provider();

console.group("Provider");
console.log(`  → Name: ${provider?.name}`);
console.log(`  → URI: ${provider?.api}`);
console.log(`  → Models:`);
console.group();
for (const model of Object.keys(provider?.models ?? {})) {
  console.log(`    → ${model}`);
}
console.groupEnd();
console.groupEnd();
