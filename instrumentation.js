export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { refreshReservationAvailability } = await import(
    "./lib/availability.js"
  );

  async function refreshAndSchedule() {
    let retryInMs = 5 * 60 * 1000;

    try {
      await refreshReservationAvailability();
      const now = new Date();
      const nextDay = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          5
        )
      );
      retryInMs = nextDay.getTime() - now.getTime();
    } catch (error) {
      console.error("Falha ao atualizar a disponibilidade de reservas.", error);
    }

    setTimeout(refreshAndSchedule, retryInMs);
  }

  setTimeout(refreshAndSchedule, 0);
}
