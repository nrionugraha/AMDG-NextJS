export function isUserRejectedError(error: unknown): boolean {
    if (typeof error === "object" && error !== null && "code" in error) {
      const err = error as { code: number; message: string };
      return err.code === 4001 || err.message.includes("user rejected transaction");
    }
    return false;
  }