import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NOTES_PREVIEW } from "@/lib/changelog";
import { useAppStore } from "@/lib/store";
import type { ActiveWorkoutState } from "@/lib/types";
import { AVISO_TRAS_ENTRENO_MS } from "@/lib/update-gate";
import UpdateChecker, { UpdateNotes } from "./UpdateChecker";

// El aviso de actualización (F1.3) y su nueva espera durante el entreno (F9.1):
// con una sesión en marcha el diálogo no salta; aparece al terminar o abandonar
// el entreno, y una comprobación manual responde al momento.

const mocks = vi.hoisted(() => ({
  checkOtaUpdate: vi.fn(),
}));

vi.mock("@/lib/ota-sync", () => ({
  APP_VERSION: { version: "8.5.58", versionCode: 8020071 },
  checkOtaUpdate: mocks.checkOtaUpdate,
  openApkDownload: vi.fn(),
}));

vi.mock("@/lib/app-updater", () => ({
  canInstallUnknownApps: vi.fn(async () => true),
  requestInstallPermission: vi.fn(async () => {}),
  startInAppUpdate: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/changelog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/changelog")>();
  return {
    ...actual,
    fetchChangelog: vi.fn(async () => ({ entries: [], stale: false })),
  };
});

const SIN_ENTRENO: ActiveWorkoutState = {
  routine: null,
  mode: "individual",
  currentExerciseIndex: 0,
  currentSet: 1,
  currentRound: 1,
  equipmentPref: "dumbbells",
  isResting: false,
  restTimeRemaining: 0,
  isPreparing: false,
  prepTimeRemaining: 0,
  isWorking: false,
  workTimeRemaining: 0,
  session: null,
  exerciseWeights: {},
  exerciseReps: {},
  justFinished: false,
};

const ENTRENO: ActiveWorkoutState = {
  ...SIN_ENTRENO,
  routine: {
    day: 1,
    title: "Día 1: Empuje",
    exercises: [],
  } as unknown as ActiveWorkoutState["routine"],
  session: { completed: false } as unknown as ActiveWorkoutState["session"],
};

const ACTUALIZACION = {
  hasUpdate: true,
  latestVersion: "9.0.0",
  downloadUrl: "https://github.com/servixam-max/titanium-app/releases/download/v9.0.0/FORTIXAM-9.0.0.apk",
  serverUrl: "GitHub Cloud (Global)",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAppStore.setState({ activeWorkout: SIN_ENTRENO });
  mocks.checkOtaUpdate.mockResolvedValue(ACTUALIZACION);
});

afterEach(() => {
  // Se limpia con el componente aún montado (el cleanup de Testing Library va
  // después): sin act(), React avisa de una actualización fuera de contexto.
  act(() => {
    useAppStore.setState({ activeWorkout: SIN_ENTRENO });
  });
  vi.useRealTimers();
});

/** Deja pasar los 3 s del chequeo automático y las promesas que encadena. */
async function pasarChequeoAutomatico() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  await asentar();
}

/** Vacía la cola de promesas (consulta, permiso y notas) dentro de act(). */
async function asentar() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

