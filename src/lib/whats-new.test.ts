import { describe, it, expect, beforeEach } from "vitest";
import {
  LAST_SEEN_KEY,
  compareVersions,
  getLastSeenVersion,
  hasAppHistory,
  hasUnseenNews,
  initWhatsNewTracking,
  markCurrentVersionSeen,
  normalizeVersion,
  setLastSeenVersion,
  shouldShowWhatsNew,
} from "./whats-new";

beforeEach(() => {
  localStorage.clear();
});

describe("Novedades tras actualizar — versiones", () => {
  it("normaliza la versión quitando la 'v'", () => {
    expect(normalizeVersion("v8.5.17")).toBe("8.5.17");
    expect(normalizeVersion(" 8.5.17 ")).toBe("8.5.17");
    expect(normalizeVersion(null)).toBe("");
  });

  it("compara por número, no como texto (8.5.10 va después de 8.5.9)", () => {
    expect(compareVersions("8.5.10", "8.5.9")).toBe(1);
    expect(compareVersions("8.5.9", "8.5.10")).toBe(-1);
    expect(compareVersions("8.5.17", "v8.5.17")).toBe(0);
    expect(compareVersions("9.0.0", "8.99.99")).toBe(1);
  });

  it("guarda y lee la última versión vista", () => {
    expect(getLastSeenVersion()).toBeNull();
    setLastSeenVersion("v8.5.17");
    expect(getLastSeenVersion()).toBe("8.5.17");
    expect(localStorage.getItem(LAST_SEEN_KEY)).toBe("8.5.17");
  });

  it("detecta que la app ya se usó antes en el dispositivo", () => {
    expect(hasAppHistory()).toBe(false);
    localStorage.setItem("titanium-storage", "{}");
    // El almacén del estado se escribe solo al arrancar: no es señal de uso
    expect(hasAppHistory()).toBe(false);
    localStorage.setItem("fortixam_active_user_id", "xam-seed-id");
    expect(hasAppHistory()).toBe(true);
  });
});

describe("Novedades tras actualizar — aviso (badge)", () => {
  it("no avisa en un dispositivo recién estrenado", () => {
    expect(hasUnseenNews("8.5.17")).toBe(false);
  });

  it("avisa a quien ya usaba la app (antes de existir este aviso)", () => {
    localStorage.setItem("fortixam_active_user_id", "xam-seed-id");
    expect(hasUnseenNews("8.5.17")).toBe(true);
  });

  it("avisa cuando la instalada es más nueva que la última leída", () => {
    setLastSeenVersion("8.5.16");
    expect(hasUnseenNews("8.5.17")).toBe(true);
  });

  it("no avisa si ya se leyeron las de esta versión", () => {
    setLastSeenVersion("8.5.17");
    expect(hasUnseenNews("8.5.17")).toBe(false);
  });

  it("no avisa al volver a una versión más antigua", () => {
    setLastSeenVersion("8.5.20");
    expect(hasUnseenNews("8.5.17")).toBe(false);
  });

  it("marcar como vista actualiza el apunte y avisa a la interfaz", () => {
    let seen = 0;
    const onSeen = () => {
      seen += 1;
    };
    window.addEventListener("fortixam-whats-new-seen", onSeen);
    markCurrentVersionSeen("8.5.18");
    window.removeEventListener("fortixam-whats-new-seen", onSeen);
    expect(getLastSeenVersion()).toBe("8.5.18");
    expect(seen).toBe(1);
  });
});

describe("Novedades tras actualizar — pantalla de bienvenida", () => {
  it("no interrumpe en una instalación nueva (y apunta la versión)", () => {
    initWhatsNewTracking("8.5.17");
    expect(getLastSeenVersion()).toBe("8.5.17");
    expect(shouldShowWhatsNew("8.5.17")).toBe(false);
  });

  it("se muestra a quien ya usaba la app antes de este aviso", () => {
    localStorage.setItem("fortixam_active_user_id", "xam-seed-id");
    initWhatsNewTracking("8.5.17");
    // Con uso previo no se apunta nada: las novedades se enseñan una vez
    expect(getLastSeenVersion()).toBeNull();
    expect(shouldShowWhatsNew("8.5.17")).toBe(true);
  });

  it("se muestra tras actualizar a una versión nueva", () => {
    setLastSeenVersion("8.5.16");
    expect(shouldShowWhatsNew("8.5.17")).toBe(true);
  });

  it("no se repite si ya se leyó", () => {
    setLastSeenVersion("8.5.17");
    expect(shouldShowWhatsNew("8.5.17")).toBe(false);
  });

  it("no vuelve a apuntar nada si ya había un apunte", () => {
    setLastSeenVersion("8.5.16");
    initWhatsNewTracking("8.5.17");
    expect(getLastSeenVersion()).toBe("8.5.16");
  });

  it("al volver a un APK viejo no muestra nada y re-apunta la versión", () => {
    setLastSeenVersion("8.5.20");
    expect(shouldShowWhatsNew("8.5.17")).toBe(false);
    expect(getLastSeenVersion()).toBe("8.5.17");
  });
});
