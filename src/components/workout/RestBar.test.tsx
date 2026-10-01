import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import RestBar from "./RestBar";
import {
  announceCountdown,
  announceTenSecondsLeft,
  playRestEndAlarm,
  stopSpeaking,
} from "@/lib/audio";

// El descanso flotante del modo individual (F2.2). El store y el audio se
// simulan para probar lo que decide el componente: qué muestra, qué avisa en
// cada tramo del reloj y qué ejecuta al pulsar sus controles.

const mocks = vi.hoisted(() => ({
  state: { current: null as Record<string, unknown> | null },
  skipRest: vi.fn(),
  adjustRest: vi.fn(),
  tickRest: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useAppStore: () => mocks.state.current,
}));

vi.mock("@/lib/audio", () => ({
  announceCountdown: vi.fn(),
  announceHalfRest: vi.fn(),
  announceStart: vi.fn(),
  announceTenSecondsLeft: vi.fn(),
  announceThirtySecondsLeft: vi.fn(),
  playRestEndAlarm: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({
  haptics: { restStart: vi.fn(), tick: vi.fn() },
}));

const ROUTINE = {
  exercises: [
    { id: "ex-1", name: "Press de Banca", sets: 3, reps: "10", restSeconds: 75 },
    { id: "ex-2", name: "Aperturas", sets: 3, reps: "12", restSeconds: 60 },
  ],
};

function setState({
  set = 2,
  timeLeft = 75,
  resting = true,
  audioEnabled = true,
  exerciseIndex = 0,
} = {}) {
  mocks.state.current = {
    activeWorkout: {
      routine: ROUTINE,
      currentExerciseIndex: exerciseIndex,
      currentSet: set,
      isResting: resting,
      restTimeRemaining: timeLeft,
    },
    tickRest: mocks.tickRest,
    adjustRest: mocks.adjustRest,
    skipRest: mocks.skipRest,
    audioEnabled,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState();
});

describe("RestBar — descanso flotante (F2.2)", () => {
  it("sin descanso activo no dibuja nada", () => {
    setState({ resting: false, timeLeft: 0 });
    render(<RestBar />);

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("muestra el reloj y el contexto de la serie que viene", () => {
    setState({ set: 2, timeLeft: 75 });
    render(<RestBar />);

    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("Descanso")).toBeInTheDocument();
    expect(screen.getByText("1:15")).toBeInTheDocument();
    expect(screen.getByText(/serie 2 de 3/)).toBeInTheDocument();
  });

  it("entre ejercicios dice cuál viene a continuación", () => {
    setState({ set: 1, timeLeft: 75 });
    render(<RestBar />);

    expect(screen.getByText("A continuación: Press de Banca")).toBeInTheDocument();
  });

  it("+15 s y -15 s ajustan el descanso", () => {
    render(<RestBar />);

    fireEvent.click(screen.getByText("+15 s"));
    fireEvent.click(screen.getByText("-15 s"));

    expect(mocks.adjustRest).toHaveBeenNthCalledWith(1, 15);
    expect(mocks.adjustRest).toHaveBeenNthCalledWith(2, -15);
  });

  it("Saltar cierra el descanso y corta la voz en curso", () => {
    render(<RestBar />);

    fireEvent.click(screen.getByText("Saltar"));

    expect(stopSpeaking).toHaveBeenCalled();
    expect(mocks.skipRest).toHaveBeenCalled();
  });

  it("avisa en el último tramo y en la cuenta final", () => {
    setState({ set: 2, timeLeft: 11 });
    const { rerender } = render(<RestBar />);

    setState({ set: 2, timeLeft: 10 });
    act(() => rerender(<RestBar />));

    setState({ set: 2, timeLeft: 3 });
    act(() => rerender(<RestBar />));

    expect(announceTenSecondsLeft).toHaveBeenCalledTimes(1);
    expect(announceCountdown).toHaveBeenCalled();
    expect(announceCountdown).toHaveBeenCalledWith(3);
  });

  it("al cumplirse el tiempo suena el aviso de fin de descanso", () => {
    setState({ set: 2, timeLeft: 1 });
    const { rerender } = render(<RestBar />);

    // El último tick apaga el descanso en el store: el componente lo detecta.
    setState({ set: 2, timeLeft: 0, resting: false });
    act(() => rerender(<RestBar />));

    expect(playRestEndAlarm).toHaveBeenCalledTimes(1);
  });

  it("sin audio no suena nada al terminar el descanso", () => {
    setState({ set: 2, timeLeft: 1, audioEnabled: false });
    const { rerender } = render(<RestBar />);

    setState({ set: 2, timeLeft: 0, resting: false, audioEnabled: false });
    act(() => rerender(<RestBar />));

    expect(playRestEndAlarm).not.toHaveBeenCalled();
  });

  it("los tres controles son zonas táctiles de 48 px como mínimo", () => {
    render(<RestBar />);

    for (const etiqueta of ["-15 s", "+15 s", "Saltar"]) {
      const boton = screen.getByText(etiqueta).closest("button");
      expect(boton?.className, `zona táctil de ${etiqueta}`).toContain("min-h-[48px]");
    }
  });
});
