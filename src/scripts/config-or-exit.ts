export function configOrExit<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    console.error(
      `✗ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
