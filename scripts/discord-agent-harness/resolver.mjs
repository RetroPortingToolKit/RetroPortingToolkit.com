export async function resolve(specifier, context, next) {
  if (specifier === "discord.js") {
    return { url: new URL("./stub-discord.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
