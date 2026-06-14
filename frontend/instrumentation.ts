export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prewarmCache } = await import("./lib/prewarm")
    await prewarmCache()
  }
}
