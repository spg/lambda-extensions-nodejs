export function handler(event: any) {
  const { logs } = JSON.parse(event.body);
  for (const log of logs) {
    if (log.type === "function") {
      console.log(`receiver got message:`, log.record);
    }
  }

  return {
    statusCode: 200,
  };
}
