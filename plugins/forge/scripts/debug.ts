import { handshake } from "../lib/handshake";

const forge = await handshake();

console.group("Handshake");
console.log(`→ Path: ${forge.path}`);
console.log(`→ URI: ${forge.uri}`);
console.log(`→ Token: ${forge.token}`);
console.groupEnd();

const agents = await forge.agents();

console.group("Agents");
for (const [name, agent] of Object.entries(agents)) {
  console.log(`→ ${name}: ${agent?.model} / ${agent?.variant || "default"}`);
}
console.groupEnd();

const provider = await forge.provider();

console.group("Provider");
console.log(`→ Name: ${provider?.name}`);
console.log(`→ URI: ${provider?.api}`);
console.groupEnd();

console.group("Models");
for (const [id, model] of Object.entries(provider?.models ?? {})) {
  console.group(`${model.name}`);
  console.log(`→ ID: ${model.id || id}`);
  console.log(`→ Context: ${model.limit?.context}`);
  if (Array.isArray(model.modalities?.input)) {
    console.log(`→ Input: ${model.modalities.input.join(", ")}`);
  }
  if (Array.isArray(model.modalities?.output)) {
    console.log(`→ Output: ${model.modalities.output.join(", ")}`);
  }
  console.groupEnd();
}

console.groupEnd();
