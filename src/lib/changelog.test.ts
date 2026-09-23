import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  parseReleaseNotes,
  parseCommits,
  formatReleaseDate,
  isInstalledVersion,
  mapReleases,
  fetchChangelog,
  getCachedChangelog,
} from "./changelog";

describe("Changelog — parseReleaseNotes", () => {
  it("convierte viñetas de markdown en cambios limpios", () => {
    const body = [
      "**Novedades de esta versión**",
      "",
      "- Changelog dentro de la app en Ajustes → Novedades",
      "- Los descansos respetan los 75 s prescritos",
      "",
      "**Full Changelog**: https://github.com/servixam-max/titanium-app/compare/v8.5.12...v8.5.13",
    ].join("\n");

    expect(parseReleaseNotes(body)).toEqual([
      "Novedades de esta versión",
      "Changelog dentro de la app en Ajustes → Novedades",
      "Los descansos respetan los 75 s prescritos",
    ]);
  });

  it("descarta el enlace automático de GitHub cuando es lo único que hay", () => {
    const body =
      "**Full Changelog**: https://github.com/servixam-max/titanium-app/compare/v8.5.12...v8.5.13";
    expect(parseReleaseNotes(body)).toEqual([]);
  });

  it("quita los enlaces y los autores que añade GitHub", () => {
    const body =
      "- Changelog en la app ([#42](https://github.com/servixam-max/titanium-app/pull/42)) by @servixam-max in https://github.com/servixam-max/titanium-app/pull/42";
    expect(parseReleaseNotes(body)).toEqual(["Changelog en la app (#42)"]);
  });

  it("ignora encabezados, tablas, reglas y comentarios", () => {
    const body = [
      "## Qué cambió",
      "| col | col |",
      "| --- | --- |",
      "---",
      "<!-- hidden -->",
      "- Mejora real",
    ].join("\n");
    expect(parseReleaseNotes(body)).toEqual(["Mejora real"]);
  });

  it("recorta el exceso de cambios para no romper la tarjeta", () => {
    const body = Array.from({ length: 20 }, (_, i) => `- Cambio ${i + 1}`).join("\n");
    const notes = parseReleaseNotes(body);
    expect(notes).toHaveLength(8);
    expect(notes[0]).toBe("Cambio 1");
  });

  it("devuelve lista vacía con cuerpos vacíos o nulos", () => {
    expect(parseReleaseNotes("")).toEqual([]);
    expect(parseReleaseNotes(null)).toEqual([]);
    expect(parseReleaseNotes(undefined)).toEqual([]);
    expect(parseReleaseNotes("   \n  \n")).toEqual([]);
  });
});

describe("Changelog — fechas y versión instalada", () => {
  it("formatea la fecha en español abreviado", () => {
    expect(formatReleaseDate("2026-09-22T18:23:56Z")).toBe("22 sept 2026");
    expect(formatReleaseDate("2026-01-05T00:00:00Z")).toBe("5 ene 2026");
  });

  it("devuelve cadena vacía con fechas inválidas", () => {
    expect(formatReleaseDate("no-es-fecha")).toBe("");
    expect(formatReleaseDate(null)).toBe("");
  });

  it("detecta la versión instalada aunque lleve 'v'", () => {
    expect(isInstalledVersion("8.5.14", "8.5.14")).toBe(true);
    expect(isInstalledVersion("v8.5.14", "8.5.14")).toBe(true);
    expect(isInstalledVersion("8.5.13", "8.5.14")).toBe(false);
    expect(isInstalledVersion(null, "8.5.14")).toBe(false);
  });
});

describe("Changelog — parseCommits (respaldo sin notas)", () => {
  it("usa los mensajes de commit como cambios legibles", () => {
    const commits = [
      { commit: { message: "feat(ui): novedades dentro de la app\n\nDetalle" } },
      { commit: { message: "fix(entreno): descansos a 75 s" } },
    ];
    expect(parseCommits(commits)).toEqual([
      "feat(ui): novedades dentro de la app",
      "fix(entreno): descansos a 75 s",
    ]);
  });

  it("descarta los commits de release y los merge", () => {
    const commits = [
      { commit: { message: "chore(release): v8.5.14 — versionCode 8020027" } },
      { commit: { message: "Merge pull request #3 from algo" } },
      { commit: { message: "feat(stats): heatmap de constancia" } },
    ];
    expect(parseCommits(commits)).toEqual(["feat(stats): heatmap de constancia"]);
  });

  it("tolera entradas vacías o mal formadas", () => {
    expect(parseCommits(null)).toEqual([]);
    expect(parseCommits([null, {}, { commit: null }, { commit: {} }])).toEqual([]);
  });
});