describe("UpdateChecker — el aviso no interrumpe un entreno (F9.1)", () => {
  it("con un entreno en marcha no sale el diálogo", async () => {
    vi.useFakeTimers();
    useAppStore.setState({ activeWorkout: ENTRENO });

    render(<UpdateChecker />);
    await pasarChequeoAutomatico();

    expect(screen.queryByText("Actualización Lista")).not.toBeInTheDocument();
    // Ni siquiera tras esperar de más: el entreno sigue en marcha.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.queryByText("Actualización Lista")).not.toBeInTheDocument();
  });

  it("al abandonar el entreno sale el aviso, con un respiro para el resumen", async () => {
    vi.useFakeTimers();
    useAppStore.setState({ activeWorkout: ENTRENO });

    render(<UpdateChecker />);
    await pasarChequeoAutomatico();
    expect(screen.queryByText("Actualización Lista")).not.toBeInTheDocument();

    // El entreno se abandona: la rutina desaparece del store.
    await act(async () => {
      useAppStore.setState({ activeWorkout: SIN_ENTRENO });
    });
    expect(screen.queryByText("Actualización Lista")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AVISO_TRAS_ENTRENO_MS);
    });
    expect(screen.getByText("Actualización Lista")).toBeInTheDocument();
    expect(screen.getByText(/Nueva versión/)).toHaveTextContent("v9.0.0");
  });

  it("al terminar el entreno también sale, sin volver a preguntar a GitHub", async () => {
    vi.useFakeTimers();
    useAppStore.setState({ activeWorkout: ENTRENO });

    render(<UpdateChecker />);
    await pasarChequeoAutomatico();

    await act(async () => {
      useAppStore.setState({
        activeWorkout: {
          ...ENTRENO,
          justFinished: true,
          session: { completed: true } as unknown as ActiveWorkoutState["session"],
        },
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AVISO_TRAS_ENTRENO_MS);
    });

    expect(screen.getByText("Actualización Lista")).toBeInTheDocument();
    expect(mocks.checkOtaUpdate).toHaveBeenCalledTimes(1);
  });

  it("la comprobación manual responde al momento aunque haya entreno", async () => {
    vi.useFakeTimers();
    useAppStore.setState({ activeWorkout: ENTRENO });

    render(<UpdateChecker />);

    await act(async () => {
      window.dispatchEvent(new Event("force-update-check"));
    });
    await asentar();

    expect(screen.getByText("Actualización Lista")).toBeInTheDocument();
  });

  it("sin entreno el aviso sale solo, como siempre", async () => {
    vi.useFakeTimers();

    render(<UpdateChecker />);
    expect(screen.queryByText("Actualización Lista")).not.toBeInTheDocument();

    await pasarChequeoAutomatico();
    expect(screen.getByText("Actualización Lista")).toBeInTheDocument();
  });
});

describe("UpdateNotes — resumen de la versión antes de descargar (F1.3)", () => {
  it("dice qué trae la nueva versión con sus cambios", () => {
    render(
      <UpdateNotes
        version="8.5.24"
        notes={["Novedades en la app", "Descansos a 75 s"]}
      />,
    );

    expect(screen.getByText("Qué trae la v8.5.24")).toBeInTheDocument();
    expect(screen.getByText("Novedades en la app")).toBeInTheDocument();
    expect(screen.getByText("Descansos a 75 s")).toBeInTheDocument();
  });

  it("avisa de que está buscando mientras llegan las notas", () => {
    render(<UpdateNotes version="8.5.24" notes={null} />);

    expect(screen.getByText("Buscando las novedades...")).toBeInTheDocument();
  });

  it("usa un texto corto si la release aún no trae cambios", () => {
    render(<UpdateNotes version="8.5.24" notes={[]} />);

    expect(
      screen.getByText("Mejoras y correcciones de mantenimiento."),
    ).toBeInTheDocument();
  });

  it("no alarga el diálogo: recorta a los primeros cambios y ofrece el resto", () => {
    const notes = Array.from(
      { length: NOTES_PREVIEW + 3 },
      (_, i) => `Cambio ${i + 1}`,
    );
    render(<UpdateNotes version="8.5.24" notes={notes} />);

    expect(screen.getByText(`Cambio ${NOTES_PREVIEW}`)).toBeInTheDocument();
    expect(screen.queryByText(`Cambio ${NOTES_PREVIEW + 1}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Ver los 3 cambios restantes"));
    expect(screen.getByText(`Cambio ${NOTES_PREVIEW + 1}`)).toBeInTheDocument();
  });

  it("con pocos cambios no ofrece desplegar nada", () => {
    render(<UpdateNotes version="8.5.24" notes={["Uno", "Dos"]} />);

    expect(screen.queryByText(/cambios restantes/)).not.toBeInTheDocument();
    expect(screen.getByText("Uno")).toBeInTheDocument();
    expect(screen.getByText("Dos")).toBeInTheDocument();
  });
});