describe("Changelog — mapReleases", () => {
  it("normaliza la respuesta de la API de GitHub", () => {
    const entries = mapReleases([
      {
        tag_name: "v8.5.14",
        name: "FORTIXAM v8.5.14",
        published_at: "2026-09-23T10:00:00Z",
        html_url: "https://github.com/servixam-max/titanium-app/releases/tag/v8.5.14",
        body: "- Novedades en la app",
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe("8.5.14");
    expect(entries[0].notes).toEqual(["Novedades en la app"]);
    expect(entries[0].url).toContain("/releases/tag/v8.5.14");
  });

  it("descarta borradores y pre-releases", () => {
    const entries = mapReleases([
      { tag_name: "v9.0.0", draft: true, published_at: "2026-09-23T10:00:00Z" },
      { tag_name: "v9.0.1", prerelease: true, published_at: "2026-09-23T10:00:00Z" },
      { tag_name: "v8.5.14", published_at: "2026-09-23T10:00:00Z" },
    ]);
    expect(entries.map((e) => e.version)).toEqual(["8.5.14"]);
  });

  it("ordena de la versión más nueva a la más antigua", () => {
    const entries = mapReleases([
      { tag_name: "v8.5.12", published_at: "2026-09-22T16:00:00Z" },
      { tag_name: "v8.5.14", published_at: "2026-09-24T10:00:00Z" },
      { tag_name: "v8.5.13", published_at: "2026-09-23T10:00:00Z" },
    ]);
    expect(entries.map((e) => e.version)).toEqual(["8.5.14", "8.5.13", "8.5.12"]);
  });

  it("tolera respuestas que no son listas", () => {
    expect(mapReleases(null)).toEqual([]);
    expect(mapReleases({ message: "Not Found" })).toEqual([]);
  });
});

describe("Changelog — fetchChangelog con caché", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda en caché y la reutiliza sin volver a pedir a GitHub", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { tag_name: "v8.5.14", published_at: "2026-09-23T10:00:00Z", body: "- Novedades" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchChangelog();
    expect(first.cached).toBe(false);
    expect(first.entries).toHaveLength(1);

    const second = await fetchChangelog();
    expect(second.cached).toBe(true);
    expect(second.entries[0].version).toBe("8.5.14");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("con force vuelve a consultar aunque haya caché fresca", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { tag_name: "v8.5.14", published_at: "2026-09-23T10:00:00Z", body: "- Novedades" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchChangelog();
    await fetchChangelog({ force: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cae a la caché anterior si GitHub no responde", async () => {
    const ok = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { tag_name: "v8.5.14", published_at: "2026-09-23T10:00:00Z", body: "- Novedades" },
      ],
    });
    vi.stubGlobal("fetch", ok);
    await fetchChangelog();
    expect(getCachedChangelog()).not.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    const offline = await fetchChangelog({ force: true });
    expect(offline.cached).toBe(true);
    expect(offline.entries[0].version).toBe("8.5.14");
  });

  it("lanza error si falla y no hay nada guardado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    await expect(fetchChangelog()).rejects.toThrow("sin red");
  });

  it("rellena con los commits las versiones sin notas propias", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("/compare/")) {
        return {
          ok: true,
          json: async () => ({
            commits: [
              { commit: { message: "feat(ui): novedades en la app" } },
              { commit: { message: "chore(release): v8.5.14" } },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => [
          {
            tag_name: "v8.5.14",
            published_at: "2026-09-23T10:00:00Z",
            body: "**Full Changelog**: https://github.com/x/y/compare/v8.5.13...v8.5.14",
          },
          {
            tag_name: "v8.5.13",
            published_at: "2026-09-22T10:00:00Z",
            body: "**Full Changelog**: https://github.com/x/y/compare/v8.5.12...v8.5.13",
          },
        ],
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { entries } = await fetchChangelog({ force: true });
    expect(entries[0].version).toBe("8.5.14");
    expect(entries[0].notes).toEqual(["feat(ui): novedades en la app"]);
    expect(entries[1].notes).toEqual(["feat(ui): novedades en la app"]);
    // Una consulta de compare por versión sin notas (2), no más
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("no rompe si la comparación de commits falla", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("/compare/")) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => [
          { tag_name: "v8.5.14", published_at: "2026-09-23T10:00:00Z", body: "" },
        ],
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { entries } = await fetchChangelog({ force: true });
    expect(entries).toHaveLength(1);
    expect(entries[0].notes).toEqual([]);
  });
});
